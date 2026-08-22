import { create } from 'zustand';
import { ApiRequestError } from '../services/api';
import * as settingsService from '../services/settings.service';
import type { ShopSettings } from '../types/settings';

type SettingsState = {
  settings: ShopSettings | null;
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
};

/**
 * Loaded once at app startup, for every visitor — the footer and header need
 * it whether or not anyone is signed in. A 404 here just means no admin has
 * saved settings yet; that's an empty state, not a failure worth showing.
 */
export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: true,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await settingsService.getSettings();
      set({ settings, isLoading: false });
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        set({ settings: null, isLoading: false, error: null });
        return;
      }
      set({
        settings: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Could not load shop settings',
      });
    }
  },
}));
