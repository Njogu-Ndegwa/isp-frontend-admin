'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import {
  MessagingSettings,
  SmsBundle,
  SmsCreditOrder,
  AdminReseller,
  AdminSmsMessage,
  AdminSmsHistoryResponse,
} from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import Header from '../../components/Header';
import Tabs, { TabItem } from '../../components/Tabs';
import { SkeletonCard } from '../../components/LoadingSpinner';
import { ResellerLedgerSheet } from './components/ResellerLedgerSheet';

// ── Tab type ─────────────────────────────────────────────────────────────────

type TabValue = 'settings' | 'sales' | 'broadcast' | 'sms-history';

const TABS: TabItem<TabValue>[] = [
  { value: 'settings', label: 'Settings' },
  { value: 'sales',    label: 'Credit sales' },
  { value: 'broadcast', label: 'Message resellers' },
  { value: 'sms-history', label: 'SMS history' },
];

function formatDateTime(d: string | null) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleString('en-KE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

function SmsStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'sent' || status === 'delivered'
      ? 'text-success bg-emerald-500/10 border-emerald-500/20'
      : status === 'failed'
        ? 'text-danger bg-red-500/10 border-red-500/20'
        : status === 'queued'
          ? 'text-foreground-muted bg-background-tertiary border-border'
          : 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${cls}`}>
      {status}
    </span>
  );
}

// ── Bundle editor ─────────────────────────────────────────────────────────────

interface BundleEditorProps {
  bundles: SmsBundle[];
  onChange: (bundles: SmsBundle[]) => void;
}

function BundleEditor({ bundles, onChange }: BundleEditorProps) {
  const addRow = () => onChange([...bundles, { credits: 100, label: '' }]);
  const removeRow = (i: number) => onChange(bundles.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof SmsBundle, value: string | number) =>
    onChange(bundles.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Credit bundles</p>
      {bundles.length === 0 && (
        <p className="text-xs text-foreground-muted">No bundles configured. Add one below.</p>
      )}
      {bundles.map((bundle, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={bundle.credits}
            onChange={(e) => updateRow(i, 'credits', parseInt(e.target.value, 10) || 0)}
            className="input w-28"
            placeholder="Credits"
          />
          <input
            type="text"
            value={bundle.label}
            onChange={(e) => updateRow(i, 'label', e.target.value)}
            className="input flex-1"
            placeholder="Label (e.g. Starter)"
          />
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
            title="Remove bundle"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add bundle
      </button>
    </div>
  );
}

// ── Settings tab ─────────────────────────────────────────────────────────────

interface SettingsTabProps {
  settings: MessagingSettings | null;
  loading: boolean;
  onRefetch: () => void;
}

function SettingsTab({ settings, loading, onRefetch }: SettingsTabProps) {
  const { showAlert } = useAlert();

  const [pricePerSms, setPricePerSms] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  const [senderId, setSenderId] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [retentionDays, setRetentionDays] = useState('');
  const [bundles, setBundles] = useState<SmsBundle[]>([]);
  const [saving, setSaving] = useState(false);

  // Sync form from loaded settings
  useEffect(() => {
    if (!settings) return;
    setPricePerSms(String(settings.price_per_sms_kes));
    setMinPurchase(String(settings.min_purchase_credits));
    setSenderId(settings.sender_id ?? '');
    setEnabled(settings.enabled);
    setRetentionDays(String(settings.message_retention_days));
    setBundles(settings.bundles ?? []);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateMessagingSettings({
        price_per_sms_kes: parseFloat(pricePerSms),
        min_purchase_credits: parseInt(minPurchase, 10),
        sender_id: senderId.trim() || null,
        enabled,
        message_retention_days: parseInt(retentionDays, 10),
        bundles,
      });
      showAlert('success', 'Settings updated');
      onRefetch();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 pt-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 pt-4">
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">General</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              Price per SMS (KES)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={pricePerSms}
              onChange={(e) => setPricePerSms(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              Minimum purchase (credits)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={minPurchase}
              onChange={(e) => setMinPurchase(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              Sender ID <span className="text-foreground-muted font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="input"
              placeholder="e.g. MyISP"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              Message retention (days)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-success' : 'bg-background-tertiary border border-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-foreground">
            SMS messaging {enabled ? 'enabled' : 'disabled'}
          </span>
        </div>
      </div>

      <div className="card p-6">
        <BundleEditor bundles={bundles} onChange={setBundles} />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary px-5 py-2 text-sm"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}

// ── Credit orders table ───────────────────────────────────────────────────────

interface OrdersTableProps {
  orders: SmsCreditOrder[];
  resellerMap: Map<number, string>;
  onResellerClick: (id: number, name: string) => void;
}

function OrdersTable({ orders, resellerMap, onResellerClick }: OrdersTableProps) {
  const formatDate = (d: string | null) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('en-KE', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch { return '-'; }
  };

  const statusColor = (s: string) => {
    if (s === 'completed' || s === 'paid') return 'text-success';
    if (s === 'pending') return 'text-amber-500';
    if (s === 'failed' || s === 'cancelled') return 'text-danger';
    return 'text-foreground-muted';
  };

  if (orders.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-foreground-muted">No credit orders found</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background-secondary">
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted">Reseller</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-foreground-muted">Quantity</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-foreground-muted">Amount (KES)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted">Reference</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-background-secondary/50 transition-colors">
                <td className="px-4 py-3 text-foreground-muted font-mono text-xs">{order.id}</td>
                <td className="px-4 py-3 text-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      const name = resellerMap.get(order.user_id) ?? `#${order.user_id}`;
                      onResellerClick(order.user_id, name);
                    }}
                    className="text-accent-primary hover:underline text-left"
                  >
                    {resellerMap.get(order.user_id) ?? `#${order.user_id}`}
                  </button>
                </td>
                <td className="px-4 py-3 text-right font-medium">{order.quantity.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-medium">{order.amount.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium capitalize ${statusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-foreground-muted font-mono">
                  {order.payment_reference ?? '-'}
                </td>
                <td className="px-4 py-3 text-xs text-foreground-muted">{formatDate(order.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {orders.map((order) => (
          <div key={order.id} className="card p-4 space-y-1">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const name = resellerMap.get(order.user_id) ?? `#${order.user_id}`;
                  onResellerClick(order.user_id, name);
                }}
                className="text-sm font-medium text-accent-primary hover:underline text-left"
              >
                {resellerMap.get(order.user_id) ?? `#${order.user_id}`}
              </button>
              <span className={`text-xs font-medium capitalize ${statusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-foreground-muted">
              <span>{order.quantity.toLocaleString()} credits</span>
              <span>KES {order.amount.toFixed(2)}</span>
              <span>{formatDate(order.created_at)}</span>
            </div>
            {order.payment_reference && (
              <p className="text-xs text-foreground-muted font-mono">{order.payment_reference}</p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ── Credit sales tab ──────────────────────────────────────────────────────────

interface SalesTabProps {
  resellers: AdminReseller[];
  resellerMap: Map<number, string>;
  loadingResellers: boolean;
}

function SalesTab({ resellers, resellerMap, loadingResellers }: SalesTabProps) {
  const { showAlert } = useAlert();
  const [orders, setOrders] = useState<SmsCreditOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Ledger sheet
  const [ledger, setLedger] = useState<{ id: number; name: string } | null>(null);

  // Adjust form
  const [adjustId, setAdjustId] = useState('');
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const result = await api.getSmsCreditOrders();
      setOrders(result.orders);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoadingOrders(false);
    }
  }, [showAlert]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustId) { showAlert('error', 'Select a reseller'); return; }
    const d = parseInt(delta, 10);
    if (isNaN(d) || d === 0) { showAlert('error', 'Enter a non-zero delta'); return; }
    setAdjusting(true);
    try {
      const result = await api.adjustResellerCredits(parseInt(adjustId, 10), d, note.trim() || undefined);
      showAlert('success', `Balance: ${result.balance}`);
      setDelta('');
      setNote('');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to adjust credits');
    } finally {
      setAdjusting(false);
    }
  };

  const loading = loadingResellers || loadingOrders;

  return (
    <div className="space-y-6 pt-4">
      {/* Manual credit adjust */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Manual credit adjustment</h3>
        <form onSubmit={handleAdjust} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">Reseller</label>
            <select
              value={adjustId}
              onChange={(e) => setAdjustId(e.target.value)}
              className="select"
              disabled={loadingResellers}
              required
            >
              <option value="">Select reseller…</option>
              {resellers.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.organization_name || r.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              Delta (positive = add, negative = deduct)
            </label>
            <input
              type="number"
              step="1"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              className="input"
              placeholder="e.g. 50 or -10"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              Note <span className="font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input"
              placeholder="Reason…"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={adjusting || loadingResellers}
              className="btn-primary w-full py-2 text-sm"
            >
              {adjusting ? 'Applying…' : 'Apply'}
            </button>
          </div>
        </form>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Credit orders</h3>
          <button onClick={fetchOrders} className="text-xs text-foreground-muted hover:text-foreground transition-colors">
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <OrdersTable
            orders={orders}
            resellerMap={resellerMap}
            onResellerClick={(id, name) => setLedger({ id, name })}
          />
        )}
      </div>

      {/* Reseller ledger sheet */}
      {ledger && (
        <ResellerLedgerSheet
          resellerId={ledger.id}
          resellerName={ledger.name}
          onClose={() => setLedger(null)}
        />
      )}
    </div>
  );
}

// ── Broadcast tab ─────────────────────────────────────────────────────────────

interface BroadcastTabProps {
  resellers: AdminReseller[];
  loadingResellers: boolean;
}

function BroadcastTab({ resellers, loadingResellers }: BroadcastTabProps) {
  const { showAlert } = useAlert();
  const [recipient, setRecipient] = useState('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [alsoSms, setAlsoSms] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) { showAlert('error', 'Message body is required'); return; }
    setSending(true);
    try {
      const result = await api.sendInboxMessage({
        recipient,
        subject: subject.trim() || undefined,
        body: body.trim(),
        also_sms: alsoSms,
      });
      const smsNote = alsoSms
        ? ` SMS queued: ${result.sms_queued}. No phone: ${result.sms_skipped_no_phone}.`
        : '';
      showAlert('success', `Inbox message sent to ${result.recipients} reseller(s).${smsNote}`);
      setSubject('');
      setBody('');
      setAlsoSms(false);
      setRecipient('all');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSend} className="space-y-4 pt-4">
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Compose message</h3>

        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Recipient</label>
          <select
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="select"
            disabled={loadingResellers}
          >
            <option value="all">All resellers</option>
            {resellers.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.organization_name || r.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">
            Subject <span className="font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input"
            placeholder="Subject line…"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">
            Body <span className="text-danger">*</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="input min-h-[120px] resize-y"
            placeholder="Write your message here…"
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={alsoSms}
            onClick={() => setAlsoSms((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              alsoSms ? 'bg-success' : 'bg-background-tertiary border border-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                alsoSms ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-foreground">
            Also send as SMS to support phone — billed to platform
          </span>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={sending || loadingResellers}
          className="btn-primary px-5 py-2 text-sm"
        >
          {sending ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function SmsHistoryTab() {
  const [history, setHistory] = useState<AdminSmsHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminSmsHistory(200);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SMS history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const messages: AdminSmsMessage[] = history?.messages ?? [];
  const summary = history?.summary ?? {};

  if (loading) {
    return (
      <div className="space-y-3 pt-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center mt-4">
        <p className="text-sm text-danger mb-3">{error}</p>
        <button onClick={load} className="btn-primary px-4 py-2 text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {(['sent', 'failed', 'queued', 'delivered'] as const).map((status) => (
          <div key={status} className="card p-4">
            <p className="text-xs text-foreground-muted capitalize">{status}</p>
            <p className="text-2xl font-semibold text-foreground">{(summary[status] ?? 0).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent admin SMS</h3>
        <button onClick={load} className="text-xs text-foreground-muted hover:text-foreground transition-colors">
          Refresh
        </button>
      </div>

      {messages.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-foreground-muted">No admin SMS rows found.</p>
        </div>
      ) : (
        <>
          <div className="hidden lg:block card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background-secondary">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted">Reseller</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted">Provider ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {messages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-background-secondary/50 transition-colors align-top">
                    <td className="px-4 py-3 text-xs text-foreground-muted whitespace-nowrap">{formatDateTime(msg.created_at)}</td>
                    <td className="px-4 py-3 text-foreground">{msg.reseller_name}</td>
                    <td className="px-4 py-3 text-xs font-mono text-foreground-muted">{msg.phone}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <SmsStatusBadge status={msg.status} />
                        {msg.error && <p className="text-xs text-danger max-w-40 break-words">{msg.error}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-foreground-muted">
                      {msg.provider_message_id ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground-muted max-w-sm">
                      <p className="line-clamp-2">{msg.body}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-2">
            {messages.map((msg) => (
              <div key={msg.id} className="card p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{msg.reseller_name}</p>
                    <p className="text-xs font-mono text-foreground-muted">{msg.phone}</p>
                  </div>
                  <SmsStatusBadge status={msg.status} />
                </div>
                <p className="text-xs text-foreground-muted">{formatDateTime(msg.created_at)}</p>
                <p className="text-sm text-foreground line-clamp-2">{msg.body}</p>
                {msg.provider_message_id && (
                  <p className="text-xs font-mono text-foreground-muted">{msg.provider_message_id}</p>
                )}
                {msg.error && <p className="text-xs text-danger">{msg.error}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminMessagingPage() {
  const { user } = useAuth();

  const [tab, setTab] = useState<TabValue>('settings');

  // Settings
  const [settings, setSettings] = useState<MessagingSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Resellers (shared by sales + broadcast tabs)
  const [resellers, setResellers] = useState<AdminReseller[]>([]);
  const [loadingResellers, setLoadingResellers] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const data = await api.getMessagingSettings();
      setSettings(data);
    } catch {
      // Settings tab will show retry via its own error path; keep null
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const fetchResellers = useCallback(async () => {
    setLoadingResellers(true);
    try {
      const data = await api.getAdminResellers();
      setResellers(data.resellers);
    } catch {
      // Dropdowns will just be empty; non-fatal
    } finally {
      setLoadingResellers(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchResellers();
  }, [fetchSettings, fetchResellers]);

  // Build a id→name map for the orders table
  const resellerMap = new Map<number, string>(
    resellers.map((r) => [r.id, r.organization_name || r.email])
  );

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
          <p className="text-foreground-muted text-sm">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Header title="Messaging" subtitle="Platform-wide SMS settings, credit sales, and reseller broadcasts" />

      <Tabs<TabValue>
        value={tab}
        onChange={setTab}
        tabs={TABS}
        ariaLabel="Messaging sections"
      />

      {tab === 'settings' && (
        <SettingsTab
          settings={settings}
          loading={loadingSettings}
          onRefetch={fetchSettings}
        />
      )}

      {tab === 'sales' && (
        <SalesTab
          resellers={resellers}
          resellerMap={resellerMap}
          loadingResellers={loadingResellers}
        />
      )}

      {tab === 'broadcast' && (
        <BroadcastTab
          resellers={resellers}
          loadingResellers={loadingResellers}
        />
      )}

      {tab === 'sms-history' && <SmsHistoryTab />}
    </div>
  );
}
