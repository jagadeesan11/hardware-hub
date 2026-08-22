import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useSettingsStore } from '../store/settingsStore';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Products' },
];

/** "Harikrishna Enterprises" -> "HE" — first letter of up to the first two words. */
const brandInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'HH';

/** Initial-in-circle, matching the "HH" logo mark. Name lives in the tooltip. */
function AccountBadge({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      title={name}
      aria-label={`Signed in as ${name}`}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-ink-700"
    >
      {initial}
    </span>
  );
}

function SignOutIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

function CartLink({ onNavigate }: { onNavigate?: () => void }) {
  const itemCount = useCartStore((s) => s.cart?.itemCount ?? 0);

  return (
    <NavLink
      to="/cart"
      onClick={onNavigate}
      className={({ isActive }) =>
        `relative flex items-center gap-1.5 text-sm font-medium transition-colors ${
          isActive ? 'text-brand-600' : 'text-ink-500 hover:text-ink-900'
        }`
      }
    >
      Cart
      {itemCount > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-xs font-bold text-white">
          {itemCount}
        </span>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { isMobileNavOpen, toggleMobileNav, closeMobileNav } = useUiStore();
  const { user, logout } = useAuthStore();
  const resetCart = useCartStore((s) => s.reset);
  const settings = useSettingsStore((s) => s.settings);
  // "Hardware Hub" is the fallback shown before settings load, or if an
  // admin hasn't configured the shop yet — never a blank header.
  const shopName = settings?.shopName ?? 'Hardware Hub';
  const isShopStaff = user?.role === 'ADMIN' || user?.role === 'SHOP_OWNER';
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    resetCart();
    closeMobileNav();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2" onClick={closeMobileNav}>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-sm font-bold text-white">
              {brandInitials(shopName)}
            </span>
            <span className="text-lg font-semibold tracking-tight">{shopName}</span>
          </Link>

          <nav className="hidden items-center gap-6 sm:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? 'text-brand-600' : 'text-ink-500 hover:text-ink-900'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            <CartLink />

            {user ? (
              <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
                <NavLink
                  to="/orders"
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${
                      isActive ? 'text-brand-600' : 'text-ink-500 hover:text-ink-900'
                    }`
                  }
                >
                  Orders
                </NavLink>
                {isShopStaff && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      `text-sm font-medium transition-colors ${
                        isActive ? 'text-brand-600' : 'text-ink-500 hover:text-ink-900'
                      }`
                    }
                  >
                    Admin
                  </NavLink>
                )}
                <AccountBadge name={user.name} />
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  aria-label="Sign out"
                  className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  <SignOutIcon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
              >
                Sign in
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3 sm:hidden">
            <CartLink />
            <button
              type="button"
              onClick={toggleMobileNav}
              aria-expanded={isMobileNavOpen}
              aria-label="Toggle navigation"
              className="rounded-lg border border-slate-200 p-2"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                {isMobileNavOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {isMobileNavOpen && (
          <nav className="border-t border-slate-200 bg-white px-4 py-2 sm:hidden">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={closeMobileNav}
                className="block py-2 text-sm font-medium text-ink-700"
              >
                {link.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink
                  to="/orders"
                  onClick={closeMobileNav}
                  className="block py-2 text-sm font-medium text-ink-700"
                >
                  Orders
                </NavLink>
                {isShopStaff && (
                  <NavLink
                    to="/admin"
                    onClick={closeMobileNav}
                    className="block py-2 text-sm font-medium text-ink-700"
                  >
                    Admin
                  </NavLink>
                )}
                <div className="flex items-center justify-between py-2">
                  <AccountBadge name={user.name} />
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Sign out"
                    aria-label="Sign out"
                    className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                  >
                    <SignOutIcon className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <NavLink
                to="/login"
                onClick={closeMobileNav}
                className="block py-2 text-sm font-medium text-brand-600"
              >
                Sign in
              </NavLink>
            )}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-ink-500">
          {settings ? (
            <div className="flex flex-col gap-1">
              <p className="font-medium text-ink-700">{settings.shopName}</p>
              <p>
                {settings.addressLine1}, {settings.city}
                {settings.district ? `, ${settings.district}` : ''}, {settings.state} —{' '}
                {settings.pincode}
                {settings.landmark ? ` (${settings.landmark})` : ''}
              </p>
              <p className="flex flex-wrap gap-x-4">
                <a href={`tel:+91${settings.phone}`} className="hover:text-ink-900">
                  {settings.phone}
                </a>
                <a href={`mailto:${settings.email}`} className="hover:text-ink-900">
                  {settings.email}
                </a>
                {settings.gstNumber && <span>GSTIN: {settings.gstNumber}</span>}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                &copy; {new Date().getFullYear()} {settings.shopName}
              </p>
            </div>
          ) : (
            <p>&copy; {new Date().getFullYear()} {shopName} — doors, panels, paints &amp; fittings.</p>
          )}
        </div>
      </footer>
    </div>
  );
}
