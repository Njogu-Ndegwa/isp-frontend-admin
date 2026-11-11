'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../lib/api';
import { AdminSubscriptionDetail, SubscriptionInvoice, SubscriptionPayment } from '../../../lib/types';
import { useAuth } from '../../../context/AuthContext';
import Header from '../../../components/Header';
import SubscriptionStatusBadge from '../../../components/SubscriptionStatusBadge';
import InvoiceStatusBadge from '../../../components/InvoiceStatusBadge';
import EditSubscriptionModal from '../../../components/EditSubscriptionModal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { SkeletonCard } from '../../../components/LoadingSpinner';
import { formatMoney } from '../../../lib/format';
import { formatWithKes } from '../../../lib/reportingCurrency';
import { formatDateGMT3 } from '../../../lib/dateUtils';


const MARKET_OPTIONS = [
  { code: 'KE', label: 'Kenya (KES): 3% + KES 25/PPPoE, min KES 500, M-Pesa' },
  { code: 'CM', label: 'Cameroon (XAF): 3% + USD 0.20/PPPoE, min USD 10, card' },
  { code: 'UG', label: 'Uganda (UGX): 3% + USD 0.20/PPPoE, min USD 10, card' },
  { code: 'TZ', label: 'Tanzania (TZS): 3% + USD 0.20/PPPoE, min USD 10, card' },
  { code: 'ZM', label: 'Zambia (ZMW): 3% + USD 0.20/PPPoE, min USD 10, card' },
  { code: 'HT', label: 'Haiti (HTG): 3% + USD 0.20/PPPoE, min USD 10, card' },
];

const formatSafeDate = (dateStr: string | null | undefined): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '-';
  }
};

const FREE_SETUP_DAYS = 7;

/** "12 Nov 2026, 2:05 PM" in EAT. Backend times are naive UTC. */
const formatEat = (iso: string | null | undefined): string => {
  if (!iso) return '-';
  try {
    return `${formatDateGMT3(iso, {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    })} EAT`;
  } catch {
    return '-';
  }
};

/** "KES 500", or "KES 500 + USD 10" when invoices are in different currencies. */
const sumByCurrency = (rows: { amount: number; currency: string | null | undefined }[]): string => {
  const totals = new Map<string, number>();
  rows.forEach(({ amount, currency }) => {
    const code = (currency || 'KES').toUpperCase();
    totals.set(code, (totals.get(code) ?? 0) + amount);
  });
  return Array.from(totals, ([code, total]) => formatMoney(total, code)).join(' + ');
};

export default function AdminSubscriptionDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const resellerId = Number(params.id);
  const [data, setData] = useState<AdminSubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  // Action state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showWaiveDialog, setShowWaiveDialog] = useState(false);
  const [waiveTarget, setWaiveTarget] = useState<SubscriptionInvoice | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [activateMonths, setActivateMonths] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ message: string; count: number } | null>(null);
  const [repriceTarget, setRepriceTarget] = useState<SubscriptionInvoice | null>(null);
  const [confirmCardTarget, setConfirmCardTarget] = useState<SubscriptionPayment | null>(null);
  const [marketCode, setMarketCode] = useState('KE');
  const [priceOverride, setPriceOverride] = useState('');
  const [marketSaving, setMarketSaving] = useState(false);
  const [marketMsg, setMarketMsg] = useState<string | null>(null);
  const [showFreeSetupDialog, setShowFreeSetupDialog] = useState(false);
  const [freeSetupReason, setFreeSetupReason] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getAdminSubscriptionDetail(resellerId);
      setData(result);
      setMarketCode(result.reseller.market_code || 'KE');
      setPriceOverride(result.reseller.price_override != null ? String(result.reseller.price_override) : '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  }, [resellerId]);

  useEffect(() => {
    if (resellerId) fetchData();
  }, [resellerId, fetchData]);

  const handleActivate = async () => {
    setActionLoading(true);
    try {
      await api.activateSubscription(resellerId, activateMonths);
      setShowActivateDialog(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    setActionLoading(true);
    try {
      await api.deactivateSubscription(resellerId);
      setShowSuspendDialog(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWaive = async () => {
    if (!waiveTarget) return;
    setActionLoading(true);
    try {
      await api.waiveInvoice(resellerId, waiveTarget.id);
      setShowWaiveDialog(false);
      setWaiveTarget(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyPayments = async () => {
    setVerifyLoading(true);
    try {
      const result = await api.verifySubscriptionPayments(resellerId);
      setVerifyResult({ message: result.message, count: result.verified_count });
      setShowVerifyDialog(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify payments');
      setShowVerifyDialog(false);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleSaveMarket = async () => {
    setMarketSaving(true);
    setMarketMsg(null);
    try {
      const override = priceOverride.trim();
      await api.editAdminSubscription(resellerId, {
        market_code: marketCode,
        ...(override ? { price_override: Number(override) } : { clear_price_override: true }),
      });
      setMarketMsg('Saved. Reprice any pending invoice issued under the old market.');
      fetchData();
    } catch (err) {
      setMarketMsg(err instanceof Error ? err.message : 'Failed to save market');
    } finally {
      setMarketSaving(false);
    }
  };

  const handleReprice = async () => {
    if (!repriceTarget) return;
    setActionLoading(true);
    try {
      await api.repriceInvoice(resellerId, repriceTarget.id);
      setRepriceTarget(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reprice invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFreeSetup = async () => {
    setActionLoading(true);
    try {
      await api.grantFreeSetup(
        resellerId,
        freeSetupGrants.length > 0 ? { override: true, override_reason: freeSetupReason.trim() } : {},
      );
      setShowFreeSetupDialog(false);
      setFreeSetupReason('');
      fetchData();
    } catch (err) {
      setShowFreeSetupDialog(false);
      setError(err instanceof Error ? err.message : 'Failed to give free setup time');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCard = async () => {
    if (!confirmCardTarget) return;
    setActionLoading(true);
    try {
      await api.confirmCardPayment(confirmCardTarget.id);
      setConfirmCardTarget(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm card payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Only M-Pesa payments can be verified against Safaricom; card payments are
  // confirmed one by one after checking PayAfrica.
  const pendingPaymentsCount = data?.payments.filter(p => p.status === 'pending' && p.payment_method === 'mpesa').length ?? 0;
  const market = data?.subscription.market;
  const freeSetupGrants = data?.free_setup?.grants ?? [];
  const lastFreeSetup = freeSetupGrants[0];
  const unpaidInvoices = data?.invoices.filter(i => i.status === 'pending' || i.status === 'overdue') ?? [];
  const unpaidTotal = sumByCurrency(unpaidInvoices.map(i => ({ amount: i.balance_remaining ?? i.final_charge, currency: i.currency })));
  // Worked out when the dialog is open, so "now" is the moment it was opened.
  const freeSetupEnd = new Date(Date.now() + FREE_SETUP_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const endDateStays = !!data?.subscription.expires_at
    && new Date(`${data.subscription.expires_at}Z`).getTime() > new Date(freeSetupEnd).getTime();

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Header
        title={data ? data.reseller.organization_name : 'Subscription Detail'}
        subtitle={data ? data.reseller.email : ''}
        backHref="/admin/subscriptions"
        action={
          data ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="text-sm px-3 py-2 rounded-xl border border-border text-foreground-muted hover:bg-background-tertiary transition-colors"
              >
                Edit
              </button>
              {data.subscription.status !== 'active' ? (
                <button
                  onClick={() => { setActivateMonths(1); setShowActivateDialog(true); }}
                  className="btn-primary text-sm px-3 py-2"
                >
                  Activate
                </button>
              ) : (
                <button
                  onClick={() => setShowSuspendDialog(true)}
                  className="text-sm px-3 py-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  Suspend
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-danger mb-4">{error}</p>
          <button onClick={fetchData} className="btn-primary px-4 py-2 text-sm">Retry</button>
        </div>
      ) : data ? (
        <>
          {/* Subscription Summary */}
          <div className="card p-5 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <SubscriptionStatusBadge status={data.subscription.status} size="md" />
                <p className="text-sm text-foreground-muted mt-2">
                  {data.reseller.business_name || data.reseller.organization_name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-foreground-muted">Total Paid</p>
                <p className="text-xl font-bold text-emerald-500">{formatMoney(data.subscription.total_paid, market?.subscription_currency)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-xs text-foreground-muted mb-0.5">Expires</p>
                <p className="text-sm font-medium text-foreground">{formatSafeDate(data.subscription.expires_at)}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted mb-0.5">Period Start</p>
                <p className="text-sm font-medium text-foreground">{formatSafeDate(data.subscription.current_period_start)}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted mb-0.5">Period End</p>
                <p className="text-sm font-medium text-foreground">{formatSafeDate(data.subscription.current_period_end)}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted mb-0.5">Invoices</p>
                <p className="text-sm font-medium text-foreground">{data.subscription.invoice_count}</p>
              </div>
            </div>
          </div>

          {/* Free setup time: one press per account, and the record of it */}
          <div className="card p-5 sm:p-6 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Free setup time</h3>
                {data.free_setup?.active ? (
                  <p className="text-xs text-emerald-500 mt-0.5">
                    On free setup until {formatEat(data.free_setup.until)}. No invoice, suspension or renewal SMS before then.
                  </p>
                ) : lastFreeSetup ? (
                  <p className="text-xs text-amber-500 mt-0.5">
                    Already used. It ended {formatEat(data.free_setup?.until)}.
                  </p>
                ) : (
                  <p className="text-xs text-foreground-muted mt-0.5">
                    For an account still setting up its router. Can be used once.
                  </p>
                )}
              </div>
              <button
                onClick={() => { setFreeSetupReason(''); setShowFreeSetupDialog(true); }}
                disabled={data.subscription.status === 'inactive'}
                className="w-full sm:w-auto text-sm px-3 py-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-colors font-medium sm:whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lastFreeSetup ? 'Give again: Free setup time (7 days)' : 'Free setup time (7 days)'}
              </button>
            </div>
            {data.subscription.status === 'inactive' && (
              <p className="text-xs text-foreground-muted">
                This account was set to inactive by hand. Change its status first.
              </p>
            )}
            {freeSetupGrants.length > 0 && (
              <ul className="pt-3 border-t border-border space-y-2">
                {freeSetupGrants.map((grant) => (
                  <li key={grant.id} className="text-xs text-foreground-muted break-words">
                    <span className="text-foreground font-medium">{formatEat(grant.granted_at)}</span>
                    {' '}by {grant.granted_by_email}.{' '}
                    {grant.waived_invoices.length > 0
                      ? `Waived ${grant.waived_invoices.length} invoice${grant.waived_invoices.length !== 1 ? 's' : ''} (${sumByCurrency(grant.waived_invoices.map(w => ({ amount: w.balance_waived, currency: w.currency })))}).`
                      : 'No invoice to waive.'}
                    {' '}Status {grant.previous_status} to {grant.new_status}. Free until {formatEat(grant.free_until)}.
                    {grant.is_override && grant.override_reason ? ` Given again: ${grant.override_reason}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Market: currency, pricing and how this reseller pays */}
          <div className="card p-5 sm:p-6 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <h3 className="text-sm font-semibold text-foreground">Market &amp; pricing</h3>
              {market && (
                <span className="text-xs text-foreground-muted">
                  Operates in {market.currency} &middot; billed{' '}
                  {market.subscription_pricing.kind === 'flat'
                    ? `${formatMoney(market.subscription_pricing.flat_amount, market.subscription_currency)}/month`
                    : `on usage, min ${formatMoney(market.subscription_pricing.minimum, market.subscription_currency)}`}
                  {' '}&middot; pays by {market.subscription_payment_methods.join(', ')}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2 items-end">
              <label className="text-xs text-foreground-muted">
                Market
                <select value={marketCode} onChange={(e) => setMarketCode(e.target.value)} className="input mt-1">
                  {MARKET_OPTIONS.map((m) => (
                    <option key={m.code} value={m.code}>{m.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-foreground-muted">
                Price override (optional)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceOverride}
                  onChange={(e) => setPriceOverride(e.target.value)}
                  placeholder="Market default"
                  className="input mt-1"
                />
              </label>
              <button onClick={handleSaveMarket} disabled={marketSaving} className="btn-primary text-sm px-4 py-2.5 disabled:opacity-50">
                {marketSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
            {marketMsg && <p className="text-xs text-foreground-muted">{marketMsg}</p>}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'invoices'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              Invoices ({data.invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'payments'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              Payments ({data.payments.length})
            </button>
          </div>

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="space-y-2">
              {data.invoices.length === 0 ? (
                <div className="card p-6 text-center">
                  <p className="text-sm text-foreground-muted">No invoices yet</p>
                </div>
              ) : (
                data.invoices.map((inv) => (
                  <div key={inv.id} className="card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <InvoiceStatusBadge status={inv.status} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{inv.period_label}</p>
                        <p className="text-xs text-foreground-muted">{inv.human_message || formatSafeDate(inv.due_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">{formatMoney(inv.final_charge, inv.currency)}</span>
                      {(inv.status === 'pending' || inv.status === 'overdue') && (
                        <button
                          onClick={() => setRepriceTarget(inv)}
                          className="text-xs px-2 py-1 rounded-lg border border-border text-foreground-muted hover:bg-background-tertiary transition-colors"
                        >
                          Reprice
                        </button>
                      )}
                      {(inv.status === 'pending' || inv.status === 'overdue') && (
                        <button
                          onClick={() => { setWaiveTarget(inv); setShowWaiveDialog(true); }}
                          className="text-xs px-2 py-1 rounded-lg border border-border text-foreground-muted hover:bg-background-tertiary transition-colors"
                        >
                          Waive
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-2">
              {verifyResult && (
                <div className="card p-3 bg-emerald-500/10 border-emerald-500/20 flex items-center justify-between">
                  <p className="text-sm text-emerald-500">
                    {verifyResult.message} ({verifyResult.count} payment{verifyResult.count !== 1 ? 's' : ''} verified)
                  </p>
                  <button onClick={() => setVerifyResult(null)} className="text-emerald-500 hover:text-emerald-400 text-xs">
                    Dismiss
                  </button>
                </div>
              )}

              {pendingPaymentsCount > 0 && (
                <div className="card p-4 bg-yellow-500/5 border-yellow-500/20 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {pendingPaymentsCount} unverified payment{pendingPaymentsCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-foreground-muted">Manually verify payments that were made but not confirmed</p>
                  </div>
                  <button
                    onClick={() => setShowVerifyDialog(true)}
                    className="text-sm px-3 py-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-colors font-medium whitespace-nowrap"
                  >
                    Verify Payments
                  </button>
                </div>
              )}

              {data.payments.length === 0 ? (
                <div className="card p-6 text-center">
                  <p className="text-sm text-foreground-muted">No payments yet</p>
                </div>
              ) : (
                data.payments.map((p) => (
                  <div key={p.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{formatWithKes(p.amount, p.currency, p.amount_kes)}</p>
                      <p className="text-xs text-foreground-muted">
                        {p.payment_method.toUpperCase()} &mdash; {p.payment_reference}
                      </p>
                    </div>
                    <div className="text-right">
                      {p.payment_method === 'card' && p.status === 'pending' && (
                        <button
                          onClick={() => setConfirmCardTarget(p)}
                          className="block ml-auto text-xs px-2 py-1 mb-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                        >
                          Confirm card payment
                        </button>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                        p.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>{p.status}</span>
                      <p className="text-xs text-foreground-muted mt-1">{formatSafeDate(p.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      ) : null}

      {/* Dialogs */}
      <ConfirmDialog
        isOpen={showActivateDialog}
        onClose={() => setShowActivateDialog(false)}
        onConfirm={handleActivate}
        title="Activate Subscription"
        message={`Activate for ${activateMonths} month(s)?`}
        confirmLabel="Activate"
        variant="primary"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={showSuspendDialog}
        onClose={() => setShowSuspendDialog(false)}
        onConfirm={handleSuspend}
        title="Suspend Subscription"
        message="This will block the reseller from using the system. Are you sure?"
        confirmLabel="Suspend"
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={showWaiveDialog}
        onClose={() => { setShowWaiveDialog(false); setWaiveTarget(null); }}
        onConfirm={handleWaive}
        title="Waive Invoice"
        message={waiveTarget ? `Waive the ${waiveTarget.period_label} invoice (${formatMoney(waiveTarget.final_charge, waiveTarget.currency)})?` : ''}
        confirmLabel="Waive"
        variant="warning"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={showVerifyDialog}
        onClose={() => setShowVerifyDialog(false)}
        onConfirm={handleVerifyPayments}
        title="Verify Payments"
        message={`Manually verify ${pendingPaymentsCount} pending payment${pendingPaymentsCount !== 1 ? 's' : ''} for this reseller? This will mark them as completed and update the associated invoices.`}
        confirmLabel="Verify Payments"
        variant="primary"
        loading={verifyLoading}
      />

      <ConfirmDialog
        isOpen={!!repriceTarget}
        onClose={() => setRepriceTarget(null)}
        onConfirm={handleReprice}
        title="Reprice Invoice"
        message={repriceTarget ? `Recompute the ${repriceTarget.period_label} invoice (${formatMoney(repriceTarget.final_charge, repriceTarget.currency)}) with this reseller's current market pricing?` : ''}
        confirmLabel="Reprice"
        variant="warning"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={!!confirmCardTarget}
        onClose={() => setConfirmCardTarget(null)}
        onConfirm={handleConfirmCard}
        title="Confirm Card Payment"
        message={confirmCardTarget ? `Only confirm after you have seen ${formatMoney(confirmCardTarget.amount, confirmCardTarget.currency)} arrive in PayAfrica (our reference ${confirmCardTarget.payment_reference}). This marks the invoice paid and activates the reseller.` : ''}
        confirmLabel="Confirm & activate"
        variant="primary"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={showFreeSetupDialog}
        onClose={() => setShowFreeSetupDialog(false)}
        onConfirm={handleFreeSetup}
        title="Free setup time (7 days)"
        message={data ? `For ${data.reseller.organization_name}, this will:` : ''}
        confirmLabel={lastFreeSetup ? 'Give again' : 'Give free setup time'}
        variant="warning"
        loading={actionLoading}
        confirmDisabled={freeSetupGrants.length > 0 && !freeSetupReason.trim()}
      >
        <ul className="list-disc pl-5 -mt-4 mb-4 space-y-1 text-sm text-foreground-muted">
          <li>
            {unpaidInvoices.length > 0
              ? `Waive ${unpaidInvoices.length} unpaid invoice${unpaidInvoices.length !== 1 ? 's' : ''}: ${unpaidTotal}`
              : 'Waive nothing: there is no unpaid invoice'}
          </li>
          {data?.subscription.status === 'suspended' && <li>Lift the suspension</li>}
          <li>
            {endDateStays
              ? `Keep the end date of ${formatEat(data?.subscription.expires_at)}`
              : `Set the end date to ${formatEat(freeSetupEnd)}`}
          </li>
          <li>Send no invoice, suspension or renewal SMS for 7 days. Normal billing resumes after that.</li>
          <li>Record your login against it. It does not count as a sale or mark the lead as paying.</li>
        </ul>
        {lastFreeSetup && (
          <div className="mb-4 space-y-2">
            <p className="text-sm text-amber-500">
              Already used on {formatEat(lastFreeSetup.granted_at)} by {lastFreeSetup.granted_by_email}.
            </p>
            <label className="block text-xs text-foreground-muted">
              Why give it again?
              <textarea
                value={freeSetupReason}
                onChange={(e) => setFreeSetupReason(e.target.value)}
                maxLength={500}
                rows={2}
                className="input mt-1 w-full"
              />
            </label>
          </div>
        )}
      </ConfirmDialog>

      {/* Edit Modal */}
      {data && (
        <EditSubscriptionModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          resellerId={resellerId}
          currentStatus={data.subscription.status}
          currentExpiry={data.subscription.expires_at}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
