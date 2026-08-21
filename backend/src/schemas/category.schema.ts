import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  // Nullable, not optional: the client sends null explicitly for "no parent"
  // so a root category and "field omitted" are never confused.
  parentId: z.string().trim().min(1).nullable().default(null),
  slug: z.string().trim().max(80).optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    parentId: z.string().trim().min(1).nullable().optional(),
    slug: z.string().trim().max(80).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
