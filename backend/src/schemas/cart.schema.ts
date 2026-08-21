import { z } from 'zod';

/** Guards against a fat-fingered quantity emptying the warehouse in one request. */
const MAX_PER_ITEM = 99;

export const addCartItemSchema = z.object({
  productId: z.string().trim().min(1, 'productId is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(MAX_PER_ITEM).default(1),
});

export const updateCartItemSchema = z.object({
  // 0 is allowed and removes the row: the quantity stepper hitting zero should
  // mean "remove", not fail validation.
  quantity: z.number().int().min(0, 'Quantity cannot be negative').max(MAX_PER_ITEM),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
