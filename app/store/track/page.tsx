'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import type { ShopOrder } from '../../lib/types';

const STATUS_STEPS: { key: string; label: string; icon: string }[] = [
  { key: 'pending', label: 'Order Placed', icon: '📋' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'processing', label: 'Processing', icon: '⚙️' },
  { key: 'shipped', label: 'Shipped', icon: '🚚' },
  { key: 'delivered', label: 'Delivered', icon: '🎉' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  confirmed: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  processing: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  shipped: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
  delivered: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  cancelled: 'text-red-500 bg-red-500/10 border-red-500/20',
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: 'text-amber-500',
  paid: 'text-emerald-500',
  failed: 'text-red-500',
};

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function OrderResult({ order }: { order: ShopOrder }) {
  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="space-y-5">
      {/* Order header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs text-foreground-muted">Order Number</p>
            <p className="text-xl font-bold text-accent-primary">{order.order_number}</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[order.status] || 'text-foreground-muted bg-background-tertiary border-border'}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-foreground-muted">Buyer</p>
            <p className="font-medium mt-0.5">{order.buyer_name}</p>
          </div>
          <div>
            <p className="text-xs text-foreground-muted">Total</p>
            <p className="font-bold mt-0.5">KES {order.total_amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-foreground-muted">Payment</p>
            <p className={`font-medium mt-0.5 capitalize ${PAYMENT_COLORS[order.payment_status] || ''}`}>
              {order.payment_status}
            </p>
          </div>
          {order.created_at && (
            <div>
              <p className="text-xs text-foreground-muted">Placed</p>
              <p className="font-medium mt-0.5 text-xs">{formatDate(order.created_at)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Progress tracker */}
      {!isCancelled && (
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-5">Delivery Progress</p>
          <div className="relative">
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-border" />
            <div
              className="absolute top-5 left-5 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700"
              style={{ width: currentStepIdx < 0 ? '0%' : `${Math.min((currentStepIdx / (STATUS_STEPS.length - 1)) * 100, 100)}%` }}
            />
            <div className="relative flex justify-between">
              {STATUS_STEPS.map((s, i) => {
                const done = i < currentStepIdx;
                const active = i === currentStepIdx;
                return (
                  <div key={s.key} className="flex flex-col items-center gap-2" style={{ width: `${100 / STATUS_STEPS.length}%` }}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                      done ? 'bg-gradient-to-br from-amber-500 to-orange-500 border-orange-500 shadow-md shadow-amber-500/25'
                      : active ? 'bg-gradient-to-br from-amber-500 to-orange-500 border-orange-500 shadow-lg shadow-amber-500/30 scale-110'
                      : 'bg-background-secondary border-border'
                    }`}>
                      {done ? '✓' : s.icon}
                    </div>
                    <p className={`text-[10px] text-center font-medium ${active ? 'text-accent-primary' : done ? 'text-foreground-muted' : 'text-foreground-muted/50'}`}>
                      {s.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="card p-4 border-red-500/20 bg-red-500/5 text-sm text-red-400">
          <p className="font-medium">Order Cancelled</p>
          <p className="text-xs mt-1 text-red-400/70">This order has been cancelled. Please contact support if you believe this is an error.</p>
        </div>
      )}

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-3">Items Ordered</p>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-background-secondary flex items-center justify-center flex-shrink-0 text-foreground-muted/30">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product_name}</p>
                  <p className="text-xs text-foreground-muted">Qty: {item.quantity} × KES {item.product_price.toLocaleString()}</p>
                </div>
                <p className="text-sm font-semibold">KES {item.subtotal.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-3 mt-3 border-t border-border font-semibold text-sm">
            <span>Total</span>
            <span className="gradient-text">KES {order.total_amount.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Tracking events */}
      {order.tracking_history && order.tracking_history.length > 0 && (
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-4">Tracking History</p>
          <div className="space-y-4">
            {[...order.tracking_history].reverse().map((event, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1 flex-shrink-0" />
                  {idx < (order.tracking_history?.length ?? 0) - 1 && <div className="w-px flex-1 bg-border mt-1.5" />}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium">{event.status_label}</p>
                  {event.note && <p className="text-xs text-foreground-muted mt-0.5">{event.note}</p>}
                  <p className="text-[10px] text-foreground-muted mt-1">{formatDate(event.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery address */}
      {order.delivery_address && (
        <div className="card p-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-foreground-muted mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <div>
            <p className="text-xs text-foreground-muted">Delivery Address</p>
            <p className="text-sm font-medium mt-0.5">{order.delivery_address}</p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/store" className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-center hover:border-foreground-muted transition-colors">
          Continue Shopping
        </Link>
        <a href="tel:+254795635364" className="flex-1 py-3 bg-background-secondary border border-border rounded-xl text-sm font-medium text-center hover:border-foreground-muted transition-colors">
          Contact Support
        </a>
      </div>
    </div>
  );
}

function TrackForm() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') ?? '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const prefilledOrder = searchParams.get('order');
    if (prefilledOrder) setOrderNumber(prefilledOrder);
  }, [searchParams]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const result = await api.trackShopOrder(orderNumber.trim(), phone.trim());
      setOrder(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Order not found. Check your order number and phone.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/store" className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to shop
        </Link>
        <h1 className="text-2xl font-bold mt-2">Track Your Order</h1>
        <p className="text-foreground-muted text-sm mt-1">Enter your order number and phone to see real-time delivery status.</p>
      </div>

      <form onSubmit={handleTrack} className="card p-5 space-y-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1.5">Order Number</label>
          <input
            type="text"
            value={orderNumber}
            onChange={e => setOrderNumber(e.target.value)}
            placeholder="e.g. ORD-123456"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background-secondary text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1.5">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="07XX XXX XXX"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background-secondary text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
          />
          <p className="text-[10px] text-foreground-muted mt-1">The phone number used when placing the order</p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-sm text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !orderNumber.trim() || !phone.trim()}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Tracking...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Track Order
            </>
          )}
        </button>
      </form>

      {order && <OrderResult order={order} />}

      <div className="mt-8 text-center text-sm text-foreground-muted">
        <p>Need help? Call or WhatsApp us at</p>
        <a href="tel:+254795635364" className="text-accent-primary font-medium hover:underline">+254 795 635 364</a>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto px-4 py-16 text-center text-foreground-muted">Loading...</div>}>
      <TrackForm />
    </Suspense>
  );
}
