import type { Order, OrderStatus } from '../types/order';

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'PENDING', label: 'Placed' },
  { status: 'PAID', label: 'Paid' },
  { status: 'SHIPPED', label: 'Shipped' },
  { status: 'DELIVERED', label: 'Delivered' },
];

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

/**
 * Visual progress tracker: Placed -> Paid -> Shipped -> Delivered, each step
 * timestamped from `statusHistory` (one row per transition, written server-side
 * alongside every status change). A cancelled order gets its own banner rather
 * than a stepper frozen mid-way, which would misleadingly suggest it's still
 * moving forward.
 */
export default function OrderTracker({ order }: { order: Order }) {
  const eventByStatus = new Map(order.statusHistory.map((e) => [e.status, e]));

  if (order.status === 'CANCELLED') {
    const event = eventByStatus.get('CANCELLED');
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-800">Order cancelled</p>
        <p className="mt-1 text-xs text-red-700">
          {event?.note ?? 'This order was cancelled.'}
          {event ? ` · ${formatWhen(event.createdAt)}` : ''}
        </p>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.status === order.status);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <ol className="flex items-start">
        {STEPS.map((step, index) => {
          const event = eventByStatus.get(step.status);
          const isComplete = index <= stepIndex;

          return (
            <li key={step.status} className="flex flex-1 flex-col items-center text-center last:flex-none">
              <div className="flex w-full items-center">
                {index > 0 && (
                  <div
                    className={`h-0.5 flex-1 ${index <= stepIndex ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  />
                )}
                <div
                  aria-hidden="true"
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    isComplete
                      ? 'bg-emerald-500 text-white'
                      : 'border-2 border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {isComplete ? '✓' : index + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 ${index < stepIndex ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </div>

              <p
                className={`mt-2 text-xs font-medium ${
                  isComplete ? 'text-ink-900' : 'text-ink-500'
                }`}
              >
                {step.label}
              </p>
              <p className="mt-0.5 h-3.5 text-[11px] text-ink-500">
                {event ? formatWhen(event.createdAt) : ''}
              </p>
            </li>
          );
        })}
      </ol>

      {order.carrier || order.trackingNumber ? (
        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-ink-700">
          <span className="font-medium">Tracking:</span>{' '}
          {[order.carrier, order.trackingNumber].filter(Boolean).join(' · ')}
        </div>
      ) : null}
    </div>
  );
}
