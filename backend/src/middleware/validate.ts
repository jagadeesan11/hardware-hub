import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

type Source = 'body' | 'query' | 'params';

/**
 * Parses and REPLACES the request segment with Zod's output, so downstream
 * handlers get coerced types (numbers, defaults) rather than raw strings.
 */
export const validate =
  (schema: ZodTypeAny, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);

    if (source === 'query') {
      // Express 5 makes req.query a getter-only property; assigning throws.
      Object.defineProperty(req, 'validatedQuery', { value: result.data, configurable: true });
    } else {
      req[source] = result.data;
    }
    next();
  };

/** Typed accessor for what `validate(schema, 'query')` stored. */
export const getQuery = <T>(req: Request): T =>
  (req as Request & { validatedQuery: T }).validatedQuery;
