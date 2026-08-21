import 'dotenv/config';
import { z } from 'zod';

/**
 * Validate environment at boot so a missing DATABASE_URL fails loudly here
 * rather than as a confusing Prisma error on the first request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // A short secret is brute-forceable offline once a token leaks, so refuse to boot on one.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // 10 rounds is the practical floor; Render's free tier gets slow past 12.
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // Optional on purpose: the whole catalogue and cart must still boot and run
  // without payment keys. The payment routes report 503 when these are absent
  // rather than the server refusing to start.
  RAZORPAY_KEY_ID: z.string().trim().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().trim().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\nCopy backend/.env.example to backend/.env and fill in the values.\n');
  process.exit(1);
}

export const env = parsed.data;

/** Comma-separated list, so prod can allow the Vercel domain alongside localhost. */
/** Payment routes check this before touching Razorpay. */
export const isPaymentsConfigured = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

export const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
