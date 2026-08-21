import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import HeroPattern from '../components/HeroPattern';
import { useCategories, useProducts } from '../hooks/useCatalog';

export default function HomePage() {
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  // Newest six, as a shop-window strip.
  const { products, isLoading: productsLoading, error } = useProducts({ limit: 6, sort: 'newest' });

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
        <HeroPattern />
        <div className="relative">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything for doors, walls &amp; finishes
          </h1>
          <p className="mt-3 max-w-2xl text-ink-500">
            Doors, PVC panels, paints, fittings and wood hardware — sourced for builders and
            homeowners, delivered across the city.
          </p>
          <Link
            to="/products"
            className="mt-6 inline-block rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Browse all products
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Shop by category</h2>
        {categoriesLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(categories ?? []).map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${category.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <p className="text-sm font-semibold text-ink-900">{category.name}</p>
                <p className="mt-1 text-xs text-ink-500">
                  {category.productCount} {category.productCount === 1 ? 'product' : 'products'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Latest arrivals</h2>
          <Link to="/products" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View all
          </Link>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <p className="font-medium">Could not load products.</p>
            <p className="mt-1">{error} — is the backend running on port 4000?</p>
          </div>
        ) : productsLoading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
