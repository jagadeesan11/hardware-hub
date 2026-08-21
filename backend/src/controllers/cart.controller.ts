import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../lib/ApiError.js';
import { decimalToNumber } from '../lib/serialize.js';
import type { AddCartItemInput, UpdateCartItemInput } from '../schemas/cart.schema.js';

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          stockQty: true,
          sku: true,
          size: true,
          material: true,
          images: true,
          isActive: true,
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

/**
 * Totals are computed from live product prices, never stored on the cart. A
 * price change must be reflected the next time the customer looks; the price
 * is only frozen at checkout, into OrderItem.priceAtPurchase.
 */
const serializeCart = (cart: CartWithItems) => {
  const items = cart.items.map((item) => {
    const price = decimalToNumber(item.product.price);
    // Clamp so a cart held over a stock drop cannot check out more than exists.
    const availableQty = Math.min(item.quantity, item.product.stockQty);

    return {
      id: item.id,
      quantity: item.quantity,
      product: { ...item.product, price },
      lineTotal: Number((price * item.quantity).toFixed(2)),
      // Flags the storefront renders as warnings rather than silently fixing.
      issues: {
        unavailable: !item.product.isActive,
        insufficientStock: item.quantity > item.product.stockQty,
        availableQty,
      },
    };
  });

  const purchasable = items.filter((i) => !i.issues.unavailable);
  const subtotal = purchasable.reduce((sum, i) => sum + i.lineTotal, 0);

  return {
    id: cart.id,
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: Number(subtotal.toFixed(2)),
    hasIssues: items.some((i) => i.issues.unavailable || i.issues.insufficientStock),
  };
};

/** One cart per user, created lazily on first access. */
const getOrCreateCart = async (userId: string): Promise<CartWithItems> => {
  const existing = await prisma.cart.findUnique({ where: { userId }, include: cartInclude });
  if (existing) return existing;

  return prisma.cart.create({ data: { userId }, include: cartInclude });
};

const requireUserId = (req: Request): string => {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.sub;
};

export const getCart = async (req: Request, res: Response) => {
  const cart = await getOrCreateCart(requireUserId(req));
  res.json({ cart: serializeCart(cart) });
};

export const addCartItem = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { productId, quantity } = req.body as AddCartItemInput;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true, stockQty: true, name: true },
  });

  if (!product || !product.isActive) throw ApiError.notFound('Product not found');
  if (product.stockQty <= 0) throw ApiError.conflict(`${product.name} is out of stock`);

  const cart = await getOrCreateCart(userId);
  const existingItem = cart.items.find((item) => item.product.id === productId);

  // Adding an item already in the cart increases its quantity rather than
  // creating a second row — enforced by @@unique([cartId, productId]).
  const desiredQty = (existingItem?.quantity ?? 0) + quantity;

  if (desiredQty > product.stockQty) {
    throw ApiError.conflict(
      `Only ${product.stockQty} of ${product.name} available` +
        (existingItem ? ` (${existingItem.quantity} already in your cart)` : ''),
    );
  }

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    update: { quantity: desiredQty },
    create: { cartId: cart.id, productId, quantity },
  });

  const updated = await getOrCreateCart(userId);
  res.status(201).json({ cart: serializeCart(updated) });
};

export const updateCartItem = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const itemId = req.params.id as string;
  const { quantity } = req.body as UpdateCartItemInput;

  // Load through the cart's userId so one customer cannot touch another's
  // items by guessing an id. This ownership check is the whole ballgame.
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    include: { product: { select: { name: true, stockQty: true, isActive: true } } },
  });

  if (!item) throw ApiError.notFound('Cart item not found');

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    if (!item.product.isActive) throw ApiError.conflict(`${item.product.name} is no longer sold`);
    if (quantity > item.product.stockQty) {
      throw ApiError.conflict(`Only ${item.product.stockQty} of ${item.product.name} available`);
    }
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  const updated = await getOrCreateCart(userId);
  res.json({ cart: serializeCart(updated) });
};

export const removeCartItem = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const itemId = req.params.id as string;

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    select: { id: true },
  });

  if (!item) throw ApiError.notFound('Cart item not found');

  await prisma.cartItem.delete({ where: { id: itemId } });

  const updated = await getOrCreateCart(userId);
  res.json({ cart: serializeCart(updated) });
};

export const clearCart = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const cart = await getOrCreateCart(userId);

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  const updated = await getOrCreateCart(userId);
  res.json({ cart: serializeCart(updated) });
};
