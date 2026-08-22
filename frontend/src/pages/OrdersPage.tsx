import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as orderService from '../services/order.service';
import { formatOrderNumber, formatPrice } from '../lib/format';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/StatusBadge';
import type { Order } from '../types/order';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    orderService
      .getMyOrders()
      .then((data) => {
        setOrders(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load orders');
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-ink-500">Loading your orders…</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="font-medium">Could not load your orders.</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">No orders yet</h1>
        <p className="mt-2 text-ink-500">Your completed orders will appear here.</p>
        <Link
          to="/products"
          className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Your orders</h1>

      <ul className="space-y-3">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              to={`/orders/${order.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Order {formatOrderNumber(order.orderNumber)}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {' · '}
                    {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <OrderStatusBadge status={order.status} />
                  <PaymentStatusBadge status={order.paymentStatus} />
                  <span className="text-sm font-bold tabular-nums">
                    {formatPrice(order.totalAmount)}
                  </span>
                </div>
              </div>

              <p className="mt-2 line-clamp-1 text-xs text-ink-500">
                {order.items.map((i) => `${i.product.name} × ${i.quantity}`).join(', ')}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
