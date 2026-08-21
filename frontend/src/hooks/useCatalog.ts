import { useCallback, useEffect, useRef, useState } from 'react';
import { getCategories, getProductBySlug, getProducts } from '../services/catalog.service';
import type { Category, Pagination, Product, ProductFilters } from '../types/catalog';

type Async<T> = { data: T | null; error: string | null; isLoading: boolean };

const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong';

export function useCategories() {
  const [state, setState] = useState<Async<Category[]>>({
    data: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let active = true;
    getCategories()
      .then((categories) => {
        if (active) setState({ data: categories, error: null, isLoading: false });
      })
      .catch((error) => {
        if (active) setState({ data: null, error: message(error), isLoading: false });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}

export function useProducts(filters: ProductFilters) {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters are rebuilt on each render, so serialize for a stable dependency.
  const key = JSON.stringify(filters);

  // Guards against a slow early request resolving after a newer one and
  // overwriting the results the user is actually looking at.
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);

    getProducts(JSON.parse(key) as ProductFilters)
      .then((response) => {
        if (id !== requestId.current) return;
        setProducts(response.products);
        setPagination(response.pagination);
        setIsLoading(false);
      })
      .catch((err) => {
        if (id !== requestId.current) return;
        setProducts([]);
        setPagination(null);
        setError(message(err));
        setIsLoading(false);
      });
  }, [key]);

  return { products, pagination, error, isLoading };
}

export function useProduct(slug: string | undefined) {
  const [state, setState] = useState<Async<Product>>({
    data: null,
    error: null,
    isLoading: true,
  });

  const load = useCallback(() => {
    if (!slug) {
      setState({ data: null, error: 'No product specified', isLoading: false });
      return;
    }
    setState({ data: null, error: null, isLoading: true });
    getProductBySlug(slug)
      .then((product) => setState({ data: product, error: null, isLoading: false }))
      .catch((error) => setState({ data: null, error: message(error), isLoading: false }));
  }, [slug]);

  useEffect(load, [load]);

  return { ...state, refetch: load };
}
