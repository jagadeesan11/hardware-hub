import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import adminRoutes from './admin.routes.js';
import cartRoutes from './cart.routes.js';
import orderRoutes from './order.routes.js';
import paymentRoutes from './payment.routes.js';
import settingsRoutes from './settings.routes.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    name: 'Hardware Hub API',
    version: '1.0.0',
    endpoints: {
      health: ['GET /api/health', 'GET /api/health/db'],
      auth: ['POST /api/auth/register', 'POST /api/auth/login', 'GET /api/auth/me'],
      catalog: ['GET /api/categories', 'GET /api/products', 'GET /api/products/:slug'],
      settings: ['GET /api/settings'],
      cart: [
        'GET /api/cart',
        'POST /api/cart/items',
        'PUT /api/cart/items/:id',
        'DELETE /api/cart/items/:id',
        'DELETE /api/cart',
      ],
      orders: ['POST /api/orders', 'GET /api/orders', 'GET /api/orders/:id'],
      payment: [
        'POST /api/payment/create-order',
        'POST /api/payment/verify',
        'POST /api/payment/failed/:id',
      ],
      admin: [
        'GET /api/admin/categories',
        'POST /api/admin/categories',
        'PUT /api/admin/categories/:id',
        'DELETE /api/admin/categories/:id',
        'GET /api/admin/stats',
        'GET /api/admin/products',
        'POST /api/admin/products',
        'PUT /api/admin/products/:id',
        'PATCH /api/admin/products/:id/stock',
        'DELETE /api/admin/products/:id',
        'GET /api/admin/orders',
        'PATCH /api/admin/orders/:id/status',
        'PUT /api/admin/settings',
        'GET /api/admin/users',
        'POST /api/admin/users',
        'PUT /api/admin/users/:id',
        'PATCH /api/admin/users/:id/role',
        'POST /api/admin/users/:id/reset-password',
        'DELETE /api/admin/users/:id',
      ],
    },
  });
});

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/settings', settingsRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/payment', paymentRoutes);
router.use('/admin', adminRoutes);



export default router;
