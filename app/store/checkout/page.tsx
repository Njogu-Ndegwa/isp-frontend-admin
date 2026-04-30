'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '../layout';
import { api } from '../../lib/api';
import type { PlaceOrderResponse } from '../../lib/types';

type Step = 'cart' | 'details' | 'payment' | 'success';

interface BuyerForm {
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  delivery_address: string;
  notes: string;
}

/* ─── Step indicator ────────────────────────────────────────────── */
function StepBar({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'cart', label: 'Cart' },
    { key: 'details', label: 'Details' },
    { key: 'payment', label: 'Payment' },
    { key: 'success', label: 'Done' },
  ];
  const idx = steps.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2 flex-1 last:flex-none">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 transition-all ${
            i < idx ? 'bg-emerald-500 text-white' : i === idx ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-[#09090b]' : 'bg-background-tertiary text-foreground-muted'
          }`}>
            {i < idx ? '✓' : i + 1}
          </div>
          <span className={`text-xs font-medium hidden sm:block ${i === idx ? 'text-foreground' : 'text-foreground-muted'}`}>{s.label}</span>
          {i < steps.length - 1 && <div className={`h-px flex-1 ${i < idx ? 'bg-emerald-500/50' : 'bg-border'}`} />}
        </div>
      ))}
    </div>
  );
}

/* ─── Cart Review Step ──────────────────────────────────────────── */
function CartStep({ onNext }: { onNext: () => void }) {
  const { items, removeItem, updateQty, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="w-14 h-14 mx-auto mb-4 text-foreground-muted opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
        <p className="font-medium text-foreground mb-2">Your cart is empty</p>
        <p className="text-sm text-foreground-muted mb-6">Go back to the shop to add items.</p>
        <Link href="/store" className="btn-primary text-sm">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map(item => (
        <div key={item.product.id} className="card p-4 flex gap-4">
          <div className="w-14 h-14 rounded-lg bg-background-secondary flex items-center justify-center flex-shrink-0 text-foreground-muted/30">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{item.product.name}</p>
            {item.product.category && <p className="text-xs text-foreground-muted mt-0.5">{item.product.category}</p>}
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => updateQty(item.product.id, item.quantity - 1)} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-sm text-foreground-muted hover:text-foreground transition-colors">−</button>
              <span className="text-sm font-medium w-7 text-center">{item.quantity}</span>
              <button onClick={() => updateQty(item.product.id, item.quantity + 1)} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-sm text-foreground-muted hover:text-foreground transition-colors">+</button>
            </div>
          </div>
          <div className="flex flex-col items-end justify-between">
            <button onClick={() => removeItem(item.product.id)} className="text-foreground-muted hover:text-danger transition-colors p-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <span className="text-sm font-semibold">KES {(item.product.price * item.quantity).toLocaleString()}</span>
          </div>
        </div>
      ))}

      <div className="card-glass p-4 rounded-xl">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-foreground-muted">Subtotal</span>
          <span className="font-semibold">KES {total.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-foreground-muted">
          <span>Delivery fee</span>
          <span>To be confirmed</span>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="font-semibold">Total (excl. delivery)</span>
          <span className="text-xl font-bold gradient-text">KES {total.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/store" className="flex-1 py-3 text-center border border-border rounded-xl text-sm font-medium hover:border-foreground-muted transition-colors">
          ← Add More
        </Link>
        <button onClick={onNext} className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all">
          Continue →
        </button>
      </div>
    </div>
  );
}

/* ─── Buyer Details Step ────────────────────────────────────────── */
function DetailsStep({ form, setForm, onNext, onBack }: {
  form: BuyerForm;
  setForm: (f: BuyerForm) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const set = (key: keyof BuyerForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const valid = form.buyer_name.trim() && form.buyer_phone.trim();

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1.5">Full Name *</label>
          <input
            type="text"
            value={form.buyer_name}
            onChange={set('buyer_name')}
            placeholder="John Kamau"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background-secondary text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1.5">M-Pesa Phone Number *</label>
          <input
            type="tel"
            value={form.buyer_phone}
            onChange={set('buyer_phone')}
            placeholder="07XX XXX XXX"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background-secondary text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
          />
          <p className="text-[10px] text-foreground-muted mt-1">Used for M-Pesa payment & order tracking</p>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-foreground-muted mb-1.5">Email (optional)</label>
          <input
            type="email"
            value={form.buyer_email}
            onChange={set('buyer_email')}
            placeholder="john@example.com"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background-secondary text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-foreground-muted mb-1.5">Delivery Address</label>
          <input
            type="text"
            value={form.delivery_address}
            onChange={set('delivery_address')}
            placeholder="e.g. Nairobi CBD, Tom Mboya Street"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background-secondary text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-foreground-muted mb-1.5">Order Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={set('notes')}
            rows={2}
            placeholder="Any special instructions or notes..."
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background-secondary text-sm focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 border border-border rounded-xl text-sm font-medium hover:border-foreground-muted transition-colors">
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!valid}
          className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue to Payment →
        </button>
      </div>
    </div>
  );
}

/* ─── Payment Step ──────────────────────────────────────────────── */
type PayState = 'idle' | 'placing' | 'stk' | 'polling' | 'error';

function PaymentStep({ form, onSuccess, onBack }: {
  form: BuyerForm;
  onSuccess: (order: PlaceOrderResponse, receipt: string) => void;
  onBack: () => void;
}) {
  const { items, total, clearCart } = useCart();
  const [mpesaPhone, setMpesaPhone] = useState(form.buyer_phone);
  const [state, setState] = useState<PayState>('idle');
  const [order, setOrder] = useState<PlaceOrderResponse | null>(null);
  const [error, setError] = useState('');

  const handlePay = async () => {
    try {
      setState('placing');
      const placed = await api.placeShopOrder({
        buyer_name: form.buyer_name,
        buyer_phone: form.buyer_phone,
        buyer_email: form.buyer_email || undefined,
        delivery_address: form.delivery_address || undefined,
        notes: form.notes || undefined,
        items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
      });
      setOrder(placed);

      setState('stk');
      await api.initiateShopPayment(placed.order_id, mpesaPhone);

      setState('polling');
      await new Promise(r => setTimeout(r, 3000));
      const status = await api.checkShopPaymentStatus(placed.order_id);

      if (status.payment_status === 'paid') {
        clearCart();
        onSuccess(placed, status.mpesa_receipt_number ?? '');
      } else {
        setState('error');
        setError('Payment not confirmed. Please check your M-Pesa and try again.');
      }
    } catch (e: unknown) {
      setState('error');
      setError(e instanceof Error ? e.message : 'Payment failed. Please try again.');
    }
  };

  if (state === 'placing' || state === 'stk' || state === 'polling') {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-lg">
            {state === 'placing' ? 'Creating your order...' : state === 'stk' ? 'STK Push sent!' : 'Confirming payment...'}
          </p>
          <p className="text-sm text-foreground-muted mt-1">
            {state === 'stk' ? `Check your phone (${mpesaPhone}) and enter your M-Pesa PIN` : 'Please wait...'}
          </p>
        </div>
        {state === 'stk' && (
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            Enter your M-Pesa PIN on your phone to complete payment
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Order summary */}
      <div className="card-glass rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-3">Order Summary</p>
        {items.map(item => (
          <div key={item.product.id} className="flex justify-between text-sm">
            <span className="text-foreground-muted">{item.product.name} × {item.quantity}</span>
            <span className="font-medium">KES {(item.product.price * item.quantity).toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between pt-2 border-t border-border font-semibold">
          <span>Total</span>
          <span className="gradient-text">KES {total.toLocaleString()}</span>
        </div>
      </div>

      {/* Buyer summary */}
      <div className="card p-4 space-y-1.5 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-2">Delivery To</p>
        <p className="font-medium">{form.buyer_name}</p>
        <p className="text-foreground-muted">{form.buyer_phone}</p>
        {form.delivery_address && <p className="text-foreground-muted">{form.delivery_address}</p>}
      </div>

      {/* M-Pesa phone */}
      <div>
        <label className="block text-xs font-medium text-foreground-muted mb-1.5">
          M-Pesa Phone Number
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6.5 10h-2v7h2v-7zm6 0h-2v7h2v-7zm8.5 9H2v2h19v-2zm-2.5-9h-2v7h2v-7zM11.5 1L2 6v2h19V6L11.5 1z"/></svg>
            </div>
            <span className="text-xs font-medium text-emerald-500">M-Pesa</span>
          </div>
          <input
            type="tel"
            value={mpesaPhone}
            onChange={e => setMpesaPhone(e.target.value)}
            className="w-full pl-20 pr-4 py-3 rounded-xl border border-border bg-background-secondary text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>
        <p className="text-[10px] text-foreground-muted mt-1">You will receive an STK Push on this number</p>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 border border-border rounded-xl text-sm font-medium hover:border-foreground-muted transition-colors">
          ← Back
        </button>
        <button
          onClick={handlePay}
          disabled={!mpesaPhone.trim()}
          className="flex-2 flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6.5 10h-2v7h2v-7zm6 0h-2v7h2v-7zm8.5 9H2v2h19v-2zm-2.5-9h-2v7h2v-7zM11.5 1L2 6v2h19V6L11.5 1z"/></svg>
          Pay KES {total.toLocaleString()} via M-Pesa
        </button>
      </div>
    </div>
  );
}

/* ─── Success Step ──────────────────────────────────────────────── */
function SuccessStep({ order, receipt }: { order: PlaceOrderResponse; receipt: string }) {
  return (
    <div className="text-center py-8 space-y-6">
      <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
        <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <h2 className="text-2xl font-bold">Payment Successful!</h2>
        <p className="text-foreground-muted mt-2">Your order has been placed and confirmed.</p>
      </div>
      <div className="card p-5 text-left space-y-3 max-w-sm mx-auto">
        <div className="flex justify-between text-sm">
          <span className="text-foreground-muted">Order Number</span>
          <span className="font-bold text-accent-primary">{order.order_number}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground-muted">Amount Paid</span>
          <span className="font-semibold">KES {order.total_amount.toLocaleString()}</span>
        </div>
        {receipt && (
          <div className="flex justify-between text-sm">
            <span className="text-foreground-muted">M-Pesa Receipt</span>
            <span className="font-mono font-semibold text-emerald-500">{receipt}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-foreground-muted">Status</span>
          <span className="text-emerald-500 font-medium">Confirmed ✓</span>
        </div>
      </div>
      <p className="text-sm text-foreground-muted">Save your order number to track your delivery.</p>
      <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
        <Link href={`/store/track?order=${order.order_number}`} className="flex-1 py-3 border border-amber-500/30 text-amber-500 rounded-xl text-sm font-medium hover:bg-amber-500/10 transition-colors text-center">
          Track Order
        </Link>
        <Link href="/store" className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all text-center">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function CheckoutPage() {
  const [step, setStep] = useState<Step>('cart');
  const [form, setForm] = useState<BuyerForm>({
    buyer_name: '', buyer_phone: '', buyer_email: '', delivery_address: '', notes: '',
  });
  const [completedOrder, setCompletedOrder] = useState<PlaceOrderResponse | null>(null);
  const [receipt, setReceipt] = useState('');

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/store" className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to shop
        </Link>
        <h1 className="text-2xl font-bold mt-2">Checkout</h1>
      </div>

      <StepBar current={step} />

      {step === 'cart' && <CartStep onNext={() => setStep('details')} />}
      {step === 'details' && (
        <DetailsStep
          form={form}
          setForm={setForm}
          onNext={() => setStep('payment')}
          onBack={() => setStep('cart')}
        />
      )}
      {step === 'payment' && (
        <PaymentStep
          form={form}
          onBack={() => setStep('details')}
          onSuccess={(o, r) => { setCompletedOrder(o); setReceipt(r); setStep('success'); }}
        />
      )}
      {step === 'success' && completedOrder && (
        <SuccessStep order={completedOrder} receipt={receipt} />
      )}
    </div>
  );
}
