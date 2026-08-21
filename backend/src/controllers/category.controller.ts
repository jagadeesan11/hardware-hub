import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  productCount: number;
  children: CategoryNode[];
};

/**
 * Returns the category tree in one query. The nav needs parents with their
 * children nested; assembling that in memory beats a query per level.
 */
export const listCategories = async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });

  const byId = new Map<string, CategoryNode>(
    categories.map((c) => [
      c.id,
      {
        id: c.id,
        name: c.name,
        slug: c.slug,
        parentId: c.parentId,
        productCount: c._count.products,
        children: [],
      },
    ]),
  );

  const roots: CategoryNode[] = [];
  for (const category of categories) {
    const node = byId.get(category.id);
    if (!node) continue;
    const parent = category.parentId ? byId.get(category.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  // Roll child counts up into the parent. Products live on leaf categories, so
  // without this every top-level category reports 0 while filtering by that
  // same category returns results — the count must match what the filter does.
  const rollUp = (node: CategoryNode): number => {
    node.productCount += node.children.reduce((sum, child) => sum + rollUp(child), 0);
    return node.productCount;
  };
  roots.forEach(rollUp);

  res.json({ categories: roots });
};
