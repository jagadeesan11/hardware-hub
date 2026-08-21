import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env, isPaymentsConfigured } from '../config/env.js';
import { ApiError } from './ApiError.js';

let client: Razorpay | null = null;

/** Throws a clear 503 rather than a confusing SDK error when keys are absent. */
export const getRazorpay = (): Razorpay => {
  if (!isPaymentsConfigured) {
    throw new ApiError(
      503,
      'Payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env.',
    );
  }

  client ??= new Razorpay({
    key_id: env.RAZORPAY_KEY_ID as string,
    key_secret: env.RAZORPAY_KEY_SECRET as string,
  });

  return client;
};

/**
 * Razorpay quotes amounts in paise, the smallest currency unit. Sending rupees
 * would undercharge by 100x, so the conversion lives in exactly one place.
 */
export const toPaise = (rupees: number): number => Math.round(rupees * 100);

export const fromPaise = (paise: number): number => paise / 100;

/**
 * Verifies the payment came from Razorpay and was not tampered with in the
 * browser. The signature is HMAC-SHA256 of "<order_id>|<payment_id>" keyed by
 * the secret, which only our server and Razorpay know.
 *
 * Compared with timingSafeEqual: a plain === leaks how much of the signature
 * matched, which is enough to forge one byte at a time.
 */
export const isValidPaymentSignature = (params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): boolean => {
  if (!isPaymentsConfigured) return false;

  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET as string)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest('hex');

  const provided = params.signature;

  // timingSafeEqual throws on length mismatch, so guard first.
  if (expected.length !== provided.length) return false;

  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(provided, 'utf8'));
};
