import { apiFetch } from './api';
import type { Order, PaymentOrderResponse, ShippingAddress } from '../types/order';

export const createOrder = (shippingAddress: ShippingAddress) =>
  apiFetch<{ order: Order }>('/orders', {
    method: 'POST',
    body: { shippingAddress },
  }).then((r) => r.order);

export const getMyOrders = () => apiFetch<{ orders: Order[] }>('/orders').then((r) => r.orders);

export const getOrder = (id: string) =>
  apiFetch<{ order: Order }>(`/orders/${id}`).then((r) => r.order);

export const createPaymentOrder = (orderId: string) =>
  apiFetch<PaymentOrderResponse>('/payment/create-order', {
    method: 'POST',
    body: { orderId },
  });

export type VerifyResult = {
  order: { id: string; status: string; paymentStatus: string };
  alreadyProcessed: boolean;
};

export const verifyPayment = (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) => apiFetch<VerifyResult>('/payment/verify', { method: 'POST', body: payload });

/** Best-effort: records a dismissed or failed attempt, never blocks the UI. */
export const markPaymentFailed = (orderId: string) =>
  apiFetch<{ ok: boolean }>(`/payment/failed/${orderId}`, { method: 'POST' }).catch(() => null);
