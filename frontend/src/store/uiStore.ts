import { create } from 'zustand';

/**
 * Placeholder UI store proving the Zustand wiring. Phase 2+ adds authStore
 * and cartStore alongside it.
 */
type UiState = {
  isMobileNavOpen: boolean;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  isMobileNavOpen: false,
  toggleMobileNav: () => set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen })),
  closeMobileNav: () => set({ isMobileNavOpen: false }),
}));
