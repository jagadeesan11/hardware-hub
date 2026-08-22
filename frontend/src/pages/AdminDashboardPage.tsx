import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as adminService from '../services/admin.service';
import type { AdminOrder, AdminStats } from '../services/admin.service';
import * as settingsService from '../services/settings.service';
import { ApiRequestError } from '../services/api';
import { formatOrderNumber, formatPrice } from '../lib/format';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/StatusBadge';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import type { Product } from '../types/catalog';
import type { OrderStatus } from '../types/order';

/** Mirrors the transitions the API will accept, so we never offer a dead button. */
const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

function StatCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone ?? ''}`}>{value}</p>
    </div>
  );
}

type ShipDraft = { orderId: string; trackingNumber: string; carrier: string };

function OrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  // Only set while the "Mark shipped" form is open for one order — shipping
  // details are optional, but worth a deliberate step rather than a blind click.
  const [shipDraft, setShipDraft] = useState<ShipDraft | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    adminService
      .getOrders()
      .then((data) => {
        setOrders(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load orders');
        setIsLoading(false);
      });
  }, []);

  useEffect(load, [load]);

  const changeStatus = async (
    id: string,
    status: OrderStatus,
    shipment?: { trackingNumber?: string; carrier?: string },
  ) => {
    setPendingId(id);
    setError(null);
    try {
      await adminService.updateOrderStatus(id, status, shipment);
      setShipDraft(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update order');
    } finally {
      setPendingId(null);
    }
  };

  if (isLoading) return <p className="py-10 text-center text-sm text-ink-500">Loading orders…</p>;

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <p className="font-medium">No orders yet.</p>
        <p className="mt-1 text-sm text-ink-500">Orders appear here as customers check out.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {orders.map((order) => {
        const isOpen = expanded === order.id;
        const nextStates = NEXT_STATUS[order.status];

        return (
          <div key={order.id} className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="text-sm font-semibold hover:text-brand-600"
                >
                  Order {formatOrderNumber(order.orderNumber)} {isOpen ? '▾' : '▸'}
                </button>
                <p className="mt-0.5 text-xs text-ink-500">
                  {order.user.name} · {order.user.email ?? order.user.phone ?? 'No contact on file'}
                </p>
                <p className="text-xs text-ink-500">
                  {new Date(order.createdAt).toLocaleString('en-IN')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
                <span className="text-sm font-bold tabular-nums">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
            </div>

            {isOpen && (
              <div className="space-y-4 border-t border-slate-200 p-4">
                <ul className="space-y-1 text-sm">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate">
                        {item.product.name} ({item.product.sku}) × {item.quantity}
                      </span>
                      <span className="tabular-nums">{formatPrice(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>

                <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-ink-700">
                  <p className="font-medium text-ink-900">Ship to</p>
                  {order.shippingAddress.fullName}, {order.shippingAddress.line1}
                  {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  {order.shippingAddress.pincode} · {order.shippingAddress.phone}
                </div>

                {order.statusHistory.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-ink-900">Tracking history</p>
                    <ul className="space-y-1 text-xs text-ink-500">
                      {order.statusHistory.map((event, i) => (
                        <li key={i} className="flex justify-between gap-3">
                          <span>{event.note ?? event.status}</span>
                          <span className="shrink-0 tabular-nums">
                            {new Date(event.createdAt).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {shipDraft?.orderId === order.id ? (
                  <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                    <p className="text-xs font-medium text-ink-900">Shipment details (optional)</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={shipDraft.carrier}
                        onChange={(e) => setShipDraft({ ...shipDraft, carrier: e.target.value })}
                        placeholder="Carrier, e.g. BlueDart"
                        className="rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
                      />
                      <input
                        value={shipDraft.trackingNumber}
                        onChange={(e) =>
                          setShipDraft({ ...shipDraft, trackingNumber: e.target.value })
                        }
                        placeholder="Tracking / AWB number"
                        className="rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pendingId === order.id}
                        onClick={() =>
                          void changeStatus(order.id, 'SHIPPED', {
                            trackingNumber: shipDraft.trackingNumber.trim() || undefined,
                            carrier: shipDraft.carrier.trim() || undefined,
                          })
                        }
                        className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
                      >
                        {pendingId === order.id ? 'Saving…' : 'Confirm shipment'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShipDraft(null)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : nextStates.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {nextStates.map((next) => (
                      <button
                        key={next}
                        type="button"
                        disabled={pendingId === order.id}
                        onClick={() =>
                          next === 'SHIPPED'
                            ? setShipDraft({ orderId: order.id, trackingNumber: '', carrier: '' })
                            : void changeStatus(order.id, next)
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                          next === 'CANCELLED'
                            ? 'border border-red-200 text-red-700 hover:bg-red-50'
                            : 'bg-brand-500 text-white hover:bg-brand-600'
                        }`}
                      >
                        {pendingId === order.id ? 'Saving…' : `Mark ${next.toLowerCase()}`}
                      </button>
                    ))}
                    {order.paymentStatus === 'PAID' && (
                      <span className="self-center text-xs text-ink-500">
                        Cancelling returns stock to the shelf.
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-ink-500">
                    This order is final — no further status changes.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Module scope, not nested inside CategoriesTab — a component declared inside
 * another is a new type every render, which would remount this row (and drop
 * focus from the rename input) on every keystroke. Same bug, fixed the same
 * way, as AdminProductFormPage's Field component.
 */
function CategoryRow({
  category,
  indent,
  isEditing,
  editName,
  isSaving,
  canDelete,
  isDeleting,
  readOnly,
  onStartEdit,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  category: adminService.AdminCategory;
  indent: boolean;
  isEditing: boolean;
  editName: string;
  isSaving: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  /** Shop owners can see the taxonomy but not restructure it — app owner only. */
  readOnly: boolean;
  onStartEdit: () => void;
  onEditNameChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 ${indent ? 'pl-10' : ''}`}>
      {isEditing && !readOnly ? (
        <div className="flex flex-1 items-center gap-2">
          <input
            autoFocus
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            className="w-full max-w-xs rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={isSaving}
            onClick={onSaveEdit}
            className="rounded-md bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium text-ink-900">{category.name}</span>
            <span className="ml-2 text-xs text-ink-500">
              {category.productCount} product{category.productCount === 1 ? '' : 's'}
              {category.childCount > 0
                ? ` · ${category.childCount} subcategor${category.childCount === 1 ? 'y' : 'ies'}`
                : ''}
            </span>
          </div>
          {readOnly ? (
            <span className="shrink-0 text-xs text-ink-500">View only</span>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onStartEdit}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
              >
                Rename
              </button>
              <button
                type="button"
                disabled={!canDelete || isDeleting}
                title={canDelete ? undefined : 'Move or delist its products and subcategories first'}
                onClick={onDelete}
                className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CategoriesTab({ readOnly }: { readOnly: boolean }) {
  const [categories, setCategories] = useState<adminService.AdminCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    adminService
      .getCategories()
      .then((data) => {
        setCategories(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load categories');
        setIsLoading(false);
      });
  }, []);

  useEffect(load, [load]);

  const roots = categories.filter((c) => c.parentId === null);
  const childrenOf = (parentId: string) => categories.filter((c) => c.parentId === parentId);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (newName.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      await adminService.createCategory({ name: newName.trim(), parentId: newParentId || null });
      setNewName('');
      setNewParentId('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create category');
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (category: adminService.AdminCategory) => {
    setEditingId(category.id);
    setEditName(category.name);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async (id: string) => {
    if (editName.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await adminService.updateCategory(id, { name: editName.trim() });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: adminService.AdminCategory) => {
    setDeletingId(category.id);
    setError(null);
    try {
      await adminService.deleteCategory(category.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete category');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return <p className="py-10 text-center text-sm text-ink-500">Loading categories…</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {readOnly ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Categories are set by the app owner. You can see the full structure below and use it
          when adding products, but renaming, adding, or deleting categories isn&apos;t available
          on this account.
        </p>
      ) : (
        <>
          <form
            onSubmit={handleCreate}
            className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="min-w-48 flex-1">
              <label
                htmlFor="newCategoryName"
                className="mb-1 block text-sm font-medium text-ink-700"
              >
                New category
              </label>
              <input
                id="newCategoryName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Electrical Fittings"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="newCategoryParent"
                className="mb-1 block text-sm font-medium text-ink-700"
              >
                Parent (optional)
              </label>
              <select
                id="newCategoryParent"
                value={newParentId}
                onChange={(e) => setNewParentId(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="">None — top level</option>
                {roots.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {isCreating ? 'Adding…' : 'Add category'}
            </button>
          </form>

          <p className="text-xs text-ink-500">
            Categories nest one level deep — pick a parent to create a subcategory, or leave it
            blank for a top-level category like &ldquo;Doors&rdquo; or &ldquo;Paints&rdquo;.
          </p>
        </>
      )}

      <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {roots.length === 0 && (
          <p className="p-8 text-center text-sm text-ink-500">No categories yet.</p>
        )}
        {roots.map((root) => (
          <div key={root.id} className="divide-y divide-slate-100">
            <CategoryRow
              category={root}
              indent={false}
              isEditing={editingId === root.id}
              editName={editName}
              isSaving={isSaving}
              canDelete={root.productCount === 0 && root.childCount === 0}
              isDeleting={deletingId === root.id}
              readOnly={readOnly}
              onStartEdit={() => startEdit(root)}
              onEditNameChange={setEditName}
              onSaveEdit={() => void saveEdit(root.id)}
              onCancelEdit={cancelEdit}
              onDelete={() => void handleDelete(root)}
            />
            {childrenOf(root.id).map((child) => (
              <CategoryRow
                key={child.id}
                category={child}
                indent
                isEditing={editingId === child.id}
                editName={editName}
                isSaving={isSaving}
                canDelete={child.productCount === 0 && child.childCount === 0}
                isDeleting={deletingId === child.id}
                readOnly={readOnly}
                onStartEdit={() => startEdit(child)}
                onEditNameChange={setEditName}
                onSaveEdit={() => void saveEdit(child.id)}
                onCancelEdit={cancelEdit}
                onDelete={() => void handleDelete(child)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [onlyLow, setOnlyLow] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    adminService
      .getProducts()
      .then((data) => {
        setProducts(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load products');
        setIsLoading(false);
      });
  }, []);

  const save = async (id: string) => {
    const raw = drafts[id];
    if (raw === undefined) return;

    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
      setError('Stock must be a whole number of 0 or more.');
      return;
    }

    setSavingId(id);
    setError(null);
    try {
      const updated = await adminService.updateStock(id, value);
      setProducts((current) =>
        current.map((p) => (p.id === id ? { ...p, stockQty: updated.stockQty } : p)),
      );
      setDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setSavedId(id);
      setTimeout(() => setSavedId(null), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update stock');
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) return <p className="py-10 text-center text-sm text-ink-500">Loading products…</p>;

  const query = search.trim().toLowerCase();
  const visible = products
    .filter((p) => (onlyLow ? p.stockQty <= 10 : true))
    .filter((p) =>
      query
        ? p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query)
        : true,
    );

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name or SKU"
            aria-label="Filter products"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={onlyLow}
              onChange={(e) => setOnlyLow(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-brand-500"
            />
            Low stock only (10 or fewer)
          </label>
        </div>

        <Link
          to="/admin/products/new"
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Add product
        </Link>
      </div>

      <p className="text-xs text-ink-500">
        Showing {visible.length} of {products.length} products
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-200 text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Quick stock</th>
              <th className="px-4 py-3 font-medium">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visible.map((product) => {
              const draft = drafts[product.id];
              const isDirty = draft !== undefined && Number(draft) !== product.stockQty;

              return (
                <tr key={product.id} className={product.isActive ? '' : 'opacity-50'}>
                  <td className="px-4 py-3">
                    <Link to={`/products/${product.slug}`} className="hover:text-brand-600">
                      {product.name}
                    </Link>
                    {!product.isActive && (
                      <span className="ml-2 text-xs text-red-700">delisted</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-500">{product.sku}</td>
                  <td className="px-4 py-3 tabular-nums">{formatPrice(product.price)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold tabular-nums ${
                        product.stockQty === 0
                          ? 'text-red-700'
                          : product.stockQty <= 10
                            ? 'text-amber-700'
                            : 'text-ink-900'
                      }`}
                    >
                      {product.stockQty}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        aria-label={`New stock for ${product.name}`}
                        value={draft ?? String(product.stockQty)}
                        onChange={(e) =>
                          setDrafts((current) => ({ ...current, [product.id]: e.target.value }))
                        }
                        className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={!isDirty || savingId === product.id}
                        onClick={() => void save(product.id)}
                        className="rounded-md bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-40"
                      >
                        {savingId === product.id
                          ? 'Saving…'
                          : savedId === product.id
                            ? 'Saved'
                            : 'Save'}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/products/${product.id}/edit`}
                      className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-ink-500">
          No products match those filters.
        </p>
      )}
    </div>
  );
}

type SettingsFormState = {
  shopName: string;
  gstNumber: string;
  phone: string;
  email: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  district: string;
  landmark: string;
};

const EMPTY_SETTINGS_FORM: SettingsFormState = {
  shopName: '',
  gstNumber: '',
  phone: '',
  email: '',
  addressLine1: '',
  city: '',
  state: '',
  pincode: '',
  district: '',
  landmark: '',
};

function SettingsTab({ readOnly }: { readOnly: boolean }) {
  const { settings, isLoading: isLoadingSettings, fetch: refetchSettings } = useSettingsStore();
  const [form, setForm] = useState<SettingsFormState>(EMPTY_SETTINGS_FORM);
  // Tracks whether the form has been populated from the loaded settings yet,
  // so a background refetch after saving doesn't clobber what's being typed.
  const [hydrated, setHydrated] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!settings || hydrated) return;
    setForm({
      shopName: settings.shopName,
      gstNumber: settings.gstNumber ?? '',
      phone: settings.phone,
      email: settings.email,
      addressLine1: settings.addressLine1,
      city: settings.city,
      state: settings.state,
      pincode: settings.pincode,
      district: settings.district ?? '',
      landmark: settings.landmark ?? '',
    });
    setHydrated(true);
  }, [settings, hydrated]);

  const set = <K extends keyof SettingsFormState>(key: K, value: SettingsFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    setError(null);
    setFieldErrors({});
    setIsSaving(true);

    try {
      await settingsService.updateSettings({
        shopName: form.shopName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        addressLine1: form.addressLine1.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        // Empty optional strings are omitted, not sent as "" — the backend
        // treats an omitted field as "leave unchanged/absent", not a wipe.
        ...(form.gstNumber.trim() ? { gstNumber: form.gstNumber.trim() } : {}),
        ...(form.district.trim() ? { district: form.district.trim() } : {}),
        ...(form.landmark.trim() ? { landmark: form.landmark.trim() } : {}),
      });
      // Re-pulls from the server so the header/footer everywhere else in the
      // app pick up the change immediately, not just this form.
      await refetchSettings();
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    } catch (err) {
      if (err instanceof ApiRequestError && Array.isArray(err.details)) {
        const mapped: Record<string, string> = {};
        for (const issue of err.details as { path: string; message: string }[]) {
          mapped[issue.path] = issue.message;
        }
        setFieldErrors(mapped);
        setError('Please correct the highlighted fields.');
      } else {
        setError(err instanceof Error ? err.message : 'Could not save settings');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
      fieldErrors[field]
        ? 'border-red-300 focus:border-red-500'
        : 'border-slate-200 focus:border-brand-500'
    }`;

  const field = (
    key: keyof SettingsFormState,
    label: string,
    opts: { hint?: string; required?: boolean; placeholder?: string } = {},
  ) => (
    <div>
      <label htmlFor={key} className="mb-1 block text-sm font-medium text-ink-700">
        {label} {opts.required === false && <span className="text-ink-500">(optional)</span>}
      </label>
      <input
        id={key}
        value={form[key]}
        placeholder={opts.placeholder}
        disabled={readOnly}
        onChange={(e) => set(key, e.target.value)}
        className={`${inputClass(key)} ${readOnly ? 'cursor-not-allowed bg-slate-50 text-ink-500' : ''}`}
      />
      {fieldErrors[key] ? (
        <p className="mt-1 text-xs text-red-700">{fieldErrors[key]}</p>
      ) : opts.hint ? (
        <p className="mt-1 text-xs text-ink-500">{opts.hint}</p>
      ) : null}
    </div>
  );

  // Driven by the store's own isLoading, not the local `hydrated` flag —
  // `hydrated` only ever flips true once real settings exist, so on a fresh
  // database (nothing configured yet, settings genuinely null) it never
  // would, leaving this stuck on "Loading…" forever even after the fetch
  // had already finished and correctly determined there's nothing there.
  if (isLoadingSettings) {
    return <p className="py-10 text-center text-sm text-ink-500">Loading shop settings…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {readOnly && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Shop settings are set by the app owner. You can view them here, but editing isn&apos;t
          available on this account.
        </p>
      )}

      {!settings && !readOnly && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Not configured yet. These details show up publicly in the site footer and on order
          pages once saved.
        </p>
      )}

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold">Business identity</h2>
        {field('shopName', 'Shop name')}
        {field('gstNumber', 'GSTIN', {
          required: false,
          hint: '15 characters, e.g. 33DWGPK8339P1ZT. Shown on order pages when set.',
          placeholder: '33ABCDE1234F1Z5',
        })}
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <h2 className="col-span-full text-sm font-semibold">Contact</h2>
        {field('phone', 'Phone', { placeholder: '10-digit mobile' })}
        {field('email', 'Email')}
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold">Address</h2>
        {field('addressLine1', 'Address', { placeholder: 'Door no., street' })}
        <div className="grid gap-4 sm:grid-cols-2">
          {field('city', 'City / Town')}
          {field('district', 'District', { required: false })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('state', 'State')}
          {field('pincode', 'PIN code', { placeholder: '6 digits' })}
        </div>
        {field('landmark', 'Landmark', { required: false })}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!readOnly && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save shop settings'}
          </button>
          {savedAt && (
            <span className="text-sm text-emerald-700">Saved — live on the site now.</span>
          )}
        </div>
      )}
    </form>
  );
}

const ROLE_OPTIONS: { value: 'CUSTOMER' | 'SHOP_OWNER' | 'ADMIN'; label: string }[] = [
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'SHOP_OWNER', label: 'Shop owner' },
  { value: 'ADMIN', label: 'App owner' },
];

type NewUserForm = { name: string; identifier: string; password: string; role: string };

function UsersTab() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [users, setUsers] = useState<adminService.AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // One row can have one action in flight at a time — role change, edit save,
  // password reset, or delete — so a single flag per row is enough.
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [form, setForm] = useState<NewUserForm>({
    name: '',
    identifier: '',
    password: '',
    role: 'SHOP_OWNER',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [createdMsg, setCreatedMsg] = useState<string | null>(null);

  // Row-level modes. Only one row is ever in edit/reset/confirm-delete at a
  // time in practice, but each is keyed by id rather than assumed exclusive.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', identifier: '' });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    adminService
      .getUsers()
      .then((data) => {
        setUsers(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load users');
        setIsLoading(false);
      });
  }, []);

  useEffect(load, [load]);

  const closeRowModes = () => {
    setEditingId(null);
    setResettingId(null);
    setConfirmDeleteId(null);
    setResetError(null);
  };

  const handleRoleChange = async (userId: string, role: string) => {
    setPendingId(userId);
    setError(null);
    try {
      await adminService.updateUserRole(userId, role as 'CUSTOMER' | 'SHOP_OWNER' | 'ADMIN');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change role');
    } finally {
      setPendingId(null);
    }
  };

  const startEdit = (u: adminService.AdminUser) => {
    closeRowModes();
    setEditingId(u.id);
    setEditForm({ name: u.name, identifier: u.email ?? u.phone ?? '' });
    setEditErrors({});
  };

  const saveEdit = async (userId: string) => {
    setPendingId(userId);
    setEditErrors({});
    setError(null);
    try {
      await adminService.updateUser(userId, {
        name: editForm.name.trim(),
        identifier: editForm.identifier.trim(),
      });
      setEditingId(null);
      load();
    } catch (err) {
      if (err instanceof ApiRequestError && Array.isArray(err.details)) {
        const mapped: Record<string, string> = {};
        for (const issue of err.details as { path: string; message: string }[]) {
          mapped[issue.path] = issue.message;
        }
        setEditErrors(mapped);
      } else {
        setError(err instanceof Error ? err.message : 'Could not save changes');
      }
    } finally {
      setPendingId(null);
    }
  };

  const startReset = (userId: string) => {
    closeRowModes();
    setResettingId(userId);
    setNewPassword('');
  };

  const submitReset = async (userId: string) => {
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }
    setPendingId(userId);
    setResetError(null);
    try {
      await adminService.resetUserPassword(userId, newPassword);
      setResettingId(null);
      setNewPassword('');
      setResetMsg(userId);
      setTimeout(() => setResetMsg(null), 3000);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Could not reset password');
    } finally {
      setPendingId(null);
    }
  };

  const confirmDelete = async (userId: string) => {
    setPendingId(userId);
    setError(null);
    try {
      await adminService.deleteUser(userId);
      setConfirmDeleteId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete user');
      setConfirmDeleteId(null);
    } finally {
      setPendingId(null);
    }
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setCreatedMsg(null);
    setIsCreating(true);

    try {
      const created = await adminService.createUser({
        name: form.name.trim(),
        identifier: form.identifier.trim(),
        password: form.password,
        role: form.role as 'CUSTOMER' | 'SHOP_OWNER' | 'ADMIN',
      });
      setForm({ name: '', identifier: '', password: '', role: 'SHOP_OWNER' });
      setCreatedMsg(`${created.name} can now sign in with ${created.email ?? created.phone}.`);
      load();
    } catch (err) {
      if (err instanceof ApiRequestError && Array.isArray(err.details)) {
        const mapped: Record<string, string> = {};
        for (const issue of err.details as { path: string; message: string }[]) {
          mapped[issue.path] = issue.message;
        }
        setFieldErrors(mapped);
        setError(Object.keys(mapped).length ? null : err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Could not create user');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
      fieldErrors[field]
        ? 'border-red-300 focus:border-red-500'
        : 'border-slate-200 focus:border-brand-500'
    }`;

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold">Create a user</h2>
        <p className="mt-1 text-xs text-ink-500">
          This is how a shop owner account actually gets made — set them up directly with a
          password, and hand it to them. There is no email-verification step.
        </p>

        <form onSubmit={handleCreate} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="newUserName" className="mb-1 block text-sm font-medium text-ink-700">
              Full name
            </label>
            <input
              id="newUserName"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass('name')}
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-700">{fieldErrors.name}</p>}
          </div>

          <div>
            <label
              htmlFor="newUserIdentifier"
              className="mb-1 block text-sm font-medium text-ink-700"
            >
              Email or phone number
            </label>
            <input
              id="newUserIdentifier"
              placeholder="you@example.com or 9876543210"
              value={form.identifier}
              onChange={(e) => setForm((f) => ({ ...f, identifier: e.target.value }))}
              className={inputClass('identifier')}
            />
            {fieldErrors.identifier && (
              <p className="mt-1 text-xs text-red-700">{fieldErrors.identifier}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="newUserPassword"
              className="mb-1 block text-sm font-medium text-ink-700"
            >
              Starting password
            </label>
            <input
              id="newUserPassword"
              type="text"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className={inputClass('password')}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-700">{fieldErrors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="newUserRole" className="mb-1 block text-sm font-medium text-ink-700">
              Role
            </label>
            <select
              id="newUserRole"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className={inputClass('role')}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {isCreating ? 'Creating…' : 'Create user'}
            </button>
            {createdMsg && <span className="ml-3 text-sm text-emerald-700">{createdMsg}</span>}
          </div>
        </form>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">All users</h2>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-ink-500">Loading users…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-200 text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isPending = pendingId === u.id;
                  const isEditingRow = editingId === u.id;

                  if (isEditingRow) {
                    return (
                      <tr key={u.id} className="bg-slate-50">
                        <td className="px-4 py-3">
                          <input
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, name: e.target.value }))
                            }
                            className={`w-full rounded-md border px-2 py-1 text-sm focus:outline-none ${
                              editErrors.name
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-slate-200 focus:border-brand-500'
                            }`}
                          />
                          {editErrors.name && (
                            <p className="mt-1 text-xs text-red-700">{editErrors.name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3" colSpan={2}>
                          <input
                            value={editForm.identifier}
                            placeholder="Email or phone number"
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, identifier: e.target.value }))
                            }
                            className={`w-full rounded-md border px-2 py-1 text-sm focus:outline-none ${
                              editErrors.identifier
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-slate-200 focus:border-brand-500'
                            }`}
                          />
                          {editErrors.identifier && (
                            <p className="mt-1 text-xs text-red-700">{editErrors.identifier}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink-500">{ROLE_OPTIONS.find((o) => o.value === u.role)?.label}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => void saveEdit(u.id)}
                              className="rounded-md bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                            >
                              {isPending ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={u.id}>
                      <td className="px-4 py-3 font-medium text-ink-900">
                        {u.name} {isSelf && <span className="text-xs text-ink-500">(you)</span>}
                      </td>
                      <td className="px-4 py-3 text-ink-700">{u.email ?? u.phone}</td>
                      <td className="px-4 py-3 text-ink-500">
                        {new Date(u.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          disabled={isPending || isSelf}
                          title={isSelf ? "You can't change your own role" : undefined}
                          onChange={(e) => void handleRoleChange(u.id, e.target.value)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none disabled:opacity-50"
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {confirmDeleteId === u.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-red-700">Delete this account?</span>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => void confirmDelete(u.id)}
                              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {isPending ? 'Deleting…' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : resettingId === u.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              autoFocus
                              placeholder="New password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className={`w-32 rounded-md border px-2 py-1 text-xs focus:outline-none ${
                                resetError
                                  ? 'border-red-300 focus:border-red-500'
                                  : 'border-slate-200 focus:border-brand-500'
                              }`}
                            />
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => void submitReset(u.id)}
                              className="rounded-md bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                            >
                              {isPending ? 'Setting…' : 'Set'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setResettingId(null)}
                              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            {resetError && <p className="w-full text-xs text-red-700">{resetError}</p>}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(u)}
                              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => startReset(u.id)}
                              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
                            >
                              {resetMsg === u.id ? 'Password set ✓' : 'Reset password'}
                            </button>
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => {
                                  closeRowModes();
                                  setConfirmDeleteId(u.id);
                                }}
                                className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  // Shop owners get full control over products and orders, but categories
  // and settings are app-owner-only — see requireAppOwner on the backend.
  const isAppOwner = user?.role === 'ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();
  // 'stock' is kept as an alias so older bookmarks still land on the right tab.
  const rawTab = searchParams.get('tab');
  const tab =
    rawTab === 'products' || rawTab === 'stock'
      ? 'products'
      : rawTab === 'categories'
        ? 'categories'
        : rawTab === 'settings'
          ? 'settings'
          : // Users management is app-owner only; a shop owner hitting this URL
            // directly falls back to Orders rather than a 403'd blank tab.
            rawTab === 'users' && isAppOwner
            ? 'users'
            : 'orders';

  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    adminService.getStats().then(setStats).catch(() => setStats(null));
    // Refetched when the tab changes so numbers reflect edits just made.
  }, [tab]);

  const tabClass = (name: string) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      tab === name ? 'bg-brand-500 text-white' : 'text-ink-700 hover:bg-slate-100'
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Admin dashboard</h1>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            isAppOwner ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-ink-700'
          }`}
        >
          {isAppOwner ? 'App owner' : 'Shop owner'}
        </span>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Revenue" value={formatPrice(stats.revenue)} />
          <StatCard label="Orders" value={String(stats.totalOrders)} />
          <StatCard
            label="Low stock"
            value={String(stats.lowStockCount)}
            tone={stats.lowStockCount > 0 ? 'text-amber-700' : undefined}
          />
          <StatCard label="Customers" value={String(stats.customers)} />
        </div>
      )}

      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button type="button" onClick={() => setSearchParams({})} className={tabClass('orders')}>
          Orders
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'products' })}
          className={tabClass('products')}
        >
          Products
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'categories' })}
          className={tabClass('categories')}
        >
          Categories
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'settings' })}
          className={tabClass('settings')}
        >
          Settings
        </button>
        {isAppOwner && (
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'users' })}
            className={tabClass('users')}
          >
            Users
          </button>
        )}
      </div>

      {tab === 'orders' ? (
        <OrdersTab />
      ) : tab === 'categories' ? (
        <CategoriesTab readOnly={!isAppOwner} />
      ) : tab === 'settings' ? (
        <SettingsTab readOnly={!isAppOwner} />
      ) : tab === 'users' ? (
        <UsersTab />
      ) : (
        <ProductsTab />
      )}
    </div>
  );
}
