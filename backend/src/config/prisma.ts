import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

/**
 * Reuse one client across hot reloads in dev — tsx watch re-executes this
 * module on every save, and a fresh PrismaClient each time exhausts the
 * database connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
