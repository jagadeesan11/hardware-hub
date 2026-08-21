import { Router } from 'express';
import { createOrder, getMyOrder, listMyOrders } from '../controllers/order.controller.js';
import { createOrderSchema } from '../schemas/order.schema.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.use(requireAuth);

router.post('/', validate(createOrderSchema), asyncHandler(createOrder));
router.get('/', asyncHandler(listMyOrders));
router.get('/:id', asyncHandler(getMyOrder));

export default router;
