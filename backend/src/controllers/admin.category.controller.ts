import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../lib/ApiError.js';
import { slugify } from '../lib/slug.js';
import type { CreateCategoryInput, UpdateCategoryInput } from '../schemas/category.schema.js';

/** Appends -2, -3 and so on until the slug is free, mirroring the product admin. */
const uniqueSlug = async (base: string, excludeId?: string): Promise<string> => {
  const root = slugify(base) || 'category';
  let candidate = root;

  for (let suffix = 2; ; suffix++) {
    const clash = await prisma.category.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!clash || clash.id === excludeId) return candidate;
    candidate = `${root}-${suffix}`;
  }
};

/** Flat list with parent name attached — the admin table needs this, the storefront tree does not. */
export const adminListCategories = async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true, children: true } },
    },
  });

  res.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId,
      parentName: c.parent?.name ?? null,
      productCount: c._count.products,
      childCount: c._count.children,
    })),
  });
};

export const createCategory = async (req: Request, res: Response) => {
  const input = req.body as CreateCategoryInput;

  if (input.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: input.parentId },
      select: { id: true, parentId: true },
    });
    if (!parent) throw ApiError.badRequest(`Parent category not found: ${input.parentId}`);
    // Two levels only — Doors -> Wooden Doors, not Doors -> Wooden -> Oak. A
    // third level would need the storefront tree and filter query rewritten.
    if (parent.parentId) {
      throw ApiError.badRequest('Categories only nest one level deep — pick a top-level parent');
    }
  }

  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug: await uniqueSlug(input.slug ?? input.name),
      parentId: input.parentId,
    },
  });

  res.status(201).json({ category });
};

export const updateCategory = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const input = req.body as UpdateCategoryInput;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Category not found');

  if (input.parentId !== undefined && input.parentId !== null) {
    if (input.parentId === id) throw ApiError.badRequest('A category cannot be its own parent');

    const parent = await prisma.category.findUnique({
      where: { id: input.parentId },
      select: { id: true, parentId: true },
    });
    if (!parent) throw ApiError.badRequest(`Parent category not found: ${input.parentId}`);
    if (parent.parentId) {
      throw ApiError.badRequest('Categories only nest one level deep — pick a top-level parent');
    }

    // Moving a category under one of its own children would create a cycle
    // the tree query can't render (and the storefront would loop forever).
    const hasChildren = await prisma.category.count({ where: { parentId: id } });
    if (hasChildren > 0) {
      throw ApiError.conflict('Cannot make a category with subcategories into a child itself');
    }
  }

  const slug = input.slug ? await uniqueSlug(input.slug, id) : undefined;

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    },
  });

  res.json({ category });
};

/**
 * Blocks deletion rather than relying on the database's default behavior:
 * products would hit the FK Restrict (an ugly 500), and child categories would
 * silently become root categories via the parent relation's SetNull. Both are
 * surprises worth stopping at the API instead.
 */
export const deleteCategory = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true, children: true } } },
  });
  if (!category) throw ApiError.notFound('Category not found');

  if (category._count.products > 0) {
    throw ApiError.conflict(
      `Cannot delete "${category.name}" — ${category._count.products} product(s) still use it. Move or delist them first.`,
    );
  }

  if (category._count.children > 0) {
    throw ApiError.conflict(
      `Cannot delete "${category.name}" — it has ${category._count.children} subcategor${category._count.children === 1 ? 'y' : 'ies'}. Delete those first.`,
    );
  }

  await prisma.category.delete({ where: { id } });

  res.json({ ok: true });
};
