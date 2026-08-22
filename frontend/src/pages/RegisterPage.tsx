import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiRequestError } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

type FieldErrors = Record<string, string>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuthStore((s) => s.register);
  const fetchCart = useCartStore((s) => s.fetch);

  const [form, setForm] = useState({ name: '', identifier: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await registerUser({
        name: form.name,
        identifier: form.identifier.trim(),
        password: form.password,
      });
      await fetchCart();
      navigate('/', { replace: true });
    } catch (err) {
      // The API returns per-field Zod issues; surface them next to the inputs.
      if (err instanceof ApiRequestError && Array.isArray(err.details)) {
        const mapped: FieldErrors = {};
        for (const issue of err.details as { path: string; message: string }[]) {
          mapped[issue.path] = issue.message;
        }
        setFieldErrors(mapped);
        setError(Object.keys(mapped).length ? null : err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Could not create account');
      }
      setIsSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
      fieldErrors[field]
        ? 'border-red-300 focus:border-red-500'
        : 'border-slate-200 focus:border-brand-500'
    }`;

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
      <p className="mt-1 text-sm text-ink-500">Save your cart and track orders.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink-700">
            Full name
          </label>
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={form.name}
            onChange={(e) => setField('name')(e.target.value)}
            className={inputClass('name')}
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-red-700">{fieldErrors.name}</p>}
        </div>

        <div>
          <label htmlFor="identifier" className="mb-1 block text-sm font-medium text-ink-700">
            Email or phone number
          </label>
          <input
            id="identifier"
            type="text"
            required
            autoComplete="username"
            placeholder="you@example.com or 9876543210"
            value={form.identifier}
            onChange={(e) => setField('identifier')(e.target.value)}
            className={inputClass('identifier')}
          />
          {fieldErrors.identifier ? (
            <p className="mt-1 text-xs text-red-700">{fieldErrors.identifier}</p>
          ) : (
            <p className="mt-1 text-xs text-ink-500">
              Use whichever you&apos;ll remember — you&apos;ll sign in with the same one.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setField('password')(e.target.value)}
            className={inputClass('password')}
          />
          {fieldErrors.password ? (
            <p className="mt-1 text-xs text-red-700">{fieldErrors.password}</p>
          ) : (
            <p className="mt-1 text-xs text-ink-500">At least 8 characters.</p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-sm text-ink-500">
        Already registered?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
