import { Router } from 'express';
import {
  createPaymentOrder,
  markPaymentFailed,
  verifyPayment,
} from '../controllers/payment.controller.js';
import { createPaymentOrderSchema, verifyPaymentSchema } from '../schemas/order.schema.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.use(requireAuth);

router.post('/create-order', validate(createPaymentOrderSchema), asyncHandler(createPaymentOrder));
router.post('/verify', validate(verifyPaymentSchema), asyncHandler(verifyPayment));
router.post('/failed/:id', asyncHandler(markPaymentFailed));

export default router;
