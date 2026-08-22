import { z } from 'zod';

/**
 * One box, two possible shapes. Detected by content: anything with an "@" is
 * validated as an email; a bare 10-digit number is validated as an Indian
 * mobile number. Shared by register, login, and admin-created accounts so
 * the detection rule can't drift between them.
 */
export const identifierSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email or phone number')
  .transform((value, ctx) => {
    if (value.includes('@')) {
      const email = value.toLowerCase();
      if (!z.string().email().safeParse(email).success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid email address' });
        return z.NEVER;
      }
      return { kind: 'email' as const, value: email };
    }

    if (/^[6-9]\d{9}$/.test(value)) {
      return { kind: 'phone' as const, value };
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Enter a valid email address or a 10-digit mobile number',
    });
    return z.NEVER;
  });

export type Identifier = z.infer<typeof identifierSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  identifier: identifierSchema,
  // 8 is the floor; the upper bound exists because bcrypt silently truncates
  // input past 72 bytes, which would make longer passwords misleading.
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  // `role` is deliberately absent: accepting it would let anyone self-promote
  // to admin at signup. Roles change only via the admin users panel.
});

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
