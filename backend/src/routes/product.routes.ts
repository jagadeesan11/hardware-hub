import { Router } from 'express';
import { getProductBySlug, listProducts } from '../controllers/product.controller.js';
import { productListQuerySchema } from '../schemas/product.schema.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', validate(productListQuerySchema, 'query'), asyncHandler(listProducts));
router.get('/:slug', asyncHandler(getProductBySlug));

export default router;
