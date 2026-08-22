import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../lib/ApiError.js';
import { hashPassword } from '../lib/password.js';
import { whereForIdentifier } from '../lib/userIdentifier.js';
import type {
  CreateUserInput,
  ResetPasswordInput,
  UpdateUserInput,
  UpdateUserRoleInput,
} from '../schemas/admin.user.schema.js';

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
} as const;

/** App-owner only — see requireAppOwner. Every non-customer account is visible here. */
export const adminListUsers = async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: userSelect,
  });
  res.json({ users });
};

/**
 * How a shop owner account actually gets made: the app owner sets a name,
 * an email or phone, a starting password, and a role — directly, no email
 * verification step, because this app has no outbound mail set up. Handing
 * someone their login on day one is the realistic version of this for a
 * small shop's staff.
 */
export const adminCreateUser = async (req: Request, res: Response) => {
  const { name, identifier, password, role } = req.body as CreateUserInput;

  const existing = await prisma.user.findFirst({
    where: whereForIdentifier(identifier),
    select: { id: true },
  });
  if (existing) {
    throw ApiError.conflict(
      identifier.kind === 'email'
        ? 'An account with this email already exists'
        : 'An account with this phone number already exists',
    );
  }

  const user = await prisma.user.create({
    data: {
      name,
      email: identifier.kind === 'email' ? identifier.value : null,
      phone: identifier.kind === 'phone' ? identifier.value : null,
      passwordHash: await hashPassword(password),
      role,
    },
    select: userSelect,
  });

  res.status(201).json({ user });
};

/**
 * Promotes or demotes an existing account — the other half of "how do I get
 * a shop owner": either create fresh above, or hand an existing customer
 * account elevated access here.
 */
export const adminUpdateUserRole = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { role } = req.body as UpdateUserRoleInput;

  if (req.user && req.user.sub === id && role !== 'ADMIN') {
    throw ApiError.conflict('You cannot remove your own app owner access');
  }

  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('User not found');

  const user = await prisma.user.update({ where: { id }, data: { role }, select: userSelect });

  res.json({ user });
};

/** Edits name and identifier. Replaces the identifier wholesale — see the schema comment. */
export const adminUpdateUser = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, identifier } = req.body as UpdateUserInput;

  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('User not found');

  const clash = await prisma.user.findFirst({
    where: { ...whereForIdentifier(identifier), NOT: { id } },
    select: { id: true },
  });
  if (clash) {
    throw ApiError.conflict(
      identifier.kind === 'email'
        ? 'Another account already uses this email'
        : 'Another account already uses this phone number',
    );
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      name,
      email: identifier.kind === 'email' ? identifier.value : null,
      phone: identifier.kind === 'phone' ? identifier.value : null,
    },
    select: userSelect,
  });

  res.json({ user });
};

/** Sets a new password directly — this app has no outbound mail, so there is no reset-link flow. */
export const adminResetPassword = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { password } = req.body as ResetPasswordInput;

  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('User not found');

  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });

  res.json({ ok: true });
};

/**
 * Blocks deletion rather than letting the database's FK Restrict on
 * Order.user surface as a raw constraint error — same pattern as deleting a
 * category that still has products. The user's cart is not a similar
 * concern: it cascade-deletes automatically.
 */
export const adminDeleteUser = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (req.user && req.user.sub === id) {
    throw ApiError.conflict('You cannot delete your own account');
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { name: true, _count: { select: { orders: true } } },
  });
  if (!existing) throw ApiError.notFound('User not found');

  if (existing._count.orders > 0) {
    throw ApiError.conflict(
      `Cannot delete "${existing.name}" — ${existing._count.orders} order(s) reference this account.`,
    );
  }

  await prisma.user.delete({ where: { id } });

  res.json({ ok: true });
};
