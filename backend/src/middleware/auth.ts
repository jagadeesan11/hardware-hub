import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { verifyToken, type JwtPayload } from '../lib/jwt.js';
import { ApiError } from '../lib/ApiError.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const extractToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
};

/** Attaches req.user when a valid token is present; never rejects. */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.user = payload;
  }
  next();
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) return next(ApiError.unauthorized('Missing bearer token'));

  const payload = verifyToken(token);
  if (!payload) return next(ApiError.unauthorized('Invalid or expired token'));

  req.user = payload;
  next();
};

/**
 * Must run after requireAuth. The role is read from the signed token, not from
 * anything the client sends, so it cannot be spoofed.
 */
export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role !== Role.ADMIN) return next(ApiError.forbidden('Admin access required'));
  next();
};
