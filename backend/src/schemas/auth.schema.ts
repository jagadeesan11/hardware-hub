import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  // 8 is the floor; the upper bound exists because bcrypt silently truncates
  // input past 72 bytes, which would make longer passwords misleading.
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
    .optional(),
  // `role` is deliberately absent: accepting it would let anyone self-promote
  // to admin at signup. Roles change only via the database or an admin tool.
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
