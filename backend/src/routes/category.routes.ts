import { Router } from 'express';
import { listCategories } from '../controllers/category.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(listCategories));

export default router;
