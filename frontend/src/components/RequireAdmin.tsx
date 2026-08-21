import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * Hiding admin routes in the UI is a convenience, not a control — every admin
 * endpoint enforces the role server-side from the signed token.
 */
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isRestoring } = useAuthStore();
  const location = useLocation();

  if (isRestoring) {
    return <div className="py-20 text-center text-sm text-ink-500">Checking your session…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Not available</h1>
        <p className="mt-2 text-ink-500">This area is for shop administrators.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Back to shop
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
