import { Router } from 'express';
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from '../controllers/cart.controller.js';
import { addCartItemSchema, updateCartItemSchema } from '../schemas/cart.schema.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// A cart belongs to a user, so every route here needs an identity.
router.use(requireAuth);

router.get('/', asyncHandler(getCart));
router.post('/items', validate(addCartItemSchema), asyncHandler(addCartItem));
router.put('/items/:id', validate(updateCartItemSchema), asyncHandler(updateCartItem));
router.delete('/items/:id', asyncHandler(removeCartItem));
router.delete('/', asyncHandler(clearCart));

export default router;
