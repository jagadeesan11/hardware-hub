import { apiFetch } from './api';
import type { AuthResponse, LoginPayload, RegisterPayload, User } from '../types/auth';

export const register = (payload: RegisterPayload) =>
  apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: payload,
    // A 401 here is the form failing, not a session expiring.
    skipAuthRedirect: true,
  });

export const login = (payload: LoginPayload) =>
  apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: payload,
    skipAuthRedirect: true,
  });

export const getMe = () => apiFetch<{ user: User }>('/auth/me').then((r) => r.user);
