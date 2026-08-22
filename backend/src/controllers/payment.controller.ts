import type { Request, Response } from 'express';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../lib/ApiError.js';
import { decimalToNumber } from '../lib/serialize.js';
import { getRazorpay, isValidPaymentSignature, toPaise } from '../lib/razorpay.js';
import { formatOrderNumber } from '../lib/orderNumber.js';
import type { CreatePaymentOrderInput, VerifyPaymentInput } from '../schemas/order.schema.js';

const requireUserId = (req: Request): string => {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.sub;
};

/**
 * Registers our pending order with Razorpay and hands the browser what the
 * checkout widget needs. Only the public key id goes to the client; the secret
 * never leaves the server.
 */
export const createPaymentOrder = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { orderId } = req.body as CreatePaymentOrderInput;

  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw ApiError.notFound('Order not found');

  if (order.paymentStatus === PaymentStatus.PAID) {
    throw ApiError.conflict('This order has already been paid');
  }

  const razorpay = getRazorpay();
  const amountInPaise = toPaise(decimalToNumber(order.totalAmount));

  const razorpayOrder = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    // The human order number, not the cuid — this is what shows up in the
    // Razorpay dashboard, so it should read the same as everywhere else.
    receipt: formatOrderNumber(order.orderNumber),
    notes: { orderId: order.id, orderNumber: formatOrderNumber(order.orderNumber), userId },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { razorpayOrderId: razorpayOrder.id },
  });

  res.json({
    razorpayOrderId: razorpayOrder.id,
    amount: amountInPaise,
    currency: 'INR',
    keyId: env.RAZORPAY_KEY_ID,
    orderId: order.id,
    orderNumber: order.orderNumber,
  });
};

/**
 * Confirms payment and commits the sale.
 *
 * The signature check comes first: without it, anyone could POST a fake
 * success and receive goods for free. Only after that do we touch stock.
 */
export const verifyPayment = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const {
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: signature,
  } = req.body as VerifyPaymentInput;

  if (!isValidPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature })) {
    throw ApiError.badRequest('Payment signature verification failed');
  }

  const order = await prisma.order.findFirst({
    where: { razorpayOrderId, userId },
    include: { items: true },
  });
  if (!order) throw ApiError.notFound('Order not found');

  // Idempotent: Razorpay can deliver the same success twice, and the customer
  // can refresh the callback. Replaying must not decrement stock again.
  if (order.paymentStatus === PaymentStatus.PAID) {
    return res.json({
      order: { id: order.id, status: order.status, paymentStatus: order.paymentStatus },
      alreadyProcessed: true,
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        /**
         * The whole race condition hinges on this statement. The stock check
         * and the decrement are ONE conditional UPDATE:
         *
         *   UPDATE products SET stockQty = stockQty - n
         *   WHERE id = ... AND stockQty >= n
         *
         * Postgres locks the row and re-evaluates the condition against the
         * committed value, so of two buyers racing for the last unit exactly
         * one gets count = 1 and the other gets 0. Reading the stock and then
         * writing it would let both pass the check.
         */
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stockQty: { gte: item.quantity } },
          data: { stockQty: { decrement: item.quantity } },
        });

        if (updated.count !== 1) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { name: true, stockQty: true },
          });
          throw new ApiError(
            409,
            `${product?.name ?? 'An item'} sold out while you were paying ` +
              `(${product?.stockQty ?? 0} left, order needs ${item.quantity})`,
          );
        }
      }

      const paidOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID, paymentStatus: PaymentStatus.PAID },
      });

      await tx.orderStatusEvent.create({
        data: { orderId: order.id, status: OrderStatus.PAID, note: 'Payment confirmed' },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          razorpayPaymentId,
          status: PaymentStatus.PAID,
          amount: order.totalAmount,
        },
      });

      // The sale is committed, so the cart that produced it is spent.
      const cart = await tx.cart.findUnique({ where: { userId }, select: { id: true } });
      if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return paidOrder;
    });

    res.json({
      order: {
        id: result.id,
        status: result.status,
        paymentStatus: result.paymentStatus,
        totalAmount: decimalToNumber(result.totalAmount),
      },
      alreadyProcessed: false,
    });
  } catch (error) {
    /**
     * Money was taken but the goods cannot be delivered. The transaction rolled
     * back, so stock is untouched — but the payment is real. Record it against
     * a cancelled order so the refund is visible rather than silent.
     */
    if (error instanceof ApiError && error.statusCode === 409) {
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED, paymentStatus: PaymentStatus.PAID },
        }),
        prisma.orderStatusEvent.create({
          data: {
            orderId: order.id,
            status: OrderStatus.CANCELLED,
            note: 'Cancelled — item sold out during payment. Refund queued.',
          },
        }),
        prisma.payment.create({
          data: {
            orderId: order.id,
            razorpayPaymentId,
            status: PaymentStatus.PAID,
            amount: order.totalAmount,
          },
        }),
      ]);

      throw new ApiError(
        409,
        `${error.message}. Your payment was received and will be refunded.`,
        { refundRequired: true, orderId: order.id, razorpayPaymentId },
      );
    }

    throw error;
  }
};

/** Records an abandoned or failed attempt so the order does not look ignored. */
export const markPaymentFailed = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const orderId = req.params.id as string;

  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw ApiError.notFound('Order not found');

  if (order.paymentStatus === PaymentStatus.PAID) {
    throw ApiError.conflict('This order has already been paid');
  }

  await prisma.payment.create({
    data: {
      orderId: order.id,
      status: PaymentStatus.FAILED,
      amount: order.totalAmount as Prisma.Decimal,
    },
  });

  res.json({ ok: true });
};
