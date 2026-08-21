import type { OrderStatus, PaymentStatus } from '../types/order';

const orderTone: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800',
  PAID: 'bg-emerald-50 text-emerald-800',
  SHIPPED: 'bg-blue-50 text-blue-800',
  DELIVERED: 'bg-emerald-100 text-emerald-900',
  CANCELLED: 'bg-red-50 text-red-800',
};

const paymentTone: Record<PaymentStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800',
  PAID: 'bg-emerald-50 text-emerald-800',
  FAILED: 'bg-red-50 text-red-800',
  REFUNDED: 'bg-slate-100 text-slate-700',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${orderTone[status]}`}>
      {status}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentTone[status]}`}>
      {status}
    </span>
  );
}
