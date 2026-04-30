'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import {
  ShopDashboard,
  ShopProduct,
  ShopOrder,
  ShopOrderStatus,
  ShopPaymentStatus,
  CreateProductRequest,
  UpdateProductRequest,
  AddTrackingEventRequest,
} from '../lib/types';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import MobileDataCard from '../components/MobileDataCard';
import { PageLoader } from '../components/LoadingSpinner';
import Tabs, { TabItem } from '../components/Tabs';
import { useAlert } from '../context/AlertContext';

// ─── helpers ─────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

const formatSafeDate = (dateStr: string | undefined): string => {
  try {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
};

const ORDER_STATUS_COLORS: Record<ShopOrderStatus, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400',
  confirmed: 'bg-blue-500/10 text-blue-400',
  processing: 'bg-indigo-500/10 text-indigo-400',
  shipped: 'bg-cyan-500/10 text-cyan-400',
  delivered: 'bg-emerald-500/10 text-emerald-400',
  cancelled: 'bg-red-500/10 text-red-400',
};

const ORDER_STATUS_BADGE: Record<ShopOrderStatus, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger',
};

const PAYMENT_STATUS_BADGE: Record<ShopPaymentStatus, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  unpaid: 'warning',
  paid: 'success',
  refunded: 'neutral',
};

const ORDER_STATUSES: ShopOrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

type ShopTab = 'dashboard' | 'products' | 'orders';

// ─── Product Modal ────────────────────────────────────────────────────

function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: ShopProduct | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showAlert } = useAlert();
  const isEdit = !!product;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateProductRequest>({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product?.price ?? 0,
    stock_quantity: product?.stock_quantity ?? 0,
    image_url: product?.image_url ?? '',
    category: product?.category ?? '',
    is_active: product?.is_active ?? true,
  });

  const set = (k: keyof CreateProductRequest, v: string | number | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload: UpdateProductRequest = {
        ...form,
        description: form.description || null,
        image_url: form.image_url || null,
        category: form.category || null,
      };
      if (isEdit) {
        await api.updateShopProduct(product!.id, payload);
        showAlert('success', 'Product updated');
      } else {
        await api.createShopProduct(payload as CreateProductRequest);
        showAlert('success', 'Product created');
      }
      onSaved();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-background-secondary rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">{isEdit ? 'Edit Product' : 'New Product'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-background-tertiary text-foreground-muted">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">Product Name *</label>
            <input
              required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="input w-full"
              placeholder="e.g. Mikrotik hAP ac²"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">Description</label>
            <textarea
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="input w-full resize-none"
              placeholder="Short product description…"
            />
          </div>

          {/* Price + Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1.5">Price (KES) *</label>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={e => set('price', parseFloat(e.target.value) || 0)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1.5">Stock Qty</label>
              <input
                type="number"
                min={0}
                value={form.stock_quantity ?? 0}
                onChange={e => set('stock_quantity', parseInt(e.target.value) || 0)}
                className="input w-full"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">Category</label>
            <input
              value={form.category ?? ''}
              onChange={e => set('category', e.target.value)}
              className="input w-full"
              placeholder="e.g. Routers, Cables, Tools"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">Image URL</label>
            <input
              value={form.image_url ?? ''}
              onChange={e => set('image_url', e.target.value)}
              className="input w-full"
              placeholder="https://cdn.example.com/image.jpg"
            />
          </div>

          {/* Active */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-background-tertiary">
            <div
              onClick={() => set('is_active', !form.is_active)}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-accent-primary' : 'bg-border'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
            </div>
            <div>
              <span className="text-sm font-medium text-foreground">Active</span>
              <p className="text-xs text-foreground-muted">Visible in the public store</p>
            </div>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Order Detail Modal ───────────────────────────────────────────────

function OrderDetailModal({
  order,
  onClose,
  onStatusUpdated,
}: {
  order: ShopOrder;
  onClose: () => void;
  onStatusUpdated: (id: number, status: ShopOrderStatus) => void;
}) {
  const { showAlert } = useAlert();
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [addingTracking, setAddingTracking] = useState(false);
  const [trackingForm, setTrackingForm] = useState<AddTrackingEventRequest>({ status_label: '', note: '' });
  const [showTrackingForm, setShowTrackingForm] = useState(false);

  const handleStatusChange = async (status: ShopOrderStatus) => {
    setUpdatingStatus(true);
    try {
      await api.updateShopOrderStatus(order.id, status);
      onStatusUpdated(order.id, status);
      showAlert('success', 'Order status updated');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingForm.status_label.trim()) return;
    setAddingTracking(true);
    try {
      await api.addShopTrackingEvent(order.id, {
        status_label: trackingForm.status_label,
        note: trackingForm.note || undefined,
      });
      showAlert('success', 'Tracking event added');
      setShowTrackingForm(false);
      setTrackingForm({ status_label: '', note: '' });
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to add tracking event');
    } finally {
      setAddingTracking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-xl bg-background-secondary rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background-secondary/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
          <div>
            <h2 className="text-base font-semibold text-foreground">{order.order_number}</h2>
            <p className="text-xs text-foreground-muted mt-0.5">{formatSafeDate(order.created_at)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-background-tertiary text-foreground-muted">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`badge ${ORDER_STATUS_BADGE[order.status] === 'success' ? 'badge-success' : ORDER_STATUS_BADGE[order.status] === 'warning' ? 'badge-warning' : ORDER_STATUS_BADGE[order.status] === 'danger' ? 'badge-danger' : 'badge-info'} capitalize`}>
              {order.status}
            </span>
            <span className={`badge ${PAYMENT_STATUS_BADGE[order.payment_status] === 'success' ? 'badge-success' : PAYMENT_STATUS_BADGE[order.payment_status] === 'warning' ? 'badge-warning' : 'badge-neutral'} capitalize`}>
              {order.payment_status}
            </span>
            {order.mpesa_receipt_number && (
              <span className="badge badge-neutral font-mono text-xs">{order.mpesa_receipt_number}</span>
            )}
          </div>

          {/* Buyer Info */}
          <div className="card p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-3">Buyer</h3>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-accent-primary">{order.buyer_name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="font-medium text-foreground">{order.buyer_name}</p>
                <p className="text-sm text-foreground-muted">{order.buyer_phone}</p>
                {order.buyer_email && <p className="text-xs text-foreground-muted">{order.buyer_email}</p>}
              </div>
            </div>
            {order.delivery_address && (
              <div className="flex items-start gap-2 pt-2 border-t border-border/50">
                <svg className="w-4 h-4 text-foreground-muted flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <p className="text-sm text-foreground">{order.delivery_address}</p>
              </div>
            )}
            {order.notes && (
              <p className="text-xs text-foreground-muted italic pt-1 border-t border-border/50">&ldquo;{order.notes}&rdquo;</p>
            )}
          </div>

          {/* Items */}
          {order.items && order.items.length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-3">Items</h3>
              <div className="space-y-3">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.product_name}</p>
                      <p className="text-xs text-foreground-muted">{fmt(item.product_price)} × {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-foreground">{fmt(item.subtotal)}</p>
                  </div>
                ))}
                <div className="flex justify-between pt-3 border-t border-border font-semibold">
                  <span className="text-foreground">Total</span>
                  <span className="text-accent-primary">{fmt(order.total_amount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Update Status */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-3">Update Status</h3>
            <div className="flex flex-wrap gap-2">
              {ORDER_STATUSES.map(s => (
                <button
                  key={s}
                  disabled={updatingStatus || s === order.status}
                  onClick={() => handleStatusChange(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    s === order.status
                      ? `${ORDER_STATUS_COLORS[s]} ring-1 ring-current opacity-100 cursor-default`
                      : 'bg-background-tertiary text-foreground-muted hover:bg-background-tertiary/80 hover:text-foreground'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tracking History */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">Tracking</h3>
              <button
                onClick={() => setShowTrackingForm(v => !v)}
                className="text-xs text-accent-primary hover:opacity-80 font-medium"
              >
                + Add event
              </button>
            </div>

            {showTrackingForm && (
              <form onSubmit={handleAddTracking} className="mb-4 p-3 rounded-xl bg-background-tertiary space-y-2">
                <input
                  required
                  value={trackingForm.status_label}
                  onChange={e => setTrackingForm(f => ({ ...f, status_label: e.target.value }))}
                  className="input w-full text-sm"
                  placeholder="Label, e.g. Dispatched from warehouse"
                />
                <input
                  value={trackingForm.note ?? ''}
                  onChange={e => setTrackingForm(f => ({ ...f, note: e.target.value }))}
                  className="input w-full text-sm"
                  placeholder="Note (optional)"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowTrackingForm(false)} className="btn-secondary flex-1 text-xs py-1.5">Cancel</button>
                  <button type="submit" disabled={addingTracking} className="btn-primary flex-1 text-xs py-1.5">
                    {addingTracking ? 'Adding…' : 'Add'}
                  </button>
                </div>
              </form>
            )}

            {order.tracking_history && order.tracking_history.length > 0 ? (
              <ol className="space-y-3">
                {[...order.tracking_history].reverse().map((event, idx) => (
                  <li key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${idx === 0 ? 'bg-accent-primary' : 'bg-border'}`} />
                      {idx < order.tracking_history!.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-medium text-foreground">{event.status_label}</p>
                      {event.note && <p className="text-xs text-foreground-muted mt-0.5">{event.note}</p>}
                      <p className="text-[11px] text-foreground-muted/60 mt-0.5">{formatSafeDate(event.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-foreground-muted">No tracking events yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function ShopPage() {
  const { showAlert } = useAlert();
  const [tab, setTab] = useState<ShopTab>('dashboard');

  // Dashboard state
  const [dashboard, setDashboard] = useState<ShopDashboard | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);

  // Products state
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productModal, setProductModal] = useState<{ open: boolean; product: ShopProduct | null }>({ open: false, product: null });
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Orders state
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<ShopOrderStatus | 'all'>('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<ShopPaymentStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);
  const [orderSearch, setOrderSearch] = useState('');

  // ── loaders ────────────────────────────────────────────────────────

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    setDashError(null);
    try {
      const data = await api.getShopDashboard();
      setDashboard(data);
    } catch (err) {
      setDashError(err instanceof Error ? err.message : 'Failed to load shop dashboard');
    } finally {
      setDashLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const data = await api.getShopAdminProducts();
      setProducts(data);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setProductsLoading(false);
    }
  }, [showAlert]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const params: { status?: ShopOrderStatus; payment_status?: ShopPaymentStatus } = {};
      if (orderStatusFilter !== 'all') params.status = orderStatusFilter;
      if (orderPaymentFilter !== 'all') params.payment_status = orderPaymentFilter;
      const data = await api.getShopAdminOrders(params);
      setOrders(data);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  }, [orderStatusFilter, orderPaymentFilter, showAlert]);

  // Initial load
  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    if (tab === 'products') loadProducts();
  }, [tab, loadProducts]);

  useEffect(() => {
    if (tab === 'orders') loadOrders();
  }, [tab, loadOrders]);

  // Reload orders when filters change
  useEffect(() => {
    if (tab === 'orders') loadOrders();
  }, [orderStatusFilter, orderPaymentFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── product actions ────────────────────────────────────────────────

  const handleDeleteProduct = async (product: ShopProduct) => {
    if (!confirm(`Remove "${product.name}" from the shop?`)) return;
    setDeletingId(product.id);
    try {
      await api.deleteShopProduct(product.id);
      showAlert('success', 'Product removed');
      loadProducts();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  // ── filtered orders ────────────────────────────────────────────────

  const filteredOrders = orders.filter(o => {
    if (!orderSearch) return true;
    const q = orderSearch.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      o.buyer_name.toLowerCase().includes(q) ||
      o.buyer_phone.includes(q)
    );
  });

  // ── tabs definition ────────────────────────────────────────────────

  const tabs: TabItem<ShopTab>[] = [
    {
      value: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      value: 'products',
      label: 'Products',
      count: products.length || undefined,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
        </svg>
      ),
    },
    {
      value: 'orders',
      label: 'Orders',
      count: dashboard?.orders.total || undefined,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
  ];

  // ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Header title="Shop" />

      <main className="md:pl-64 pt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-8">
          {/* Tabs */}
          <Tabs value={tab} onChange={setTab} tabs={tabs} className="mb-6" />

          {/* ── Dashboard Tab ─────────────────────────────────────── */}
          {tab === 'dashboard' && (
            <>
              {dashLoading ? (
                <PageLoader />
              ) : dashError ? (
                <div className="card p-6 text-center">
                  <p className="text-danger mb-3">{dashError}</p>
                  <button onClick={loadDashboard} className="btn-primary">Retry</button>
                </div>
              ) : dashboard ? (
                <div className="space-y-6">
                  {/* Alert badges */}
                  {(dashboard.orders.needs_fulfillment > 0 || dashboard.orders.pending_payment > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {dashboard.orders.needs_fulfillment > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          <span className="text-sm font-medium text-amber-400">
                            {dashboard.orders.needs_fulfillment} order{dashboard.orders.needs_fulfillment !== 1 ? 's' : ''} need fulfillment
                          </span>
                        </div>
                      )}
                      {dashboard.orders.pending_payment > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                          <span className="text-sm font-medium text-yellow-400">
                            {dashboard.orders.pending_payment} order{dashboard.orders.pending_payment !== 1 ? 's' : ''} awaiting payment
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Revenue KPIs */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard
                      title="Today"
                      value={fmt(dashboard.revenue.today)}
                      accent="primary"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                    <StatCard
                      title="This Week"
                      value={fmt(dashboard.revenue.this_week)}
                      accent="success"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                    />
                    <StatCard
                      title="This Month"
                      value={fmt(dashboard.revenue.this_month)}
                      accent="info"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    />
                    <StatCard
                      title="All Time"
                      value={fmt(dashboard.revenue.all_time)}
                      accent="warning"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
                    />
                  </div>

                  {/* Order status breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card p-4">
                      <h3 className="text-sm font-semibold text-foreground mb-4">Orders by Status</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {(Object.entries(dashboard.orders.by_status) as [ShopOrderStatus, number][]).map(([status, count]) => (
                          <button
                            key={status}
                            onClick={() => { setTab('orders'); setOrderStatusFilter(status); }}
                            className="p-2 rounded-xl bg-background-tertiary hover:bg-background-tertiary/70 transition-colors text-center group"
                          >
                            <p className="text-lg font-bold text-foreground group-hover:text-accent-primary transition-colors">{count}</p>
                            <p className={`text-[10px] font-medium capitalize mt-0.5 ${ORDER_STATUS_COLORS[status].split(' ')[1]}`}>{status}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Top Products */}
                    <div className="card p-4">
                      <h3 className="text-sm font-semibold text-foreground mb-4">Top Products</h3>
                      {dashboard.top_products.length === 0 ? (
                        <p className="text-sm text-foreground-muted">No sales yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {dashboard.top_products.slice(0, 4).map((p, i) => (
                            <div key={p.product_id} className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full bg-accent-primary/10 text-accent-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{p.product_name}</p>
                                <p className="text-xs text-foreground-muted">{p.units_sold} sold</p>
                              </div>
                              <span className="text-sm font-semibold text-foreground flex-shrink-0">{fmt(p.revenue)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Orders */}
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
                      <button onClick={() => setTab('orders')} className="text-xs text-accent-primary hover:opacity-80 font-medium">View all</button>
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            {['Order', 'Buyer', 'Amount', 'Status', 'Payment', 'Date'].map(h => (
                              <th key={h} className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.recent_orders.map(o => (
                            <tr key={o.id} className="border-b border-border/50 hover:bg-background-tertiary/50 transition-colors cursor-pointer" onClick={() => { setSelectedOrder(o); }}>
                              <td className="py-3 px-3 font-mono text-xs text-foreground">{o.order_number}</td>
                              <td className="py-3 px-3">
                                <p className="font-medium text-foreground">{o.buyer_name}</p>
                                <p className="text-xs text-foreground-muted">{o.buyer_phone}</p>
                              </td>
                              <td className="py-3 px-3 font-semibold text-foreground">{fmt(o.total_amount)}</td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ORDER_STATUS_COLORS[o.status]}`}>{o.status}</span>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${o.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : o.payment_status === 'refunded' ? 'bg-gray-500/10 text-gray-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{o.payment_status}</span>
                              </td>
                              <td className="py-3 px-3 text-xs text-foreground-muted">{formatSafeDate(o.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-3">
                      {dashboard.recent_orders.map(o => (
                        <MobileDataCard
                          key={o.id}
                          id={o.id}
                          layout="compact"
                          title={o.buyer_name}
                          subtitle={o.order_number}
                          avatar={{ text: o.buyer_name.charAt(0).toUpperCase(), color: 'primary' }}
                          status={{ label: o.status, variant: ORDER_STATUS_BADGE[o.status] }}
                          badge={{ label: o.payment_status, variant: PAYMENT_STATUS_BADGE[o.payment_status] }}
                          value={{ text: fmt(o.total_amount), highlight: true }}
                          onClick={() => setSelectedOrder(o)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* ── Products Tab ──────────────────────────────────────── */}
          {tab === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground-muted">{products.length} product{products.length !== 1 ? 's' : ''}</p>
                <button
                  onClick={() => setProductModal({ open: true, product: null })}
                  className="btn-primary flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  <span>Add Product</span>
                </button>
              </div>

              {productsLoading ? (
                <PageLoader />
              ) : products.length === 0 ? (
                <div className="card p-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" /></svg>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">No products yet</h3>
                  <p className="text-sm text-foreground-muted mb-4">Add your first product to start selling.</p>
                  <button onClick={() => setProductModal({ open: true, product: null })} className="btn-primary">Add Product</button>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {['Product', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map(h => (
                            <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-foreground-muted">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(p => (
                          <tr key={p.id} className="border-b border-border/50 hover:bg-background-tertiary/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {p.image_url ? (
                                  <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" /></svg>
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-foreground">{p.name}</p>
                                  {p.description && <p className="text-xs text-foreground-muted line-clamp-1">{p.description}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-foreground-muted">{p.category ?? '-'}</td>
                            <td className="py-3 px-4 font-semibold text-foreground">{fmt(p.price)}</td>
                            <td className="py-3 px-4">
                              <span className={`font-medium ${p.stock_quantity === 0 ? 'text-danger' : p.stock_quantity <= 5 ? 'text-warning' : 'text-foreground'}`}>
                                {p.stock_quantity}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`badge ${p.is_active ? 'badge-success' : 'badge-neutral'}`}>
                                {p.is_active ? 'Active' : 'Hidden'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setProductModal({ open: true, product: p })}
                                  className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted hover:text-foreground transition-colors"
                                  title="Edit"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p)}
                                  disabled={deletingId === p.id}
                                  className="p-1.5 rounded-lg hover:bg-danger/10 text-foreground-muted hover:text-danger transition-colors"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {products.map(p => (
                      <MobileDataCard
                        key={p.id}
                        id={p.id}
                        title={p.name}
                        subtitle={p.category ?? undefined}
                        avatar={{ text: p.name.charAt(0).toUpperCase(), color: p.is_active ? 'primary' : 'secondary' }}
                        status={{ label: p.is_active ? 'Active' : 'Hidden', variant: p.is_active ? 'success' : 'neutral' }}
                        value={{ text: fmt(p.price), highlight: true }}
                        fields={[
                          {
                            icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
                            label: 'Stock',
                            value: <span className={p.stock_quantity === 0 ? 'text-danger' : p.stock_quantity <= 5 ? 'text-warning' : ''}>{p.stock_quantity} units</span>,
                          },
                        ]}
                        rightAction={
                          <div className="flex gap-2">
                            <button onClick={() => setProductModal({ open: true, product: p })} className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => handleDeleteProduct(p)} disabled={deletingId === p.id} className="p-1.5 rounded-lg hover:bg-danger/10 text-foreground-muted hover:text-danger">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        }
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Orders Tab ────────────────────────────────────────── */}
          {tab === 'orders' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                    className="input w-full pl-9"
                    placeholder="Search by name, phone, order #…"
                  />
                </div>

                {/* Status filter */}
                <select
                  value={orderStatusFilter}
                  onChange={e => setOrderStatusFilter(e.target.value as ShopOrderStatus | 'all')}
                  className="input"
                >
                  <option value="all">All Statuses</option>
                  {ORDER_STATUSES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>

                {/* Payment filter */}
                <select
                  value={orderPaymentFilter}
                  onChange={e => setOrderPaymentFilter(e.target.value as ShopPaymentStatus | 'all')}
                  className="input"
                >
                  <option value="all">All Payments</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <p className="text-xs text-foreground-muted">{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}</p>

              {ordersLoading ? (
                <PageLoader />
              ) : filteredOrders.length === 0 ? (
                <div className="card p-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-background-tertiary flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">No orders found</h3>
                  <p className="text-sm text-foreground-muted">Try adjusting your filters.</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {['Order #', 'Buyer', 'Amount', 'Status', 'Payment', 'Receipt', 'Date', ''].map(h => (
                            <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-foreground-muted">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map(o => (
                          <tr key={o.id} className="border-b border-border/50 hover:bg-background-tertiary/50 transition-colors">
                            <td className="py-3 px-4 font-mono text-xs text-foreground">{o.order_number}</td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-foreground">{o.buyer_name}</p>
                              <p className="text-xs text-foreground-muted">{o.buyer_phone}</p>
                            </td>
                            <td className="py-3 px-4 font-semibold text-foreground">{fmt(o.total_amount)}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ORDER_STATUS_COLORS[o.status]}`}>{o.status}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${o.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : o.payment_status === 'refunded' ? 'bg-gray-500/10 text-gray-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{o.payment_status}</span>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-foreground-muted">{o.mpesa_receipt_number ?? '-'}</td>
                            <td className="py-3 px-4 text-xs text-foreground-muted">{formatSafeDate(o.created_at)}</td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => setSelectedOrder(o)}
                                className="px-3 py-1.5 rounded-lg bg-accent-primary/10 text-accent-primary text-xs font-medium hover:bg-accent-primary/20 transition-colors"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {filteredOrders.map(o => (
                      <MobileDataCard
                        key={o.id}
                        id={o.id}
                        layout="compact"
                        title={o.buyer_name}
                        subtitle={o.order_number}
                        avatar={{ text: o.buyer_name.charAt(0).toUpperCase(), color: 'primary' }}
                        status={{ label: o.status, variant: ORDER_STATUS_BADGE[o.status] }}
                        badge={{ label: o.payment_status, variant: PAYMENT_STATUS_BADGE[o.payment_status] }}
                        value={{ text: fmt(o.total_amount), highlight: true }}
                        secondary={{
                          left: o.buyer_phone,
                          right: formatSafeDate(o.created_at),
                        }}
                        onClick={() => setSelectedOrder(o)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Product Modal */}
      {productModal.open && (
        <ProductModal
          product={productModal.product}
          onClose={() => setProductModal({ open: false, product: null })}
          onSaved={() => {
            setProductModal({ open: false, product: null });
            loadProducts();
          }}
        />
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdated={(id, status) => {
            setSelectedOrder(prev => prev ? { ...prev, status } : null);
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
          }}
        />
      )}
    </div>
  );
}
