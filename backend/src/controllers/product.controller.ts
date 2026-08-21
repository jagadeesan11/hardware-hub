import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../lib/ApiError.js';
import { decimalToNumber } from '../lib/serialize.js';
import { getQuery } from '../middleware/validate.js';
import type { ProductListQuery } from '../schemas/product.schema.js';

const productSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  stockQty: true,
  sku: true,
  size: true,
  material: true,
  images: true,
  isActive: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductSelect;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

const toPublicProduct = (product: ProductRow) => ({
  ...product,
  price: decimalToNumber(product.price),
  inStock: product.stockQty > 0,
});

const ORDER_BY: Record<ProductListQuery['sort'], Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
  name_asc: { name: 'asc' },
};

export const listProducts = async (req: Request, res: Response) => {
  const { category, search, minPrice, maxPrice, page, limit, sort, inStock } =
    getQuery<ProductListQuery>(req);

  const where: Prisma.ProductWhereInput = { isActive: true };

  if (category) {
    // A parent slug should return everything beneath it — filtering "Doors"
    // must include "Wooden Doors", not come back empty.
    const matched = await prisma.category.findUnique({
      where: { slug: category },
      select: { id: true, children: { select: { id: true } } },
    });
    if (!matched) throw ApiError.notFound(`Category not found: ${category}`);
    where.categoryId = { in: [matched.id, ...matched.children.map((c) => c.id)] };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { material: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {
      ...(minPrice !== undefined ? { gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
    };
  }

  if (inStock) where.stockQty = { gt: 0 };

  // Count and page in one round trip so the two cannot disagree.
  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: productSelect,
      orderBy: ORDER_BY[sort],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  res.json({
    products: products.map(toPublicProduct),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  });
};

export const getProductBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;

  const product = await prisma.product.findUnique({ where: { slug }, select: productSelect });

  // Inactive products are hidden from the storefront entirely, so a delisted
  // item reads as 404 rather than exposing that it once existed.
  if (!product || !product.isActive) throw ApiError.notFound('Product not found');

  res.json({ product: toPublicProduct(product) });
};
