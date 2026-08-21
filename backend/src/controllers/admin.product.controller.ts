import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../lib/ApiError.js';
import { decimalToNumber } from '../lib/serialize.js';
import { slugify } from '../lib/slug.js';
import type { CreateProductInput, UpdateProductInput } from '../schemas/product.schema.js';

const categorySelect = { select: { id: true, name: true, slug: true } };

const serialize = <T extends { price: Prisma.Decimal }>(product: T) => ({
  ...product,
  price: decimalToNumber(product.price),
});

/** Appends -2, -3 and so on until the slug is free, so duplicate names do not 409. */
const uniqueSlug = async (base: string, excludeId?: string): Promise<string> => {
  const root = slugify(base) || 'product';
  let candidate = root;

  for (let suffix = 2; ; suffix++) {
    const clash = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!clash || clash.id === excludeId) return candidate;
    candidate = `${root}-${suffix}`;
  }
};

/** Admins see inactive products too, which is the point of the admin view. */
export const adminListProducts = async (_req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: { category: categorySelect },
  });
  res.json({ products: products.map(serialize) });
};

/** Single product for the admin edit form — includes inactive ones. */
export const adminGetProduct = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: categorySelect },
  });
  if (!product) throw ApiError.notFound('Product not found');

  res.json({ product: serialize(product) });
};

export const createProduct = async (req: Request, res: Response) => {
  const input = req.body as CreateProductInput;

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });
  if (!category) throw ApiError.badRequest(`Category not found: ${input.categoryId}`);

  const existingSku = await prisma.product.findUnique({
    where: { sku: input.sku },
    select: { id: true },
  });
  if (existingSku) throw ApiError.conflict(`SKU already in use: ${input.sku}`);

  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug: await uniqueSlug(input.slug ?? input.name),
      categoryId: input.categoryId,
      description: input.description ?? null,
      price: new Prisma.Decimal(input.price),
      stockQty: input.stockQty,
      sku: input.sku,
      size: input.size ?? null,
      material: input.material ?? null,
      images: input.images,
      isActive: input.isActive,
    },
    include: { category: categorySelect },
  });

  res.status(201).json({ product: serialize(product) });
};

export const updateProduct = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const input = req.body as UpdateProductInput;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Product not found');

  if (input.categoryId && input.categoryId !== existing.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    if (!category) throw ApiError.badRequest(`Category not found: ${input.categoryId}`);
  }

  if (input.sku && input.sku !== existing.sku) {
    const clash = await prisma.product.findUnique({
      where: { sku: input.sku },
      select: { id: true },
    });
    if (clash) throw ApiError.conflict(`SKU already in use: ${input.sku}`);
  }

  // Renaming does not move the slug: existing links and any SEO built on the
  // old URL would break. Callers wanting a new URL pass slug explicitly.
  const slug = input.slug ? await uniqueSlug(input.slug, id) : undefined;

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.price !== undefined ? { price: new Prisma.Decimal(input.price) } : {}),
      ...(input.stockQty !== undefined ? { stockQty: input.stockQty } : {}),
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.size !== undefined ? { size: input.size } : {}),
      ...(input.material !== undefined ? { material: input.material } : {}),
      ...(input.images !== undefined ? { images: input.images } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: { category: categorySelect },
  });

  res.json({ product: serialize(product) });
};

/**
 * Soft delete. A hard delete would either orphan order history or be blocked
 * outright by the OrderItem foreign key, and "what did this customer buy in
 * March" must keep working after a product is delisted.
 */
export const deleteProduct = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Product not found');

  const product = await prisma.product.update({
    where: { id },
    data: { isActive: false },
    include: { category: categorySelect },
  });

  res.json({
    product: serialize(product),
    message: 'Product delisted. Order history referencing it is preserved.',
  });
};
