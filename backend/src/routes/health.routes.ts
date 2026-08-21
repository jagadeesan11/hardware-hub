import { Router } from 'express';
import { getDbHealth, getHealth } from '../controllers/health.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', getHealth);
router.get('/db', asyncHandler(getDbHealth));

export default router;
