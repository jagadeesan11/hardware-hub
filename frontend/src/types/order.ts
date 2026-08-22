export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type ShippingAddress = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
};

export type OrderItem = {
  id: string;
  quantity: number;
  priceAtPurchase: number;
  lineTotal: number;
  product: { id: string; name: string; slug: string; images: string[]; sku: string };
};

export type OrderStatusEvent = {
  status: OrderStatus;
  note: string | null;
  createdAt: string;
};

export type Order = {
  id: string;
  /** Raw number — render with formatOrderNumber() from lib/format for the ODRH0000001 form. */
  orderNumber: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  shippingAddress: ShippingAddress;
  razorpayOrderId: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  createdAt: string;
  items: OrderItem[];
  payments: {
    id: string;
    razorpayPaymentId: string | null;
    status: PaymentStatus;
    amount: number;
    createdAt: string;
  }[];
  // Chronological, oldest first — one entry per status the order has passed through.
  statusHistory: OrderStatusEvent[];
};

export type PaymentOrderResponse = {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  orderId: string;
  orderNumber: number;
};
