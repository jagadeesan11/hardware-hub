import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

/**
 * PAID is absent on purpose. Payment status is set only by a verified Razorpay
 * signature — letting an admin mark an order paid by hand would be a way to
 * ship goods with no money received.
 */
export const updateOrderStatusSchema = z.object({
  status: z.enum([OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED]),
  // Only meaningful when status is SHIPPED; the controller ignores them
  // otherwise rather than rejecting the request for sending extra fields.
  trackingNumber: z.string().trim().min(1).max(64).optional(),
  carrier: z.string().trim().min(1).max(60).optional(),
});

export const updateStockSchema = z.object({
  stockQty: z.number().int().min(0, 'Stock cannot be negative').max(1_000_000),
});

export const adminOrderQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
