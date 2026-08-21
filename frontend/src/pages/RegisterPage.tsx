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

  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
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
        email: form.email,
        password: form.password,
        // Empty string would fail the backend's 10-digit check; omit instead.
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
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

  const fields = [
    { key: 'name' as const, label: 'Full name', type: 'text', autoComplete: 'name', required: true },
    { key: 'email' as const, label: 'Email', type: 'email', autoComplete: 'email', required: true },
    {
      key: 'phone' as const,
      label: 'Phone (optional)',
      type: 'tel',
      autoComplete: 'tel',
      required: false,
    },
    {
      key: 'password' as const,
      label: 'Password',
      type: 'password',
      autoComplete: 'new-password',
      required: true,
    },
  ];

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
      <p className="mt-1 text-sm text-ink-500">Save your cart and track orders.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label htmlFor={field.key} className="mb-1 block text-sm font-medium text-ink-700">
              {field.label}
            </label>
            <input
              id={field.key}
              type={field.type}
              required={field.required}
              autoComplete={field.autoComplete}
              value={form[field.key]}
              onChange={(e) => setField(field.key)(e.target.value)}
              className={inputClass(field.key)}
              {...(field.key === 'phone' ? { placeholder: '10-digit mobile' } : {})}
            />
            {fieldErrors[field.key] && (
              <p className="mt-1 text-xs text-red-700">{fieldErrors[field.key]}</p>
            )}
            {field.key === 'password' && !fieldErrors.password && (
              <p className="mt-1 text-xs text-ink-500">At least 8 characters.</p>
            )}
          </div>
        ))}

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
