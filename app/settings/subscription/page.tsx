'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { SubscriptionOverview } from '../../lib/types';
import SubscriptionStatusBadge from '../../components/SubscriptionStatusBadge';
import PayInvoiceModal from '../../components/PayInvoiceModal';
import { PageLoader } from '../../components/LoadingSpinner';

const formatKES = (amount: number): string =>
  `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

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

function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  try {
    const target = new Date(dateStr);
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

export default function SubscriptionSettingsPage() {
  const [data, setData] = useState<SubscriptionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [requestingInvoice, setRequestingInvoice] = useState(false);
  const [requestInvoiceMsg, setRequestInvoiceMsg] = useState<string | null>(null);

  const handleRequestInvoice = async () => {
    setRequestingInvoice(true);
    setRequestInvoiceMsg(null);
    try {
      const result = await api.requestInvoice();
      if (result.generated) {
        setRequestInvoiceMsg('Invoice generated successfully');
      } else {
        setRequestInvoiceMsg('You already have a pending invoice');
      }
      fetchData();
    } catch (err) {
      setRequestInvoiceMsg(err instanceof Error ? err.message : 'Failed to request invoice');
    } finally {
      setRequestingInvoice(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getSubscription();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="max-w-2xl space-y-6">
        <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
          <div className="p-5 text-center">
            <svg className="w-10 h-10 mx-auto text-danger mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-danger mb-3">{error}</p>
            <button onClick={fetchData} className="btn-primary px-4 py-2 text-sm">Retry</button>
          </div>
        </section>
      </div>
    );
  }

  if (!data) return null;

  const daysUntilExpiry = data.expires_at ? getDaysUntil(data.expires_at) : null;
  const isTrial = data.status === 'trial';
  const trialDaysLeft = isTrial && data.expires_at ? getDaysUntil(data.expires_at) : null;
  const canRenew = data.pending_invoice && (data.pending_invoice.status === 'pending' || data.pending_invoice.status === 'overdue');
  const isExpiredOrSuspended = data.status === 'suspended' || data.status === 'inactive';

  return (
    <div className="max-w-2xl space-y-6 pb-24 md:pb-6">
      {/* Section 1: Subscription Plan */}
      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Subscription Plan</h2>
          <p className="text-xs text-foreground-muted mt-0.5">Your current plan status and expiry details</p>
        </div>
        <div className="p-5 space-y-4">
          {/* Status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SubscriptionStatusBadge status={data.status} size="md" />
              {isTrial && (
                <span className="text-xs text-foreground-muted">Free trial period</span>
              )}
            </div>
            {(canRenew || isExpiredOrSuspended) && (
              <button
                onClick={() => setShowPayModal(true)}
                className="btn-primary px-5 py-2 text-sm font-semibold flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                Renew Subscription
              </button>
            )}
          </div>

          {/* Expiry details */}
          {daysUntilExpiry !== null && (
            <div className="flex items-center justify-between rounded-xl bg-background-tertiary/50 p-4">
              <div>
                <p className="text-xs text-foreground-muted">
                  {daysUntilExpiry > 0 ? 'Expires in' : 'Expired'}
                </p>
                <p className={`text-xl font-bold mt-0.5 ${
                  daysUntilExpiry <= 3 ? 'text-red-500' :
                  daysUntilExpiry <= 7 ? 'text-amber-500' : 'text-foreground'
                }`}>
                  {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : `${Math.abs(daysUntilExpiry)} days ago`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-foreground-muted">Expiry Date</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{formatSafeDate(data.expires_at)}</p>
              </div>
            </div>
          )}

          {/* Trial progress */}
          {isTrial && trialDaysLeft !== null && (
            <div>
              <div className="flex items-center justify-between text-xs text-foreground-muted mb-1.5">
                <span>Trial Progress</span>
                <span>{Math.max(0, 7 - trialDaysLeft)} / 7 days used</span>
              </div>
              <div className="w-full h-2 bg-background-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((7 - Math.max(0, trialDaysLeft)) / 7) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Period & key details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-background-tertiary/50 p-3">
              <p className="text-[10px] text-foreground-muted uppercase tracking-wider">Period Start</p>
              <p className="text-sm font-medium text-foreground mt-1">{formatSafeDate(data.current_period_start)}</p>
            </div>
            <div className="rounded-xl bg-background-tertiary/50 p-3">
              <p className="text-[10px] text-foreground-muted uppercase tracking-wider">Period End</p>
              <p className="text-sm font-medium text-foreground mt-1">{formatSafeDate(data.current_period_end)}</p>
            </div>
            <div className="rounded-xl bg-background-tertiary/50 p-3">
              <p className="text-[10px] text-foreground-muted uppercase tracking-wider">Total Paid</p>
              <p className="text-sm font-semibold text-emerald-500 mt-1">{formatKES(data.total_paid)}</p>
            </div>
            <div className="rounded-xl bg-background-tertiary/50 p-3">
              <p className="text-[10px] text-foreground-muted uppercase tracking-wider">Invoices</p>
              <p className="text-sm font-medium text-foreground mt-1">{data.invoice_count} total</p>
            </div>
          </div>
          {/* Request Invoice */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRequestInvoice}
              disabled={requestingInvoice}
              className="text-sm px-4 py-2 rounded-xl border border-border text-foreground-muted hover:bg-background-tertiary transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {requestingInvoice ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  Request Invoice
                </>
              )}
            </button>
            {requestInvoiceMsg && (
              <span className="text-xs text-foreground-muted">{requestInvoiceMsg}</span>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: Current Invoice (if pending) */}
      {data.pending_invoice && (
        <section className={`rounded-2xl bg-background-secondary border overflow-hidden ${
          data.pending_invoice.is_overdue ? 'border-red-500/30' : 'border-amber-500/30'
        }`}>
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Current Invoice</h2>
              <p className="text-xs text-foreground-muted mt-0.5">{data.pending_invoice.period_label}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
              data.pending_invoice.is_overdue
                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
              {data.pending_invoice.is_overdue ? 'Overdue' : 'Due Soon'}
            </span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{formatKES(data.pending_invoice.final_charge)}</p>
                <p className={`text-sm mt-1 ${
                  data.pending_invoice.is_overdue ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {data.pending_invoice.human_message}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => setShowPayModal(true)}
                  className="btn-primary px-5 py-2.5 text-sm font-semibold flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                  Pay via M-Pesa
                </button>
                <Link
                  href={`/settings/subscription/invoices/${data.pending_invoice.id}`}
                  className="text-xs text-foreground-muted hover:text-foreground transition-colors"
                >
                  View full invoice →
                </Link>
              </div>
            </div>

            <div className="text-xs text-foreground-muted">
              Due: {formatSafeDate(data.pending_invoice.due_date)}
            </div>
          </div>
        </section>
      )}

      {/* Section 3: Billing History */}
      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Billing History</h2>
          <p className="text-xs text-foreground-muted mt-0.5">View past invoices and payment records</p>
        </div>
        <div className="divide-y divide-border">
          <Link
            href="/settings/subscription/invoices"
            className="flex items-center gap-4 p-5 hover:bg-background-tertiary transition-colors group"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:bg-amber-500/15 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Invoices</h3>
              <p className="text-xs text-foreground-muted mt-0.5">{data.invoice_count} invoices generated</p>
            </div>
            <svg className="w-5 h-5 text-foreground-muted group-hover:text-foreground transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/settings/subscription/payments"
            className="flex items-center gap-4 p-5 hover:bg-background-tertiary transition-colors group"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500/15 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Payments</h3>
              <p className="text-xs text-foreground-muted mt-0.5">View payment records &amp; receipts</p>
            </div>
            <svg className="w-5 h-5 text-foreground-muted group-hover:text-foreground transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Pay / Renew Modal */}
      {data.pending_invoice && (
        <PayInvoiceModal
          isOpen={showPayModal}
          onClose={() => setShowPayModal(false)}
          invoice={data.pending_invoice}
          onPaymentComplete={fetchData}
        />
      )}
    </div>
  );
}
