import { apiFetch } from './api';
import type { Order, OrderStatus } from '../types/order';
import type { Product } from '../types/catalog';

export type AdminOrder = Order & {
  user: { id: string; name: string; email: string; phone: string | null };
};

export type AdminStats = {
  ordersByStatus: Record<string, number>;
  totalOrders: number;
  revenue: number;
  lowStockCount: number;
  activeProducts: number;
  customers: number;
};

export const getStats = () =>
  apiFetch<{ stats: AdminStats }>('/admin/stats').then((r) => r.stats);

export const getOrders = (status?: OrderStatus) =>
  apiFetch<{ orders: AdminOrder[] }>(`/admin/orders${status ? `?status=${status}` : ''}`).then(
    (r) => r.orders,
  );

export const updateOrderStatus = (
  id: string,
  status: OrderStatus,
  shipment?: { trackingNumber?: string; carrier?: string },
) =>
  apiFetch<{
    order: {
      id: string;
      status: OrderStatus;
      trackingNumber: string | null;
      carrier: string | null;
    };
    restocked: boolean;
  }>(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status, ...shipment } });

export const getProducts = () =>
  apiFetch<{ products: Product[] }>('/admin/products').then((r) => r.products);

export const getProduct = (id: string) =>
  apiFetch<{ product: Product }>(`/admin/products/${id}`).then((r) => r.product);

/** Matches the backend create schema; `slug` is derived from `name` when omitted. */
export type ProductInput = {
  name: string;
  categoryId: string;
  description?: string;
  price: number;
  stockQty: number;
  sku: string;
  size?: string;
  material?: string;
  images: string[];
  isActive: boolean;
  slug?: string;
};

export const createProduct = (input: ProductInput) =>
  apiFetch<{ product: Product }>('/admin/products', { method: 'POST', body: input }).then(
    (r) => r.product,
  );

export const updateProduct = (id: string, input: Partial<ProductInput>) =>
  apiFetch<{ product: Product }>(`/admin/products/${id}`, { method: 'PUT', body: input }).then(
    (r) => r.product,
  );

/** Soft delete — the product is delisted, order history keeps working. */
export const delistProduct = (id: string) =>
  apiFetch<{ product: Product; message: string }>(`/admin/products/${id}`, { method: 'DELETE' });

export const relistProduct = (id: string) => updateProduct(id, { isActive: true });

export const updateStock = (id: string, stockQty: number) =>
  apiFetch<{ product: { id: string; name: string; sku: string; stockQty: number } }>(
    `/admin/products/${id}/stock`,
    { method: 'PATCH', body: { stockQty } },
  ).then((r) => r.product);

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parentName: string | null;
  productCount: number;
  childCount: number;
};

export const getCategories = () =>
  apiFetch<{ categories: AdminCategory[] }>('/admin/categories').then((r) => r.categories);

export const createCategory = (input: { name: string; parentId: string | null }) =>
  apiFetch<{ category: AdminCategory }>('/admin/categories', {
    method: 'POST',
    body: input,
  }).then((r) => r.category);

export const updateCategory = (
  id: string,
  input: Partial<{ name: string; parentId: string | null }>,
) =>
  apiFetch<{ category: AdminCategory }>(`/admin/categories/${id}`, {
    method: 'PUT',
    body: input,
  }).then((r) => r.category);

export const deleteCategory = (id: string) =>
  apiFetch<{ ok: boolean }>(`/admin/categories/${id}`, { method: 'DELETE' });
