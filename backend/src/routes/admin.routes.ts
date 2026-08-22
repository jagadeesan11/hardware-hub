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
import { updateSettings } from '../controllers/settings.controller.js';
import {
  adminCreateUser,
  adminDeleteUser,
  adminListUsers,
  adminResetPassword,
  adminUpdateUser,
  adminUpdateUserRole,
} from '../controllers/admin.user.controller.js';
import { createProductSchema, updateProductSchema } from '../schemas/product.schema.js';
import { updateOrderStatusSchema, updateStockSchema } from '../schemas/admin.schema.js';
import { createCategorySchema, updateCategorySchema } from '../schemas/category.schema.js';
import { updateSettingsSchema } from '../schemas/settings.schema.js';
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserRoleSchema,
  updateUserSchema,
} from '../schemas/admin.user.schema.js';
import { validate } from '../middleware/validate.js';
import { requireAppOwner, requireAuth, requireShopStaff } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// Baseline for the whole dashboard: either admin tier gets in. Individual
// routes below add requireAppOwner where the action is app-owner-only.
router.use(requireAuth, requireShopStaff);

router.get('/stats', asyncHandler(getAdminStats));

// Products and orders are day-to-day operations — both tiers get full access.
router.get('/products', asyncHandler(adminListProducts));
router.get('/products/:id', asyncHandler(adminGetProduct));
router.post('/products', validate(createProductSchema), asyncHandler(createProduct));
router.put('/products/:id', validate(updateProductSchema), asyncHandler(updateProduct));
router.patch('/products/:id/stock', validate(updateStockSchema), asyncHandler(updateProductStock));
router.delete('/products/:id', asyncHandler(deleteProduct));

router.get('/orders', asyncHandler(listAllOrders));
router.patch('/orders/:id/status', validate(updateOrderStatusSchema), asyncHandler(updateOrderStatus));

// Categories are visible to both tiers (a shop owner needs the list when
// assigning a product to one), but only the app owner can restructure them —
// renaming or removing a category ripples across every product filed under it.
router.get('/categories', asyncHandler(adminListCategories));
router.post('/categories', requireAppOwner, validate(createCategorySchema), asyncHandler(createCategory));
router.put(
  '/categories/:id',
  requireAppOwner,
  validate(updateCategorySchema),
  asyncHandler(updateCategory),
);
router.delete('/categories/:id', requireAppOwner, asyncHandler(deleteCategory));

// Shop settings carry the legal/GST identity of the business — app-owner only.
router.put('/settings', requireAppOwner, validate(updateSettingsSchema), asyncHandler(updateSettings));

// User management is app-owner only, full stop — creating an account or
// changing a role is how someone gets (or loses) access to this dashboard.
router.get('/users', requireAppOwner, asyncHandler(adminListUsers));
router.post('/users', requireAppOwner, validate(createUserSchema), asyncHandler(adminCreateUser));
router.patch(
  '/users/:id/role',
  requireAppOwner,
  validate(updateUserRoleSchema),
  asyncHandler(adminUpdateUserRole),
);
router.put('/users/:id', requireAppOwner, validate(updateUserSchema), asyncHandler(adminUpdateUser));
router.post(
  '/users/:id/reset-password',
  requireAppOwner,
  validate(resetPasswordSchema),
  asyncHandler(adminResetPassword),
);
router.delete('/users/:id', requireAppOwner, asyncHandler(adminDeleteUser));

export default router;
