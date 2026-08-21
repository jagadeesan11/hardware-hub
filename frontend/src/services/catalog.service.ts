import { apiFetch } from './api';
import type { Category, Product, ProductFilters, ProductListResponse } from '../types/catalog';

/** Drops empty values so the URL stays clean and defaults stay server-side. */
const toQueryString = (filters: ProductFilters): string => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
};

export const getCategories = () =>
  apiFetch<{ categories: Category[] }>('/categories').then((r) => r.categories);

export const getProducts = (filters: ProductFilters = {}) =>
  apiFetch<ProductListResponse>(`/products${toQueryString(filters)}`);

export const getProductBySlug = (slug: string) =>
  apiFetch<{ product: Product }>(`/products/${encodeURIComponent(slug)}`).then((r) => r.product);
