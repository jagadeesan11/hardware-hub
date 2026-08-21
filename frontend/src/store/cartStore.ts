import { create } from 'zustand';
import * as cartService from '../services/cart.service';
import type { Cart } from '../types/cart';

type CartState = {
  cart: Cart | null;
  isLoading: boolean;
  /** Id of the item currently being changed, so only that row shows a spinner. */
  pendingItemId: string | null;
  error: string | null;
  fetch: () => Promise<void>;
  add: (productId: string, quantity?: number) => Promise<void>;
  update: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
  reset: () => void;
};

const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong';

/**
 * The cart is never computed locally. Every mutation returns the authoritative
 * cart from the server, because stock limits and clamping are enforced there —
 * optimistic local math would drift from what checkout will actually accept.
 */
export const useCartStore = create<CartState>((set) => ({
  cart: null,
  isLoading: false,
  pendingItemId: null,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      set({ cart: await cartService.getCart(), isLoading: false });
    } catch (error) {
      set({ error: message(error), isLoading: false });
    }
  },

  add: async (productId, quantity = 1) => {
    set({ error: null, pendingItemId: productId });
    try {
      set({ cart: await cartService.addItem(productId, quantity), pendingItemId: null });
    } catch (error) {
      set({ error: message(error), pendingItemId: null });
      throw error;
    }
  },

  update: async (itemId, quantity) => {
    set({ error: null, pendingItemId: itemId });
    try {
      set({ cart: await cartService.updateItem(itemId, quantity), pendingItemId: null });
    } catch (error) {
      set({ error: message(error), pendingItemId: null });
    }
  },

  remove: async (itemId) => {
    set({ error: null, pendingItemId: itemId });
    try {
      set({ cart: await cartService.removeItem(itemId), pendingItemId: null });
    } catch (error) {
      set({ error: message(error), pendingItemId: null });
    }
  },

  clear: async () => {
    set({ isLoading: true, error: null });
    try {
      set({ cart: await cartService.clearCart(), isLoading: false });
    } catch (error) {
      set({ error: message(error), isLoading: false });
    }
  },

  /** Called on logout so the next user never sees the previous cart. */
  reset: () => set({ cart: null, isLoading: false, pendingItemId: null, error: null }),
}));
