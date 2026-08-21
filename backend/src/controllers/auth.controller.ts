import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../lib/ApiError.js';
import { fakeVerify, hashPassword, verifyPassword } from '../lib/password.js';
import { signToken } from '../lib/jwt.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';

/** Never let passwordHash reach a response body. */
const toPublicUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  createdAt: user.createdAt,
});

export const register = async (req: Request, res: Response) => {
  const { name, email, password, phone } = req.body as RegisterInput;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const user = await prisma.user.create({
    data: { name, email, phone: phone ?? null, passwordHash: await hashPassword(password) },
  });

  res.status(201).json({
    user: toPublicUser(user),
    token: signToken({ sub: user.id, email: user.email, role: user.role }),
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { email } });

  // Same message and similar timing for both failure modes, so the endpoint
  // cannot be used to enumerate which emails have accounts.
  if (!user) {
    await fakeVerify();
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  res.json({
    user: toPublicUser(user),
    token: signToken({ sub: user.id, email: user.email, role: user.role }),
  });
};

export const me = async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();

  // Read through to the database rather than trusting the token body: the role
  // may have changed, or the account may have been deleted since it was issued.
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) throw ApiError.unauthorized('Account no longer exists');

  res.json({ user: toPublicUser(user) });
};
