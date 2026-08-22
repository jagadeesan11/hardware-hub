import { apiFetch } from './api';
import type { ShopSettings, ShopSettingsInput } from '../types/settings';

/** Public — no auth required. 404s until an admin has saved settings once. */
export const getSettings = () =>
  apiFetch<{ settings: ShopSettings }>('/settings').then((r) => r.settings);

export const updateSettings = (input: ShopSettingsInput) =>
  apiFetch<{ settings: ShopSettings }>('/admin/settings', {
    method: 'PUT',
    body: input,
  }).then((r) => r.settings);
