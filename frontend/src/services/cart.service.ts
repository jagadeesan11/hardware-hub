import { apiFetch } from './api';
import type { Cart } from '../types/cart';

// Every endpoint returns the whole cart, so the client never has to
// reconstruct totals or guess at server-side clamping.
export const getCart = () => apiFetch<{ cart: Cart }>('/cart').then((r) => r.cart);

export const addItem = (productId: string, quantity = 1) =>
  apiFetch<{ cart: Cart }>('/cart/items', {
    method: 'POST',
    body: { productId, quantity },
  }).then((r) => r.cart);

export const updateItem = (itemId: string, quantity: number) =>
  apiFetch<{ cart: Cart }>(`/cart/items/${itemId}`, {
    method: 'PUT',
    body: { quantity },
  }).then((r) => r.cart);

export const removeItem = (itemId: string) =>
  apiFetch<{ cart: Cart }>(`/cart/items/${itemId}`, { method: 'DELETE' }).then((r) => r.cart);

export const clearCart = () =>
  apiFetch<{ cart: Cart }>('/cart', { method: 'DELETE' }).then((r) => r.cart);
