import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiRequestError } from '../services/api';
import * as orderService from '../services/order.service';
import { loadRazorpayScript, type RazorpaySuccess } from '../lib/razorpay';
import { formatPrice } from '../lib/format';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import type { ShippingAddress } from '../types/order';

type Stage = 'form' | 'creating' | 'paying' | 'verifying';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { cart, fetch: fetchCart } = useCartStore();

  const [address, setAddress] = useState<ShippingAddress>({
    fullName: user?.name ?? '',
    phone: user?.phone ?? '',
    line1: '',
    line2: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    landmark: '',
  });

  const [stage, setStage] = useState<Stage>('form');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  const setField = (key: keyof ShippingAddress, value: string) =>
    setAddress((current) => ({ ...current, [key]: value }));

  const busy = stage !== 'form';

  const handleApiError = (err: unknown, fallback: string) => {
    if (err instanceof ApiRequestError) {
      if (Array.isArray(err.details)) {
        const mapped: Record<string, string> = {};
        for (const issue of err.details as { path: string; message: string }[]) {
          // Paths arrive as "shippingAddress.pincode".
          mapped[issue.path.split('.').pop() ?? issue.path] = issue.message;
        }
        setFieldErrors(mapped);
        setError('Please correct the highlighted fields.');
        return;
      }
      setError(err.message);
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setStage('creating');

    let orderId: string;

    try {
      const order = await orderService.createOrder({
        ...address,
        line2: address.line2?.trim() || undefined,
        landmark: address.landmark?.trim() || undefined,
      });
      orderId = order.id;
    } catch (err) {
      handleApiError(err, 'Could not create your order');
      setStage('form');
      return;
    }

    let payment;
    try {
      payment = await orderService.createPaymentOrder(orderId);
    } catch (err) {
      // 503 means the shop has no Razorpay keys configured yet.
      if (err instanceof ApiRequestError && err.status === 503) {
        setError(
          'Online payment is not set up on this server yet. Your order was saved as pending.',
        );
      } else {
        handleApiError(err, 'Could not start payment');
      }
      setStage('form');
      return;
    }

    const scriptReady = await loadRazorpayScript();
    if (!scriptReady || !window.Razorpay) {
      setError('Could not load the payment window. Check your connection and try again.');
      setStage('form');
      return;
    }

    setStage('paying');

    const razorpay = new window.Razorpay({
      key: payment.keyId,
      amount: payment.amount,
      currency: payment.currency,
      name: 'Hardware Hub',
      description: `Order ${orderId.slice(0, 8)}`,
      order_id: payment.razorpayOrderId,
      prefill: {
        name: address.fullName,
        email: user?.email,
        contact: address.phone,
      },
      theme: { color: '#f97316' },
      handler: (response: RazorpaySuccess) => {
        setStage('verifying');
        orderService
          .verifyPayment(response)
          .then(() => {
            void fetchCart();
            navigate(`/orders/${orderId}?paid=1`, { replace: true });
          })
          .catch((err) => {
            // The 409 path: payment taken, stock gone, refund due.
            handleApiError(err, 'Payment could not be confirmed');
            setStage('form');
          });
      },
      modal: {
        ondismiss: () => {
          void orderService.markPaymentFailed(orderId);
          setError('Payment cancelled. Your order is saved as pending — you can retry.');
          setStage('form');
        },
      },
    });

    razorpay.on('payment.failed', (response) => {
      void orderService.markPaymentFailed(orderId);
      setError(response.error?.description ?? 'Payment failed. Please try another method.');
      setStage('form');
    });

    razorpay.open();
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Nothing to check out</h1>
        <p className="mt-2 text-ink-500">Your cart is empty.</p>
        <Link
          to="/products"
          className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const inputClass = (field: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
      fieldErrors[field]
        ? 'border-red-300 focus:border-red-500'
        : 'border-slate-200 focus:border-brand-500'
    }`;

  const field = (
    key: keyof ShippingAddress,
    label: string,
    extra: { type?: string; required?: boolean; placeholder?: string } = {},
  ) => (
    <div>
      <label htmlFor={key} className="mb-1 block text-sm font-medium text-ink-700">
        {label}
      </label>
      <input
        id={key}
        type={extra.type ?? 'text'}
        required={extra.required ?? true}
        placeholder={extra.placeholder}
        value={address[key] ?? ''}
        onChange={(e) => setField(key, e.target.value)}
        disabled={busy}
        className={inputClass(key)}
      />
      {fieldErrors[key] && <p className="mt-1 text-xs text-red-700">{fieldErrors[key]}</p>}
    </div>
  );

  const stageLabel: Record<Stage, string> = {
    form: `Pay ${formatPrice(cart.subtotal)}`,
    creating: 'Creating your order…',
    paying: 'Waiting for payment…',
    verifying: 'Confirming payment…',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Delivery address</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {field('fullName', 'Full name')}
            {field('phone', 'Phone', { type: 'tel', placeholder: '10-digit mobile' })}
          </div>

          {field('line1', 'Address line 1', { placeholder: 'House / building, street' })}
          {field('line2', 'Address line 2 (optional)', { required: false })}

          <div className="grid gap-4 sm:grid-cols-3">
            {field('city', 'City')}
            <div>
              <label htmlFor="state" className="mb-1 block text-sm font-medium text-ink-700">
                State
              </label>
              <select
                id="state"
                value={address.state}
                onChange={(e) => setField('state', e.target.value)}
                disabled={busy}
                className={inputClass('state')}
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {field('pincode', 'PIN code', { placeholder: '6 digits' })}
          </div>

          {field('landmark', 'Landmark (optional)', { required: false })}
        </div>

        <aside className="h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Order summary</h2>

          <ul className="space-y-2 text-sm">
            {cart.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-ink-700">
                  {item.product.name} × {item.quantity}
                </span>
                <span className="tabular-nums">{formatPrice(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(cart.subtotal)}</span>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {cart.hasIssues && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Some items need attention. <Link to="/cart" className="underline">Review your cart</Link>.
            </p>
          )}

          <button
            type="submit"
            disabled={busy || cart.hasIssues}
            className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {stageLabel[stage]}
          </button>

          <p className="text-center text-xs text-ink-500">
            Payments are processed by Razorpay. Card details never reach this server.
          </p>
        </aside>
      </form>
    </div>
  );
}
