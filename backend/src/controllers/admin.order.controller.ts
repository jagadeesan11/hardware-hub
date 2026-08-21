import type { Request, Response } from 'express';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../lib/ApiError.js';
import { decimalToNumber } from '../lib/serialize.js';
import type { UpdateOrderStatusInput, UpdateStockInput } from '../schemas/admin.schema.js';

/**
 * Legal next states. Fulfilment only moves forward, and a delivered order is
 * terminal — without this an order could be walked back to SHIPPED after
 * delivery, or a cancelled order silently revived.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

/** Builds the timeline note so the customer's tracker reads like a sentence, not a status code. */
const eventNote = (
  status: OrderStatus,
  input: { trackingNumber?: string; carrier?: string },
  restocked: boolean,
): string | undefined => {
  if (status === OrderStatus.SHIPPED) {
    if (input.carrier && input.trackingNumber) return `Shipped via ${input.carrier} — ${input.trackingNumber}`;
    if (input.trackingNumber) return `Shipped — tracking ${input.trackingNumber}`;
    if (input.carrier) return `Shipped via ${input.carrier}`;
    return 'Order shipped';
  }
  if (status === OrderStatus.DELIVERED) return 'Delivered';
  if (status === OrderStatus.CANCELLED) return restocked ? 'Cancelled — stock returned to inventory' : 'Cancelled';
  return undefined;
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status, trackingNumber, carrier } = req.body as UpdateOrderStatusInput;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { select: { productId: true, quantity: true } } },
  });
  if (!order) throw ApiError.notFound('Order not found');

  const allowed = ALLOWED_TRANSITIONS[order.status];
  if (!allowed.includes(status)) {
    throw ApiError.conflict(
      `Cannot move an order from ${order.status} to ${status}` +
        (allowed.length ? `. Allowed: ${allowed.join(', ')}` : ' — this order is final.'),
    );
  }

  // Cancelling a paid order returns its units to the shelf, in the same
  // transaction as the status change so the two cannot diverge.
  const shouldRestock = status === OrderStatus.CANCELLED && order.paymentStatus === PaymentStatus.PAID;

  const updated = await prisma.$transaction(async (tx) => {
    if (shouldRestock) {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.quantity } },
        });
      }
    }

    const next = await tx.order.update({
      where: { id },
      data: {
        status,
        // Tracking info is only ever attached at the SHIPPED transition, and
        // is never sent for other statuses, so it never gets overwritten later.
        ...(status === OrderStatus.SHIPPED
          ? { trackingNumber: trackingNumber ?? null, carrier: carrier ?? null }
          : {}),
      },
    });

    await tx.orderStatusEvent.create({
      data: { orderId: id, status, note: eventNote(status, { trackingNumber, carrier }, shouldRestock) },
    });

    return next;
  });

  res.json({
    order: {
      id: updated.id,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
      totalAmount: decimalToNumber(updated.totalAmount),
      trackingNumber: updated.trackingNumber,
      carrier: updated.carrier,
    },
    restocked: shouldRestock,
  });
};

/** Focused stock edit, so the dashboard does not send a whole product payload. */
export const updateProductStock = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { stockQty } = req.body as UpdateStockInput;

  const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!product) throw ApiError.notFound('Product not found');

  const updated = await prisma.product.update({
    where: { id },
    data: { stockQty },
    select: { id: true, name: true, sku: true, stockQty: true, isActive: true },
  });

  res.json({ product: updated });
};

/** Headline numbers for the dashboard, counted in the database. */
export const getAdminStats = async (_req: Request, res: Response) => {
  const [orderCounts, revenue, lowStock, productCount, customerCount] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.aggregate({
      where: { paymentStatus: PaymentStatus.PAID, status: { not: OrderStatus.CANCELLED } },
      _sum: { totalAmount: true },
    }),
    prisma.product.count({ where: { isActive: true, stockQty: { lte: 10 } } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
  ]);

  const byStatus = Object.fromEntries(
    orderCounts.map((row) => [row.status, row._count._all]),
  ) as Record<string, number>;

  res.json({
    stats: {
      ordersByStatus: byStatus,
      totalOrders: orderCounts.reduce((sum, row) => sum + row._count._all, 0),
      // Cancelled orders are excluded: that money is owed back, not earned.
      revenue: revenue._sum.totalAmount ? decimalToNumber(revenue._sum.totalAmount) : 0,
      lowStockCount: lowStock,
      activeProducts: productCount,
      customers: customerCount,
    },
  });
};
