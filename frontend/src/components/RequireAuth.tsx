import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * Blocks a route until auth is known. Rendering the redirect while the
 * persisted token is still being verified would bounce a signed-in user to
 * the login page on every hard refresh.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isRestoring } = useAuthStore();
  const location = useLocation();

  if (isRestoring) {
    return (
      <div className="py-20 text-center text-sm text-ink-500">Checking your session…</div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
}
