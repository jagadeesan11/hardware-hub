export type CartProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stockQty: number;
  sku: string;
  size: string | null;
  material: string | null;
  images: string[];
  isActive: boolean;
};

export type CartItem = {
  id: string;
  quantity: number;
  product: CartProduct;
  lineTotal: number;
  issues: {
    unavailable: boolean;
    insufficientStock: boolean;
    availableQty: number;
  };
};

export type Cart = {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  hasIssues: boolean;
};
