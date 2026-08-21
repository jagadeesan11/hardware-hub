import { z } from 'zod';

const positiveMoney = z
  .number()
  .nonnegative('Price cannot be negative')
  .max(9_999_999.99, 'Price exceeds the maximum supported value')
  // The column is Decimal(10,2); more precision than that would be silently lost.
  // Checked on the decimal string, because `n * 100` is not exact in binary
  // floating point (10.99 * 100 === 1098.9999999999998).
  .refine((n) => {
    const text = n.toString();
    if (text.includes('e') || text.includes('E')) return false;
    const decimals = text.split('.')[1];
    return decimals === undefined || decimals.length <= 2;
  }, 'Price supports at most 2 decimal places');

export const productListQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  page: z.coerce.number().int().min(1).default(1),
  // Capped so a client cannot request the whole catalogue in one page.
  limit: z.coerce.number().int().min(1).max(60).default(12),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc']).default('newest'),
  inStock: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})
  .refine(
    (q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice,
    { message: 'minPrice cannot be greater than maxPrice', path: ['minPrice'] },
  );

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(160),
  categoryId: z.string().trim().min(1, 'categoryId is required'),
  description: z.string().trim().max(4000).optional(),
  price: positiveMoney,
  stockQty: z.number().int().min(0).default(0),
  sku: z.string().trim().min(1).max(64).toUpperCase(),
  size: z.string().trim().max(80).optional(),
  material: z.string().trim().max(80).optional(),
  images: z.array(z.string().url('Each image must be a valid URL')).max(8).default([]),
  isActive: z.boolean().default(true),
  // Optional: derived from `name` when omitted.
  slug: z.string().trim().max(80).optional(),
});

/** Every field optional, but at least one required — a no-op PUT is a client bug. */
export const updateProductSchema = createProductSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
