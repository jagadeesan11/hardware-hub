import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useProduct } from '../hooks/useCatalog';
import { formatPrice, stockLabel } from '../lib/format';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import type { Product } from '../types/catalog';

function DetailSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="aspect-4/3 animate-pulse rounded-xl bg-slate-100" />
      <div className="space-y-4">
        <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100" />
        <div className="h-7 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-6 w-1/3 animate-pulse rounded bg-slate-100" />
        <div className="h-20 w-full animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

function AddToCart({ product }: { product: Product }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { add, cart } = useCartStore();

  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<'idle' | 'adding' | 'added'>('idle');
  const [error, setError] = useState<string | null>(null);

  const alreadyInCart = cart?.items.find((i) => i.product.id === product.id)?.quantity ?? 0;
  const remaining = product.stockQty - alreadyInCart;
  const outOfStock = product.stockQty <= 0;

  const handleAdd = async () => {
    // Send them to sign in, then straight back to this product.
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    setStatus('adding');
    setError(null);
    try {
      await add(product.id, quantity);
      setStatus('added');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to cart');
      setStatus('idle');
    }
  };

  if (outOfStock) {
    return (
      <button
        type="button"
        disabled
        className="w-full rounded-lg bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
      >
        Out of stock
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label htmlFor="qty" className="text-sm text-ink-500">
          Quantity
        </label>
        <select
          id="qty"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          {Array.from({ length: Math.min(10, Math.max(remaining, 1)) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        {alreadyInCart > 0 && (
          <span className="text-xs text-ink-500">{alreadyInCart} already in cart</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => void handleAdd()}
        disabled={status === 'adding' || remaining <= 0}
        className={`w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          status === 'added' ? 'bg-emerald-600' : 'bg-brand-500 hover:bg-brand-600'
        }`}
      >
        {status === 'adding'
          ? 'Adding…'
          : status === 'added'
            ? 'Added to cart'
            : remaining <= 0
              ? 'Maximum in cart'
              : user
                ? 'Add to cart'
                : 'Sign in to add to cart'}
      </button>

      {status === 'added' && (
        <Link
          to="/cart"
          className="block text-center text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          View cart
        </Link>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, error, isLoading } = useProduct(slug);

  if (isLoading) return <DetailSkeleton />;

  if (error || !product) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Product not available</h1>
        <p className="mt-2 text-ink-500">{error ?? 'This product may have been delisted.'}</p>
        <Link
          to="/products"
          className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Browse all products
        </Link>
      </div>
    );
  }

  const stock = stockLabel(product.stockQty);
  const specs = [
    ['SKU', product.sku],
    ['Category', product.category.name],
    ['Size', product.size],
    ['Material', product.material],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
        <Link to="/products" className="hover:text-ink-900">
          Products
        </Link>
        <span className="mx-2">/</span>
        <Link to={`/products?category=${product.category.slug}`} className="hover:text-ink-900">
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-4/3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {product.images.length > 0 ? (
            <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <span className="text-sm text-slate-400">No image available</span>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
              {product.category.name}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
            <span
              className={`text-sm font-medium ${
                stock.tone === 'ok'
                  ? 'text-emerald-700'
                  : stock.tone === 'low'
                    ? 'text-amber-700'
                    : 'text-red-700'
              }`}
            >
              {stock.text}
            </span>
          </div>

          {product.description && (
            <p className="text-sm leading-relaxed text-ink-700">{product.description}</p>
          )}

          {specs.length > 0 && (
            <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white text-sm">
              {specs.map(([label, value]) => (
                <div key={label} className="flex justify-between px-4 py-2.5">
                  <dt className="text-ink-500">{label}</dt>
                  <dd className="font-medium text-ink-900">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <AddToCart product={product} />
        </div>
      </div>
    </div>
  );
}
