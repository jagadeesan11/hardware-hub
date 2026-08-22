import { z } from 'zod';

/**
 * Standard 15-character GSTIN: 2-digit state code, 10-char PAN, 1-digit entity
 * number, fixed 'Z', 1-char checksum. Optional field — not every seller is
 * GST-registered — but validated when present so a typo doesn't reach an invoice.
 */
const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const updateSettingsSchema = z.object({
  shopName: z.string().trim().min(2, 'Shop name must be at least 2 characters').max(120),
  gstNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(gstinPattern, 'Enter a valid 15-character GSTIN')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  addressLine1: z.string().trim().min(4, 'Address is too short').max(160),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  district: z.string().trim().max(60).optional().or(z.literal('').transform(() => undefined)),
  landmark: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
