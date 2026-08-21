/** Minimal shape of the Razorpay checkout widget we actually use. */
export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpaySuccess) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let loadPromise: Promise<boolean> | null = null;

/**
 * Loads the checkout script on demand rather than in index.html, so a shopper
 * who never reaches checkout does not pay for a third-party script — and an
 * outage on their CDN cannot block the whole app from rendering.
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  if (window.Razorpay) return Promise.resolve(true);

  loadPromise ??= new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      loadPromise = null; // allow a retry
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return loadPromise;
};

export type { RazorpayOptions };
