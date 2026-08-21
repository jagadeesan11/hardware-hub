import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Role } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};

export const signToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions);

/** Returns null rather than throwing — callers decide whether absence is fatal. */
export const verifyToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'string') return null;
    return decoded as JwtPayload;
  } catch {
    return null;
  }
};
