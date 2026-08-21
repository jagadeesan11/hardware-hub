import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../lib/ApiError.js';
import { env } from '../config/env.js';

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: { message: err.message, details: err.details } });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      // Stack traces stay off in production so we don't leak internals to clients.
      ...(env.NODE_ENV === 'development' && err instanceof Error ? { stack: err.stack } : {}),
    },
  });
};
