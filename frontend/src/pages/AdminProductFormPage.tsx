import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as adminService from '../services/admin.service';
import type { ProductInput } from '../services/admin.service';
import { ApiRequestError } from '../services/api';
import { useCategories } from '../hooks/useCatalog';
import { formatPrice } from '../lib/format';
import type { Category } from '../types/catalog';

type FormState = {
  name: string;
  categoryId: string;
  description: string;
  price: string;
  stockQty: string;
  sku: string;
  size: string;
  material: string;
  images: string[];
  isActive: boolean;
  slug: string;
};

const EMPTY: FormState = {
  name: '',
  categoryId: '',
  description: '',
  price: '',
  stockQty: '0',
  sku: '',
  size: '',
  material: '',
  images: [],
  isActive: true,
  slug: '',
};

/**
 * Defined at module scope, NOT inside the page component. A component declared
 * inside another is a new type on every render, so React unmounts and remounts
 * its subtree each keystroke — the input would lose focus after every character.
 */
function Field({
  name,
  label,
  hint,
  errors,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  errors: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-ink-700">
        {label}
      </label>
      {children}
      {errors[name] ? (
        <p className="mt-1 text-xs text-red-700">{errors[name]}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

/** Flattens the tree into option rows, indenting children under their parent. */
const flatten = (categories: Category[]): { id: string; label: string; isParent: boolean }[] =>
  categories.flatMap((parent) => [
    { id: parent.id, label: parent.name, isParent: true },
    ...parent.children.map((child) => ({ id: child.id, label: `  ${child.name}`, isParent: false })),
  ]);

export default function AdminProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    adminService
      .getProduct(id)
      .then((product) => {
        setForm({
          name: product.name,
          categoryId: product.category.id,
          description: product.description ?? '',
          price: String(product.price),
          stockQty: String(product.stockQty),
          sku: product.sku,
          size: product.size ?? '',
          material: product.material ?? '',
          images: product.images,
          isActive: product.isActive,
          slug: product.slug,
        });
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load product');
        setIsLoading(false);
      });
  }, [id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  /** Mirrors the backend rules so the obvious mistakes never leave the browser. */
  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
    if (!form.categoryId) errors.categoryId = 'Choose a category';
    if (!form.sku.trim()) errors.sku = 'SKU is required';

    const price = Number(form.price);
    if (form.price === '' || Number.isNaN(price)) errors.price = 'Enter a price';
    else if (price < 0) errors.price = 'Price cannot be negative';
    else if ((form.price.split('.')[1]?.length ?? 0) > 2)
      errors.price = 'At most 2 decimal places';

    const stock = Number(form.stockQty);
    if (!Number.isInteger(stock) || stock < 0) errors.stockQty = 'Whole number, 0 or more';

    for (const url of form.images) {
      try {
        new URL(url);
      } catch {
        errors.images = `Not a valid URL: ${url}`;
        break;
      }
    }

    return errors;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);

    // Empty optional strings must be omitted, not sent as "" — the backend
    // treats an empty string as a value and rejects it on min-length rules.
    const payload: ProductInput = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      price: Number(form.price),
      stockQty: Number(form.stockQty),
      sku: form.sku.trim().toUpperCase(),
      images: form.images,
      isActive: form.isActive,
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      ...(form.size.trim() ? { size: form.size.trim() } : {}),
      ...(form.material.trim() ? { material: form.material.trim() } : {}),
    };

    try {
      if (isEdit && id) {
        // Renaming does not move the slug server-side; send it only if edited.
        await adminService.updateProduct(id, { ...payload, slug: form.slug.trim() || undefined });
        setSavedAt(Date.now());
        setIsSaving(false);
      } else {
        const created = await adminService.createProduct(payload);
        navigate(`/admin/products/${created.id}/edit?created=1`, { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiRequestError && Array.isArray(err.details)) {
        const mapped: Record<string, string> = {};
        for (const issue of err.details as { path: string; message: string }[]) {
          mapped[issue.path] = issue.message;
        }
        setFieldErrors(mapped);
        setError('Please correct the highlighted fields.');
      } else {
        setError(err instanceof Error ? err.message : 'Could not save product');
      }
      setIsSaving(false);
    }
  };

  const handleDelist = async () => {
    if (!id) return;
    setIsSaving(true);
    setError(null);
    try {
      if (form.isActive) {
        await adminService.delistProduct(id);
        set('isActive', false);
      } else {
        await adminService.relistProduct(id);
        set('isActive', true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change listing');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-ink-500">Loading product…</div>;
  }

  const inputClass = (field: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
      fieldErrors[field]
        ? 'border-red-300 focus:border-red-500'
        : 'border-slate-200 focus:border-brand-500'
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin?tab=products" className="text-sm text-ink-500 hover:text-ink-900">
            ← Back to products
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {isEdit ? 'Edit product' : 'Add product'}
          </h1>
        </div>

        {isEdit && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              form.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {form.isActive ? 'Listed' : 'Delisted'}
          </span>
        )}
      </div>

      {savedAt && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Saved. Changes are live on the storefront.
        </p>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <Field errors={fieldErrors} name="name" label="Product name">
            <input
              id="name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={inputClass('name')}
              placeholder="Teak Wood Panel Door 32mm"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field errors={fieldErrors} name="categoryId" label="Category">
              <select
                id="categoryId"
                value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                disabled={categoriesLoading}
                className={inputClass('categoryId')}
              >
                <option value="">Select a category…</option>
                {flatten(categories ?? []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field errors={fieldErrors} name="sku" label="SKU" hint="Unique. Uppercased on save.">
              <input
                id="sku"
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                className={inputClass('sku')}
                placeholder="DR-TEAK-32"
              />
            </Field>
          </div>

          <Field errors={fieldErrors} name="description" label="Description">
            <textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className={inputClass('description')}
              placeholder="Solid Burma teak panel door with natural grain finish."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field errors={fieldErrors} name="size" label="Size (optional)">
              <input
                id="size"
                value={form.size}
                onChange={(e) => set('size', e.target.value)}
                className={inputClass('size')}
                placeholder="7ft x 3ft"
              />
            </Field>

            <Field errors={fieldErrors} name="material" label="Material (optional)">
              <input
                id="material"
                value={form.material}
                onChange={(e) => set('material', e.target.value)}
                className={inputClass('material')}
                placeholder="Burma Teak"
              />
            </Field>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium text-ink-700">Image URLs (optional)</p>
            <div className="space-y-2">
              {form.images.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    value={url}
                    aria-label={`Image URL ${index + 1}`}
                    onChange={(e) =>
                      set(
                        'images',
                        form.images.map((u, i) => (i === index ? e.target.value : u)),
                      )
                    }
                    className={inputClass('images')}
                    placeholder="https://…"
                  />
                  <button
                    type="button"
                    onClick={() => set('images', form.images.filter((_, i) => i !== index))}
                    className="rounded-lg border border-slate-200 px-3 text-sm text-ink-500 hover:bg-slate-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {fieldErrors.images && (
              <p className="mt-1 text-xs text-red-700">{fieldErrors.images}</p>
            )}

            {form.images.length < 8 && (
              <button
                type="button"
                onClick={() => set('images', [...form.images, ''])}
                className="mt-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
              >
                Add image URL
              </button>
            )}
            <p className="mt-1 text-xs text-ink-500">
              Hosted image links. Products without images show their initials.
            </p>
          </div>
        </div>

        <aside className="h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <Field errors={fieldErrors} name="price" label="Price (₹)" hint="At most 2 decimal places.">
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              className={inputClass('price')}
              placeholder="18500"
            />
          </Field>

          {form.price !== '' && !Number.isNaN(Number(form.price)) && (
            <p className="text-sm text-ink-500">
              Shows as <span className="font-semibold">{formatPrice(Number(form.price))}</span>
            </p>
          )}

          <Field errors={fieldErrors} name="stockQty" label="Stock quantity">
            <input
              id="stockQty"
              type="number"
              min="0"
              value={form.stockQty}
              onChange={(e) => set('stockQty', e.target.value)}
              className={inputClass('stockQty')}
            />
          </Field>

          {isEdit && (
            <Field errors={fieldErrors} name="slug" label="URL slug" hint="Changing this breaks existing links.">
              <input
                id="slug"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                className={inputClass('slug')}
              />
            </Field>
          )}

          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-brand-500"
            />
            Listed on the storefront
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
          </button>

          {isEdit && (
            <button
              type="button"
              onClick={() => void handleDelist()}
              disabled={isSaving}
              className={`w-full rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                form.isActive
                  ? 'border-red-200 text-red-700 hover:bg-red-50'
                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {form.isActive ? 'Delist from storefront' : 'Relist on storefront'}
            </button>
          )}

          {isEdit && form.isActive && (
            <p className="text-xs text-ink-500">
              Delisting hides the product from shoppers. Past orders keep working.
            </p>
          )}
        </aside>
      </form>
    </div>
  );
}
