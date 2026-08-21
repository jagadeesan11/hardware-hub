import { Router } from 'express';
import {
  adminGetProduct,
  adminListProducts,
  createProduct,
  deleteProduct,
  updateProduct,
} from '../controllers/admin.product.controller.js';
import { listAllOrders } from '../controllers/order.controller.js';
import {
  adminListCategories,
  createCategory,
  deleteCategory,
  updateCategory,
} from '../controllers/admin.category.controller.js';
import {
  getAdminStats,
  updateOrderStatus,
  updateProductStock,
} from '../controllers/admin.order.controller.js';
import { createProductSchema, updateProductSchema } from '../schemas/product.schema.js';
import { updateOrderStatusSchema, updateStockSchema } from '../schemas/admin.schema.js';
import { createCategorySchema, updateCategorySchema } from '../schemas/category.schema.js';
import { validate } from '../middleware/validate.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// Applied at the router level so a future route cannot be added unprotected.
router.use(requireAuth, requireAdmin);

router.get('/stats', asyncHandler(getAdminStats));

router.get('/products', asyncHandler(adminListProducts));
router.get('/products/:id', asyncHandler(adminGetProduct));
router.post('/products', validate(createProductSchema), asyncHandler(createProduct));
router.put('/products/:id', validate(updateProductSchema), asyncHandler(updateProduct));
router.patch('/products/:id/stock', validate(updateStockSchema), asyncHandler(updateProductStock));
router.delete('/products/:id', asyncHandler(deleteProduct));

router.get('/categories', asyncHandler(adminListCategories));
router.post('/categories', validate(createCategorySchema), asyncHandler(createCategory));
router.put('/categories/:id', validate(updateCategorySchema), asyncHandler(updateCategory));
router.delete('/categories/:id', asyncHandler(deleteCategory));

router.get('/orders', asyncHandler(listAllOrders));
router.patch('/orders/:id/status', validate(updateOrderStatusSchema), asyncHandler(updateOrderStatus));

export default router;
