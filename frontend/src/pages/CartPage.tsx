import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { formatPrice } from '../lib/format';
import type { CartItem } from '../types/cart';

function QuantityStepper({ item }: { item: CartItem }) {
  const { update, pendingItemId } = useCartStore();
  const isPending = pendingItemId === item.id;
  const atMax = item.quantity >= item.product.stockQty;

  const buttonClass =
    'flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-sm font-medium transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`Decrease quantity of ${item.product.name}`}
        disabled={isPending}
        onClick={() => void update(item.id, item.quantity - 1)}
        className={buttonClass}
      >
        −
      </button>
      <span className="w-9 text-center text-sm font-medium tabular-nums">
        {isPending ? '…' : item.quantity}
      </span>
      <button
        type="button"
        aria-label={`Increase quantity of ${item.product.name}`}
        disabled={isPending || atMax}
        title={atMax ? `Only ${item.product.stockQty} in stock` : undefined}
        onClick={() => void update(item.id, item.quantity + 1)}
        className={buttonClass}
      >
        +
      </button>
    </div>
  );
}

function CartRow({ item }: { item: CartItem }) {
  const { remove, pendingItemId } = useCartStore();
  const isPending = pendingItemId === item.id;

  return (
    <li className="flex gap-4 py-4">
      <Link
        to={`/products/${item.product.slug}`}
        className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200"
      >
        {item.product.images.length > 0 ? (
          <img
            src={item.product.images[0]}
            alt={item.product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
            {item.product.sku}
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to={`/products/${item.product.slug}`}
          className="line-clamp-2 text-sm font-semibold hover:text-brand-600"
        >
          {item.product.name}
        </Link>
        <p className="text-xs text-ink-500">
          {formatPrice(item.product.price)} each
          {item.product.size ? ` · ${item.product.size}` : ''}
        </p>

        {item.issues.unavailable && (
          <p className="text-xs font-medium text-red-700">
            No longer sold — remove it to check out.
          </p>
        )}
        {!item.issues.unavailable && item.issues.insufficientStock && (
          <p className="text-xs font-medium text-amber-700">
            Only {item.issues.availableQty} left — reduce the quantity.
          </p>
        )}

        <div className="mt-1 flex items-center gap-3">
          <QuantityStepper item={item} />
          <button
            type="button"
            disabled={isPending}
            onClick={() => void remove(item.id)}
            className="text-xs font-medium text-ink-500 underline-offset-2 hover:text-red-700 hover:underline disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="text-right text-sm font-semibold tabular-nums">
        {formatPrice(item.lineTotal)}
      </div>
    </li>
  );
}

export default function CartPage() {
  const { cart, isLoading, error, fetch, clear } = useCartStore();

  useEffect(() => {
    void fetch();
  }, [fetch]);

  if (isLoading && !cart) {
    return <div className="py-20 text-center text-sm text-ink-500">Loading your cart…</div>;
  }

  if (error && !cart) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="font-medium">Could not load your cart.</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-ink-500">Add doors, panels or fittings to get started.</p>
        <Link
          to="/products"
          className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Your cart{' '}
          <span className="text-base font-normal text-ink-500">
            ({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'})
          </span>
        </h1>
        <button
          type="button"
          onClick={() => void clear()}
          className="text-sm font-medium text-ink-500 hover:text-red-700"
        >
          Clear cart
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-4">
          {cart.items.map((item) => (
            <CartRow key={item.id} item={item} />
          ))}
        </ul>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Order summary</h2>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="font-medium tabular-nums">{formatPrice(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Delivery</dt>
              <dd className="text-ink-500">Calculated at checkout</dd>
            </div>
          </dl>

          <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(cart.subtotal)}</span>
          </div>

          {cart.hasIssues && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Fix the flagged items above before checking out.
            </p>
          )}

          <Link
            to="/checkout"
            aria-disabled={cart.hasIssues}
            onClick={(e) => {
              // Flagged items would fail server-side validation anyway.
              if (cart.hasIssues) e.preventDefault();
            }}
            className={`mt-4 block rounded-lg px-4 py-3 text-center text-sm font-semibold text-white transition-colors ${
              cart.hasIssues
                ? 'pointer-events-none bg-slate-300'
                : 'bg-brand-500 hover:bg-brand-600'
            }`}
          >
            Proceed to checkout
          </Link>

          <Link
            to="/products"
            className="mt-3 block text-center text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
