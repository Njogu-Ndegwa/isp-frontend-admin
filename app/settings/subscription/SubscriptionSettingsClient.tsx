'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { SubscriptionOverview, SubscriptionInvoice } from '../../lib/types';
import SubscriptionStatusBadge from '../../components/SubscriptionStatusBadge';
import InvoiceStatusBadge from '../../components/InvoiceStatusBadge';
import PayInvoiceModal from '../../components/PayInvoiceModal';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatMoney } from '../../lib/format';
import { useT } from '../../lib/i18n';


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
  const t = useT();
  const [data, setData] = useState<SubscriptionOverview | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [requestingInvoice, setRequestingInvoice] = useState(false);
  const [requestInvoiceMsg, setRequestInvoiceMsg] = useState<string | null>(null);
  const [returnedFromCard, setReturnedFromCard] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [subscriptionResult, invoicesResult] = await Promise.all([
        api.getSubscription(),
        api.getSubscriptionInvoices(1, 5).catch(() => ({ invoices: [] as SubscriptionInvoice[] })),
      ]);
      setData(subscriptionResult);
      setRecentInvoices(invoicesResult.invoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to load subscription'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleRequestInvoice = async () => {
    setRequestingInvoice(true);
    setRequestInvoiceMsg(null);
    try {
      const result = await api.requestInvoice();
      setRequestInvoiceMsg(result.generated ? t('Invoice generated successfully') : t('You already have a pending invoice'));
      fetchData();
    } catch (err) {
      setRequestInvoiceMsg(err instanceof Error ? err.message : t('Failed to request invoice'));
    } finally {
      setRequestingInvoice(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Paystack sends the reseller back here after checkout. The redirect proves
  // nothing about the payment, so only acknowledge it; activation follows
  // once the payment is confirmed on our side.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('card') === 'returned') {
        setReturnedFromCard(true);
        params.delete('card');
        const rest = params.toString();
        window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''));
      }
    } catch {
      // ignore
    }
  }, []);

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
          <div className="p-5 text-center">
            <svg className="w-10 h-10 mx-auto text-danger mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-danger mb-3">{error}</p>
            <button onClick={fetchData} className="btn-primary px-4 py-2 text-sm">{t('Retry')}</button>
          </div>
        </section>
      </div>
    );
  }

  if (!data) return null;

  const daysUntilExpiry = data.expires_at ? getDaysUntil(data.expires_at) : null;
  const isTrial = data.status === 'trial';
  const trialDaysLeft = isTrial && data.expires_at ? getDaysUntil(data.expires_at) : null;
  const pendingInv = data.pending_invoice;
  const canPay = pendingInv && (pendingInv.status === 'pending' || pendingInv.status === 'overdue');
  const isExpiredOrSuspended = data.status === 'suspended' || data.status === 'inactive';
  const needsAction = canPay || isExpiredOrSuspended;
  const invoiceCurrency = pendingInv?.currency || 'KES';
  const money = (value: number | null | undefined) => formatMoney(value, invoiceCurrency);
  const pricing = pendingInv?.pricing_rule ?? data.market?.subscription_pricing;
  const isFlatPricing = pricing?.kind === 'flat';
  const minimumCharge = pricing?.kind === 'usage' ? pricing.minimum : 500;
  const hotspotRatePct = Math.round((pricing?.hotspot_rate ?? 0.03) * 1000) / 10;
  const perPppoe = pricing?.per_pppoe_user ?? 25;
  const payLabel = invoiceCurrency === 'KES' ? t('Pay via M-Pesa') : t('Pay by card');
  // International invoices are in USD; show what the reseller actually
  // collected in their own currency and the rate used to convert it.
  const localRevenueNote =
    pricing?.revenue_currency && pricing.revenue_currency !== invoiceCurrency && pricing.fx_rate
      ? t('{amount} at {rate} {from}/{to}', {
          amount: formatMoney(pricing.hotspot_revenue_local ?? 0, pricing.revenue_currency),
          rate: pricing.fx_rate.toLocaleString('en-US'),
          from: pricing.revenue_currency,
          to: invoiceCurrency,
        })
      : null;

  return (
    <div className="space-y-5 pb-24 md:pb-6">

      {returnedFromCard && (
        <div className="rounded-2xl p-4 sm:p-5 bg-emerald-500/10 border border-emerald-500/25 text-sm text-foreground">
          <p className="font-semibold text-emerald-500">{t('Thanks, we have your card payment')}</p>
          <p className="mt-1 text-foreground-muted">
            {t("Your subscription will be activated as soon as the payment is confirmed. You don't need to pay again.")}
          </p>
        </div>
      )}

      {/* --- Section 1: Urgent Action Banner --- */}
      {needsAction && pendingInv && (
        <div className={`rounded-2xl p-4 sm:p-5 ${
          pendingInv.is_overdue
            ? 'bg-red-500/10 border border-red-500/25'
            : 'bg-amber-500/10 border border-amber-500/25'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              pendingInv.is_overdue ? 'bg-red-500/20' : 'bg-amber-500/20'
            }`}>
              <svg className={`w-5 h-5 ${pendingInv.is_overdue ? 'text-red-500' : 'text-amber-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${pendingInv.is_overdue ? 'text-red-500' : 'text-amber-500'}`}>
                {pendingInv.is_overdue ? t('Payment Overdue') : t('Payment Due Soon')}
              </p>
              <p className="text-sm text-foreground mt-0.5">
                <span className="font-bold">{money(pendingInv.final_charge)}</span>
                {' '}{t('due {date}', { date: formatSafeDate(pendingInv.due_date) })}
              </p>
            </div>
            <button
              onClick={() => setShowPayModal(true)}
              className="btn-primary w-full sm:w-auto px-6 py-3 text-sm font-semibold flex items-center justify-center gap-2 active:opacity-70 touch-manipulation"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
              {t('Pay Now')}
            </button>
          </div>
        </div>
      )}

      {/* Expired/Suspended without invoice */}
      {isExpiredOrSuspended && !pendingInv && (
        <div className="rounded-2xl p-4 sm:p-5 bg-red-500/10 border border-red-500/25">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-red-500/20">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-500">
                {data.status === 'suspended' ? t('Subscription Suspended') : t('Subscription Inactive')}
              </p>
              <p className="text-sm text-foreground-muted mt-0.5">
                {t('Request an invoice to renew your subscription')}
              </p>
            </div>
            <button
              onClick={handleRequestInvoice}
              disabled={requestingInvoice}
              className="btn-primary w-full sm:w-auto px-6 py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:opacity-70 touch-manipulation"
            >
              {requestingInvoice ? (
                <>
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  {t('Requesting...')}
                </>
              ) : (
                t('Request Invoice')
              )}
            </button>
          </div>
          {requestInvoiceMsg && (
            <p className="text-xs text-foreground-muted mt-2 pl-14">{requestInvoiceMsg}</p>
          )}
        </div>
      )}

      {/* --- Section 2: Subscription Status (compact) --- */}
      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <SubscriptionStatusBadge status={data.status} size="md" />
              {isTrial && (
                <span className="text-xs text-foreground-muted hidden sm:inline">{t('Free trial')}</span>
              )}
            </div>
            {daysUntilExpiry !== null && (
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold ${
                  daysUntilExpiry <= 0 ? 'text-red-500' :
                  daysUntilExpiry <= 3 ? 'text-red-500' :
                  daysUntilExpiry <= 7 ? 'text-amber-500' : 'text-foreground'
                }`}>
                  {daysUntilExpiry > 0 ? t('{days}d left', { days: daysUntilExpiry }) : t('Expired {days}d ago', { days: Math.abs(daysUntilExpiry) })}
                </p>
                <p className="text-[11px] text-foreground-muted mt-0.5">
                  {daysUntilExpiry > 0
                    ? t('Expires {date}', { date: formatSafeDate(data.expires_at) })
                    : t('Expired {date}', { date: formatSafeDate(data.expires_at) })}
                </p>
              </div>
            )}
          </div>

          {isTrial && trialDaysLeft !== null && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-xs text-foreground-muted mb-1.5">
                <span>{t('Trial progress')}</span>
                <span>{t('{count} of 7 days', { count: Math.max(0, 7 - trialDaysLeft) })}</span>
              </div>
              <div className="w-full h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((7 - Math.max(0, trialDaysLeft)) / 7) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* --- Section 3: Pending Invoice with Inline Breakdown --- */}
      {pendingInv && (
        <section className={`rounded-2xl bg-background-secondary border overflow-hidden ${
          pendingInv.is_overdue ? 'border-red-500/30' : 'border-amber-500/30'
        }`}>
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">{t('Current Invoice')}</h2>
              <p className="text-xs text-foreground-muted mt-0.5">{pendingInv.period_label}</p>
            </div>
            <span className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
              pendingInv.is_overdue
                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
              {pendingInv.is_overdue ? t('Overdue') : t('Due Soon')}
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {/* Inline charge breakdown */}
            <div className="space-y-2.5">
              {(pendingInv.hotspot_revenue != null && pendingInv.hotspot_revenue > 0) && (
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-foreground">{t('Hotspot Revenue')}</p>
                    <p className="text-xs text-foreground-muted">{money(pendingInv.hotspot_revenue)} x {hotspotRatePct}%</p>
                    {localRevenueNote && (
                      <p className="text-[11px] text-foreground-muted/70">{localRevenueNote}</p>
                    )}
                  </div>
                  <span className="font-medium text-foreground">{money(pendingInv.hotspot_charge ?? 0)}</span>
                </div>
              )}

              {(pendingInv.pppoe_user_count != null && pendingInv.pppoe_user_count > 0) && (
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-foreground">{t('PPPoE Users')}</p>
                    <p className="text-xs text-foreground-muted">{t('{count} users x {price}', { count: pendingInv.pppoe_user_count, price: money(perPppoe) })}</p>
                  </div>
                  <span className="font-medium text-foreground">{money(pendingInv.pppoe_charge ?? 0)}</span>
                </div>
              )}

              <div className="border-t border-border pt-2.5 space-y-2">
                {pendingInv.gross_charge != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground-muted">{isFlatPricing ? t('Monthly subscription') : t('Subtotal')}</span>
                    <span className="text-foreground">{money(pendingInv.gross_charge)}</span>
                  </div>
                )}

                {!isFlatPricing && pendingInv.gross_charge != null && pendingInv.gross_charge < minimumCharge && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground-muted">{t('Minimum charge applied')}</span>
                    <span className="text-amber-500">{money(minimumCharge)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-sm font-semibold text-foreground">{t('Total Due')}</span>
                  <span className="text-lg font-bold text-foreground">{money(pendingInv.final_charge)}</span>
                </div>

                {(pendingInv.amount_paid != null && pendingInv.amount_paid > 0) && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground-muted">{t('Paid')}</span>
                      <span className="text-emerald-500 font-medium">{money(pendingInv.amount_paid)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="text-foreground">{t('Balance')}</span>
                      <span className={`text-base ${(pendingInv.balance_remaining ?? 0) > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {money(pendingInv.balance_remaining ?? 0)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Due date + message */}
            {pendingInv.human_message && (
              <p className={`text-xs ${pendingInv.is_overdue ? 'text-red-400' : 'text-amber-400'}`}>
                {pendingInv.human_message}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={() => setShowPayModal(true)}
                className="btn-primary w-full sm:w-auto px-6 py-3 text-sm font-semibold flex items-center justify-center gap-2 active:opacity-70 touch-manipulation"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
                {payLabel}
              </button>
              <Link
                href={`/settings/subscription/invoices/${pendingInv.id}`}
                className="w-full sm:w-auto px-6 py-3 text-sm text-center text-foreground-muted hover:text-foreground border border-border rounded-xl hover:bg-background-tertiary transition-colors active:opacity-70 touch-manipulation"
              >
                {t('View full invoice')}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* --- Section 4: Recent Invoices --- */}
      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{t('Recent Invoices')}</h2>
          <Link
            href="/settings/subscription/invoices"
            className="text-xs text-accent-primary hover:underline active:opacity-70 touch-manipulation"
          >
            {t('View all')}
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="p-5 text-center">
            <p className="text-sm text-foreground-muted">{t('No invoices yet')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentInvoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/settings/subscription/invoices/${inv.id}`}
                className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-background-tertiary transition-colors active:opacity-70 touch-manipulation group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{inv.period_label}</p>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    {t('Due {date}', { date: formatSafeDate(inv.due_date) })}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatMoney(inv.final_charge, inv.currency)}</p>
                  </div>
                  <InvoiceStatusBadge status={inv.status} />
                  <svg className="w-4 h-4 text-foreground-muted group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Quick links */}
        <div className="p-4 sm:p-5 border-t border-border flex items-center gap-4">
          <Link
            href="/settings/subscription/payments"
            className="text-xs text-accent-primary hover:underline active:opacity-70 touch-manipulation flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
            {t('Payment history')}
          </Link>
        </div>
      </section>

      {/* --- Section 5: Quick Actions (Request Invoice) --- */}
      {!pendingInv && !isExpiredOrSuspended && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            onClick={handleRequestInvoice}
            disabled={requestingInvoice}
            className="text-sm px-4 py-2.5 rounded-xl border border-border text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors disabled:opacity-50 flex items-center gap-2 active:opacity-70 touch-manipulation"
          >
            {requestingInvoice ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                {t('Requesting...')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                {t('Request Invoice')}
              </>
            )}
          </button>
          {requestInvoiceMsg && (
            <span className="text-xs text-foreground-muted">{requestInvoiceMsg}</span>
          )}
        </div>
      )}

      {/* Pay / Renew Modal */}
      {pendingInv && (
        <PayInvoiceModal
          isOpen={showPayModal}
          onClose={() => setShowPayModal(false)}
          invoice={pendingInv}
          onPaymentComplete={fetchData}
        />
      )}
    </div>
  );
}
