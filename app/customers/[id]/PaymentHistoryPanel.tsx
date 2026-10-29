'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { CustomerOutageCredit, CustomerPaymentSummary, MpesaTransaction } from '../../lib/types';
import { formatDateGMT3 } from '../../lib/dateUtils';
import { formatAmount } from '../../lib/format';
import { useAlert } from '../../context/AlertContext';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../lib/permissions';
import {
  PaymentTag, buildTimeline, describePayment, formatCreditedTime, summarizePayments, walletChange,
} from './paymentHistory';

const COLLAPSED_ROWS = 5;

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-warning',
  failed: 'badge-danger',
  expired: 'badge-neutral',
};

const formatSafeDate = (dateStr: string | null | undefined): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return formatDateGMT3(dateStr, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    console.error('Date error:', e);
    return '-';
  }
};

function Tag({ tag }: { tag: PaymentTag }) {
  switch (tag.kind) {
    case 'status':
      return <span className={`badge ${STATUS_BADGE[tag.status] || 'badge-neutral'} capitalize`}>{tag.status}</span>;
    case 'underpaid':
      return <span className="badge badge-warning">Underpaid — not applied</span>;
    case 'not_charged':
      return <span className="badge badge-neutral">Not charged</span>;
    case 'activating':
      return <span className="badge badge-warning">Activating</span>;
    case 'not_delivered':
      return (
        <span className="badge badge-danger" title={tag.error || undefined}>Paid — not delivered</span>
      );
  }
}

export default function PaymentHistoryPanel({ customerId }: { customerId: number }) {
  const { showAlert } = useAlert();
  // Each payment comes from the transactions list (transactions.view);
  // re-provisioning one needs transactions.manage. The totals (payment
  // summary) are customer data and load for anyone who can see the customer.
  const { can } = usePermissions();
  const canSeePayments = can(PERMISSIONS.transactionsView);
  const canProvision = can(PERMISSIONS.transactionsManage);
  const [rows, setRows] = useState<MpesaTransaction[] | null>(null);
  const [summary, setSummary] = useState<CustomerPaymentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [provisioningId, setProvisioningId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (canSeePayments) {
      api.getCustomerPayments(customerId)
        .then((data) => { if (!cancelled) setRows(data); })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load payments');
        });
    }
    // Totals fall back to the loaded rows when the summary is unavailable.
    api.getCustomerPaymentSummary(customerId)
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [customerId, reloadKey, canSeePayments]);

  const handleProvision = useCallback(async (tx: MpesaTransaction) => {
    if (provisioningId) return;
    setProvisioningId(tx.transaction_id);
    try {
      const result = await api.manualProvisionTransaction(tx.payment_method, tx.transaction_id);
      if (result.success) {
        showAlert('success', result.provisioning_result?.message || 'Payment provisioned');
        setReloadKey((k) => k + 1);
      } else {
        showAlert('error', result.provisioning_error || 'Provisioning failed');
      }
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to provision payment');
    } finally {
      setProvisioningId(null);
    }
  }, [provisioningId, showAlert]);

  const credits: CustomerOutageCredit[] = summary?.outage_credits ?? [];
  const totals = summary
    ? { totalPaid: summary.total_paid, paidCount: summary.paid_count, lastPaidAt: summary.last_paid_at }
    : rows ? summarizePayments(rows) : null;
  const timeline = rows ? buildTimeline(rows, credits) : [];
  const visible = expanded ? timeline : timeline.slice(0, COLLAPSED_ROWS);
  const hasUnderpaid = rows?.some((tx) => tx.source === 'c2b_paybill' && String(tx.status) === 'unmatched');

  return (
    <div className="card p-4 space-y-3" data-testid="payment-history">
      <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Payment History</h3>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!canSeePayments && (
        <div className="space-y-2" data-testid="payment-history-summary-only">
          {summary && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-background-tertiary/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-foreground-muted">Total paid</p>
                <p className="text-lg font-semibold text-success tabular-nums">{formatAmount(summary.total_paid)}</p>
                <p className="text-[11px] text-foreground-muted">
                  {summary.paid_count} payment{summary.paid_count === 1 ? '' : 's'}
                </p>
              </div>
              <div className="rounded-lg bg-background-tertiary/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-foreground-muted">Last paid</p>
                <p className="text-sm font-medium text-foreground mt-1">{formatSafeDate(summary.last_paid_at)}</p>
              </div>
            </div>
          )}
          <p className="text-xs text-foreground-muted">
            Ask the account owner for &quot;View transactions&quot; to see each payment.
          </p>
        </div>
      )}

      {canSeePayments && !error && rows === null && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-background-tertiary animate-pulse" />
          ))}
        </div>
      )}

      {rows && timeline.length === 0 && (
        <p className="text-sm text-foreground-muted">No payments recorded for this customer yet.</p>
      )}

      {rows && timeline.length > 0 && totals && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-background-tertiary/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-foreground-muted">Total paid</p>
              <p className="text-lg font-semibold text-success tabular-nums">{formatAmount(totals.totalPaid)}</p>
              <p className="text-[11px] text-foreground-muted">
                {totals.paidCount} payment{totals.paidCount === 1 ? '' : 's'}
              </p>
            </div>
            <div className="rounded-lg bg-background-tertiary/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-foreground-muted">Last paid</p>
              <p className="text-sm font-medium text-foreground mt-1">{formatSafeDate(totals.lastPaidAt)}</p>
            </div>
          </div>
          {summary && summary.not_charged_count > 0 && (
            <p className="text-[11px] text-foreground-muted">
              Plus {summary.not_charged_count} free or comped activation{summary.not_charged_count === 1 ? '' : 's'} (vouchers, trials) not counted as paid.
            </p>
          )}

          <ul className="divide-y divide-border">
            {visible.map((entry) => {
              if (entry.kind === 'credit') {
                const c = entry.credit;
                const failed = c.reprovision_state === 'failed' || c.reprovision_state === 'router_offline';
                return (
                  <li key={`credit-${c.id}`} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">Outage compensation</span>
                        {failed && (
                          <span className="badge badge-danger" title={c.reprovision_error || undefined}>Not re-activated</span>
                        )}
                      </div>
                      <p className="text-xs text-foreground-muted mt-0.5">
                        {formatSafeDate(c.credited_at)}
                        {c.expiry_after ? ` · expiry moved to ${formatSafeDate(c.expiry_after)}` : ''}
                      </p>
                      {c.note && <p className="text-[11px] text-foreground-muted truncate">{c.note}</p>}
                    </div>
                    <span className="text-sm font-semibold text-accent-primary tabular-nums whitespace-nowrap">
                      +{formatCreditedTime(c.seconds_credited)}
                    </span>
                  </li>
                );
              }

              const tx = entry.tx;
              const d = describePayment(tx);
              const receipt = tx.mpesa_receipt_number || tx.payment_reference || tx.reference;
              const showNotes = !tx.source && tx.payment_method !== 'mobile_money' && tx.notes;
              const wallet = walletChange(tx);
              return (
                <li key={`${tx.source || tx.payment_method}-${tx.transaction_id}`} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{d.label}</span>
                      {d.tags.map((tag) => <Tag key={tag.kind} tag={tag} />)}
                    </div>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      {formatSafeDate(entry.at)}
                      {tx.plan?.name ? ` · ${tx.plan.name}` : ''}
                    </p>
                    {receipt && <p className="text-[11px] font-mono text-foreground-muted truncate">{receipt}</p>}
                    {showNotes && <p className="text-[11px] text-foreground-muted truncate">{tx.notes}</p>}
                    {wallet && (
                      <p
                        className="text-[11px] text-foreground-muted"
                        title={wallet.estimated ? 'Worked out from the amounts paid and plan prices; a plan price change since then would make it differ.' : undefined}
                      >
                        Wallet {wallet.estimated ? '≈ ' : ''}{formatAmount(wallet.before)} → <span className={wallet.after > wallet.before ? 'text-success' : 'text-foreground'}>{formatAmount(wallet.after)}</span>
                        {wallet.estimated && ' (estimated)'}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`text-sm font-semibold tabular-nums whitespace-nowrap ${d.counted ? 'text-foreground' : 'text-foreground-muted line-through'}`}>
                      {formatAmount(tx.amount)}
                    </span>
                    {canProvision && d.canProvision && (
                      <button
                        type="button"
                        onClick={() => handleProvision(tx)}
                        disabled={provisioningId === tx.transaction_id}
                        className="text-[11px] font-medium px-2 py-1 rounded-md bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 disabled:opacity-50"
                      >
                        {provisioningId === tx.transaction_id ? 'Provisioning…' : 'Provision now'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {hasUnderpaid && (
            <Link href="/unmatched-payments" className="block text-xs text-accent-primary hover:underline">
              Resolve underpaid paybill payments →
            </Link>
          )}

          {timeline.length > COLLAPSED_ROWS && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-accent-primary hover:underline"
            >
              {expanded ? 'Show less' : `Show all ${timeline.length}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
