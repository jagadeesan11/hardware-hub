import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAuthToken } from '../services/api';
import * as authService from '../services/auth.service';
import type { LoginPayload, RegisterPayload, User } from '../types/auth';

type AuthState = {
  user: User | null;
  token: string | null;
  /** True until the persisted token has been checked against the server. */
  isRestoring: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  restore: () => Promise<void>;
};

/**
 * The token lives in localStorage, which means an XSS bug could read it. The
 * alternative — an httpOnly cookie — needs CSRF protection and a same-site
 * story for the Vercel/Render split. Revisit before going live with real
 * payments; for now the token is short-lived (7d) and carries no secrets.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isRestoring: true,

      login: async (payload) => {
        const { user, token } = await authService.login(payload);
        setAuthToken(token);
        set({ user, token, isRestoring: false });
      },

      register: async (payload) => {
        const { user, token } = await authService.register(payload);
        setAuthToken(token);
        set({ user, token, isRestoring: false });
      },

      logout: () => {
        setAuthToken(null);
        set({ user: null, token: null, isRestoring: false });
      },

      /**
       * Confirms a rehydrated token is still valid. Without this a deleted or
       * demoted account would keep rendering as logged in until it acted.
       */
      restore: async () => {
        const { token } = get();
        if (!token) {
          set({ isRestoring: false });
          return;
        }

        setAuthToken(token);
        try {
          const user = await authService.getMe();
          set({ user, isRestoring: false });
        } catch {
          setAuthToken(null);
          set({ user: null, token: null, isRestoring: false });
        }
      },
    }),
    {
      name: 'hardware-hub-auth',
      // Only the token is persisted; the user object is re-fetched on restore
      // so a stale name or role never lingers in localStorage.
      partialize: (state) => ({ token: state.token }),
    },
  ),
);
