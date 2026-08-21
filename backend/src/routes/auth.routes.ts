import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, me, register } from '../controllers/auth.controller.js';
import { loginSchema, registerSchema } from '../schemas/auth.schema.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { env } from '../config/env.js';

/**
 * Credential endpoints are the obvious brute-force target, so they get a
 * tighter budget than the rest of the API. Disabled in dev to keep testing
 * from tripping it.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'development',
  message: { error: { message: 'Too many attempts. Try again in 15 minutes.' } },
});

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(register));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(login));
router.get('/me', requireAuth, asyncHandler(me));

export default router;
