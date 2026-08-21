import { z } from 'zod';

export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  line1: z.string().trim().min(4, 'Address is too short').max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  landmark: z.string().trim().max(120).optional(),
});

export const createOrderSchema = z.object({
  shippingAddress: shippingAddressSchema,
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
});

export const createPaymentOrderSchema = z.object({
  orderId: z.string().trim().min(1, 'orderId is required'),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>;
