import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export const getHealth = (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
};

/** Round-trips a query so a green response really means the DB is reachable. */
export const getDbHealth = async (_req: Request, res: Response) => {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', latencyMs: Date.now() - startedAt });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'unreachable',
      message: error instanceof Error ? error.message : 'Unknown database error',
    });
  }
};
