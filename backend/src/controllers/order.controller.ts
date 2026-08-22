import type { Request, Response } from 'express';
import { Prisma, type OrderStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../lib/ApiError.js';
import { decimalToNumber } from '../lib/serialize.js';
import type { CreateOrderInput } from '../schemas/order.schema.js';

const orderInclude = {
  items: {
    include: {
      product: { select: { id: true, name: true, slug: true, images: true, sku: true } },
    },
  },
  payments: {
    orderBy: { createdAt: 'desc' },
    select: { id: true, razorpayPaymentId: true, status: true, amount: true, createdAt: true },
  },
  statusEvents: {
    orderBy: { createdAt: 'asc' },
    select: { status: true, note: true, createdAt: true },
  },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

const serializeOrder = (order: OrderRow) => ({
  id: order.id,
  // Raw number — the frontend formats it via the same convention as prices,
  // through a shared formatOrderNumber() rather than a pre-baked string.
  orderNumber: order.orderNumber,
  status: order.status,
  paymentStatus: order.paymentStatus,
  totalAmount: decimalToNumber(order.totalAmount),
  shippingAddress: order.shippingAddress,
  razorpayOrderId: order.razorpayOrderId,
  trackingNumber: order.trackingNumber,
  carrier: order.carrier,
  createdAt: order.createdAt,
  items: order.items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    priceAtPurchase: decimalToNumber(item.priceAtPurchase),
    lineTotal: Number((decimalToNumber(item.priceAtPurchase) * item.quantity).toFixed(2)),
    product: item.product,
  })),
  payments: order.payments.map((p) => ({ ...p, amount: decimalToNumber(p.amount) })),
  // Ascending, so the tracker renders as a chronological timeline.
  statusHistory: order.statusEvents,
});

const requireUserId = (req: Request): string => {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.sub;
};

/**
 * Builds a PENDING order from the cart.
 *
 * Stock is deliberately NOT decremented here. An order that is never paid for
 * must not hold inventory hostage; the decrement happens once, atomically, in
 * the payment-verify step.
 */
export const createOrder = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { shippingAddress } = req.body as CreateOrderInput;

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.items.length === 0) throw ApiError.badRequest('Your cart is empty');

  const unavailable = cart.items.filter((item) => !item.product.isActive);
  if (unavailable.length > 0) {
    throw ApiError.conflict(
      `No longer available: ${unavailable.map((i) => i.product.name).join(', ')}`,
    );
  }

  // A courtesy check so the customer is not sent to a payment page for stock
  // that has already gone. The authoritative check is the atomic decrement.
  const short = cart.items.filter((item) => item.quantity > item.product.stockQty);
  if (short.length > 0) {
    throw ApiError.conflict(
      short
        .map((i) => `${i.product.name}: only ${i.product.stockQty} left (you asked for ${i.quantity})`)
        .join('; '),
    );
  }

  const totalAmount = cart.items.reduce(
    (sum, item) => sum.add(item.product.price.mul(item.quantity)),
    new Prisma.Decimal(0),
  );

  const order = await prisma.order.create({
    data: {
      userId,
      totalAmount,
      shippingAddress: shippingAddress as unknown as Prisma.InputJsonValue,
      items: {
        create: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          // Snapshot: a later price change must not alter what was agreed.
          priceAtPurchase: item.product.price,
        })),
      },
      // First entry in the tracking timeline. Every later transition adds one
      // more, in the same transaction as the status change that caused it.
      statusEvents: {
        create: { status: 'PENDING', note: 'Order placed' },
      },
    },
    include: orderInclude,
  });

  res.status(201).json({ order: serializeOrder(order) });
};

export const listMyOrders = async (req: Request, res: Response) => {
  const userId = requireUserId(req);

  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: orderInclude,
  });

  res.json({ orders: orders.map(serializeOrder) });
};

export const getMyOrder = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const id = req.params.id as string;

  // Scoped by userId so an order id from someone else 404s.
  const order = await prisma.order.findFirst({ where: { id, userId }, include: orderInclude });
  if (!order) throw ApiError.notFound('Order not found');

  res.json({ order: serializeOrder(order) });
};

/** Admin view of every order, newest first. */
export const listAllOrders = async (req: Request, res: Response) => {
  const status = req.query.status as OrderStatus | undefined;

  const orders = await prisma.order.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      ...orderInclude,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  res.json({
    orders: orders.map((order) => ({
      ...serializeOrder(order),
      user: order.user,
    })),
  });
};
