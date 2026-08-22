import { z } from 'zod';
import { Role } from '@prisma/client';
import { identifierSchema } from './auth.schema.js';

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  identifier: identifierSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  role: z.nativeEnum(Role).default(Role.SHOP_OWNER),
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

/**
 * Both fields resubmitted together, not a partial patch: the identifier is a
 * single email-or-phone value everywhere else in the app (register, create
 * user), so editing replaces it wholesale rather than merging into whichever
 * field happened to be set before.
 */
export const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  identifier: identifierSchema,
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
