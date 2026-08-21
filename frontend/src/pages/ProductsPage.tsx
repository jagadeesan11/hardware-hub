import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CategoryFilter from '../components/CategoryFilter';
import Pagination from '../components/Pagination';
import ProductCard from '../components/ProductCard';
import { useCategories, useProducts } from '../hooks/useCatalog';
import { useDebounce } from '../hooks/useDebounce';
import type { ProductFilters, ProductSort } from '../types/catalog';

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
];

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="aspect-4/3 animate-pulse bg-slate-100" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProductsPage() {
  // The URL is the source of truth for filters, so results are shareable and
  // the browser back button steps through filter changes as expected.
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get('category') ?? undefined;
  const sort = (searchParams.get('sort') as ProductSort | null) ?? 'newest';
  const page = Number(searchParams.get('page') ?? '1');
  const urlSearch = searchParams.get('search') ?? '';
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const inStock = searchParams.get('inStock') === 'true';

  // Local state so the input stays responsive; the URL updates on a debounce.
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchInput, 350);

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const updateParams = (changes: Record<string, string | undefined>, resetPage = true) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === undefined || value === '') next.delete(key);
          else next.set(key, value);
        }
        if (resetPage) next.delete('page');
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    if (debouncedSearch === urlSearch) return;
    updateParams({ search: debouncedSearch || undefined });
    // updateParams is stable enough for this effect; only the debounced value matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const filters = useMemo<ProductFilters>(
    () => ({
      category,
      search: urlSearch || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      inStock: inStock || undefined,
      sort,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: 12,
    }),
    [category, urlSearch, minPrice, maxPrice, inStock, sort, page],
  );

  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();
  const { products, pagination, isLoading, error } = useProducts(filters);

  const hasActiveFilters = Boolean(
    category || urlSearch || minPrice || maxPrice || inStock || sort !== 'newest',
  );

  const clearAll = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink-900">Categories</h2>
        {categoriesError ? (
          <p className="text-sm text-red-700">{categoriesError}</p>
        ) : (
          <CategoryFilter
            categories={categories ?? []}
            selected={category}
            onSelect={(slug) => {
              updateParams({ category: slug });
              setIsFilterOpen(false);
            }}
            isLoading={categoriesLoading}
          />
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink-900">Price range (₹)</h2>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Min"
            defaultValue={minPrice}
            onBlur={(e) => updateParams({ minPrice: e.target.value })}
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
          <span className="text-ink-500">–</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Max"
            defaultValue={maxPrice}
            onBlur={(e) => updateParams({ maxPrice: e.target.value })}
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-ink-500">Applied when you leave the field.</p>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => updateParams({ inStock: e.target.checked ? 'true' : undefined })}
          className="h-4 w-4 rounded border-slate-300 accent-brand-500"
        />
        In stock only
      </label>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-slate-50"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Products</h1>
        <p className="mt-1 text-sm text-ink-500">
          {pagination ? `${pagination.total} items` : 'Loading catalogue…'}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search doors, paints, hinges…"
          aria-label="Search products"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />

        <select
          value={sort}
          onChange={(e) => updateParams({ sort: e.target.value })}
          aria-label="Sort products"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setIsFilterOpen((open) => !open)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium lg:hidden"
          aria-expanded={isFilterOpen}
        >
          {isFilterOpen ? 'Hide filters' : 'Filters'}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className={`${isFilterOpen ? 'block' : 'hidden'} lg:block`}>{filterPanel}</aside>

        <section>
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              <p className="font-medium">Could not load products.</p>
              <p className="mt-1">{error}</p>
            </div>
          ) : isLoading ? (
            <ProductGridSkeleton />
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
              <p className="font-medium text-ink-900">No products match those filters.</p>
              <p className="mt-1 text-sm text-ink-500">Try widening the price range or search.</p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {pagination && (
                <Pagination
                  pagination={pagination}
                  onPageChange={(next) => {
                    updateParams({ page: String(next) }, false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
