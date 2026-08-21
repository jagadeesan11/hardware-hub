import { Link } from 'react-router-dom';
import { formatPrice, stockLabel } from '../lib/format';
import type { Product } from '../types/catalog';

const toneClasses: Record<'ok' | 'low' | 'out', string> = {
  ok: 'text-emerald-700',
  low: 'text-amber-700',
  out: 'text-red-700',
};

/** Seeded products have no images yet, so fall back to the initials of the name. */
function Thumbnail({ product }: { product: Product }) {
  const initials = product.name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  if (product.images.length > 0) {
    return (
      <img
        src={product.images[0]}
        alt={product.name}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <span className="text-2xl font-bold tracking-tight text-slate-400">{initials}</span>
    </div>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const stock = stockLabel(product.stockQty);

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="aspect-4/3 w-full overflow-hidden">
        <Thumbnail product={product} />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
          {product.category.name}
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold text-ink-900 group-hover:text-brand-600">
          {product.name}
        </h3>

        {(product.size || product.material) && (
          <p className="line-clamp-1 text-xs text-ink-500">
            {[product.size, product.material].filter(Boolean).join(' · ')}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between pt-3">
          <span className="text-base font-bold text-ink-900">{formatPrice(product.price)}</span>
          <span className={`text-xs font-medium ${toneClasses[stock.tone]}`}>{stock.text}</span>
        </div>
      </div>
    </Link>
  );
}
