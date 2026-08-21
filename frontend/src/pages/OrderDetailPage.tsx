import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import * as orderService from '../services/order.service';
import { formatPrice } from '../lib/format';
import OrderTracker from '../components/OrderTracker';
import type { Order, OrderStatus, PaymentStatus } from '../types/order';

const statusTone: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800',
  PAID: 'bg-emerald-50 text-emerald-800',
  SHIPPED: 'bg-blue-50 text-blue-800',
  DELIVERED: 'bg-emerald-50 text-emerald-800',
  CANCELLED: 'bg-red-50 text-red-800',
};

const paymentTone: Record<PaymentStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800',
  PAID: 'bg-emerald-50 text-emerald-800',
  FAILED: 'bg-red-50 text-red-800',
  REFUNDED: 'bg-slate-100 text-slate-700',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const justPaid = searchParams.get('paid') === '1';

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    orderService
      .getOrder(id)
      .then((o) => {
        setOrder(o);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load order');
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-ink-500">Loading order…</div>;
  }

  if (error || !order) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-ink-500">{error}</p>
        <Link
          to="/products"
          className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  const address = order.shippingAddress;

  return (
    <div className="space-y-6">
      {justPaid && order.paymentStatus === 'PAID' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h1 className="text-lg font-bold text-emerald-900">Payment received</h1>
          <p className="mt-1 text-sm text-emerald-800">
            Thank you. We will confirm dispatch by SMS on {address.phone}.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Order {order.id.slice(0, 8)}</h1>
          <p className="mt-1 text-sm text-ink-500">
            Placed {new Date(order.createdAt).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[order.status]}`}>
            {order.status}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentTone[order.paymentStatus]}`}
          >
            Payment: {order.paymentStatus}
          </span>
        </div>
      </div>

      <OrderTracker order={order} />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-4">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 py-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-xs text-slate-400">
                {item.product.images.length > 0 ? (
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  item.product.sku
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/products/${item.product.slug}`}
                  className="line-clamp-2 text-sm font-semibold hover:text-brand-600"
                >
                  {item.product.name}
                </Link>
                <p className="text-xs text-ink-500">
                  {formatPrice(item.priceAtPurchase)} × {item.quantity}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {formatPrice(item.lineTotal)}
              </span>
            </li>
          ))}
        </ul>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Total paid</h2>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {formatPrice(order.totalAmount)}
            </p>
            {order.payments.length > 0 && order.payments[0]?.razorpayPaymentId && (
              <p className="mt-2 break-all text-xs text-ink-500">
                Payment ref: {order.payments[0].razorpayPaymentId}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="text-sm font-semibold">Delivery address</h2>
            <address className="mt-2 not-italic leading-relaxed text-ink-700">
              {address.fullName}
              <br />
              {address.line1}
              {address.line2 && (
                <>
                  <br />
                  {address.line2}
                </>
              )}
              <br />
              {address.city}, {address.state} {address.pincode}
              {address.landmark && (
                <>
                  <br />
                  Landmark: {address.landmark}
                </>
              )}
              <br />
              {address.phone}
            </address>
          </div>

          {order.paymentStatus !== 'PAID' && order.status === 'PENDING' && (
            <Link
              to="/checkout"
              className="block rounded-lg bg-brand-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-brand-600"
            >
              Retry payment
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
