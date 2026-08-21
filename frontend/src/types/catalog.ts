/** Mirrors the JSON the backend serializes — `price` is a number, not a Decimal. */
export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  productCount: number;
  children: Category[];
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stockQty: number;
  sku: string;
  size: string | null;
  material: string | null;
  images: string[];
  isActive: boolean;
  createdAt: string;
  inStock: boolean;
  category: { id: string; name: string; slug: string };
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type ProductListResponse = {
  products: Product[];
  pagination: Pagination;
};

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

export type ProductFilters = {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: ProductSort;
  page?: number;
  limit?: number;
};
