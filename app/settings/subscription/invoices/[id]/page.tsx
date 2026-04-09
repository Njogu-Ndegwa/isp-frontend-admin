'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { SubscriptionInvoice } from '../../../../lib/types';
import InvoiceStatusBadge from '../../../../components/InvoiceStatusBadge';
import InvoiceChargeBreakdown from '../../../../components/InvoiceChargeBreakdown';
import PayInvoiceModal from '../../../../components/PayInvoiceModal';
import { PageLoader } from '../../../../components/LoadingSpinner';

const formatKES = (amount: number): string =>
  `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const formatSafeDate = (dateStr: string | null | undefined): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '-';
  }
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = Number(params.id);
  const [invoice, setInvoice] = useState<SubscriptionInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!invoiceId || isNaN(invoiceId)) {
      setError('Invalid invoice ID');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await api.getSubscriptionInvoice(invoiceId);
      setInvoice(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  if (loading) return <PageLoader />;

  if (error || !invoice) {
    return (
      <div className="space-y-4 pb-24 md:pb-6">
        <Link
          href="/settings/subscription/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Invoices
        </Link>
        <div className="rounded-2xl bg-background-secondary border border-border p-8 text-center">
          <p className="text-sm text-danger mb-3">{error || 'Invoice not found'}</p>
          <button onClick={fetchInvoice} className="btn-primary px-4 py-2 text-sm">Retry</button>
        </div>
      </div>
    );
  }

  const canPay = invoice.status === 'pending' || invoice.status === 'overdue';

  return (
    <div className="max-w-2xl space-y-5 pb-24 md:pb-6">
      {/* Back nav */}
      <Link
        href="/settings/subscription/invoices"
        className="inline-flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Invoices
      </Link>

      {/* Invoice summary section */}
      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{invoice.period_label}</h2>
            <p className="text-xs text-foreground-muted mt-0.5">{invoice.human_message || ''}</p>
          </div>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{formatKES(invoice.final_charge)}</p>
              <p className="text-xs text-foreground-muted mt-1">Due: {formatSafeDate(invoice.due_date)}</p>
              {invoice.paid_at && (
                <p className="text-xs text-emerald-500 mt-0.5">Paid: {formatSafeDate(invoice.paid_at)}</p>
              )}
            </div>
            {canPay && (
              <button
                onClick={() => setShowPayModal(true)}
                className="btn-primary px-5 py-2.5 text-sm font-semibold flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
                Pay via M-Pesa
              </button>
            )}
          </div>

          {/* Period timeline */}
          <div className="flex items-center gap-4 text-xs text-foreground-muted border-t border-border pt-3">
            {invoice.period_start && <span>Period: {formatSafeDate(invoice.period_start)}</span>}
            {invoice.period_end && <span>to {formatSafeDate(invoice.period_end)}</span>}
            {invoice.created_at && <span className="ml-auto">Created: {formatSafeDate(invoice.created_at)}</span>}
          </div>
        </div>
      </section>

      {/* Charge Breakdown */}
      <InvoiceChargeBreakdown invoice={invoice} />

      {/* Payment records */}
      {invoice.payments && invoice.payments.length > 0 && (
        <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">Payment History</h2>
          </div>
          <div className="p-4 space-y-3">
            {invoice.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-background-tertiary/50">
                <div>
                  <p className="text-sm font-medium text-foreground">{formatKES(p.amount)}</p>
                  <p className="text-xs text-foreground-muted">
                    {p.payment_method.toUpperCase()} &mdash; {p.payment_reference}
                  </p>
                  {p.phone_number && (
                    <p className="text-xs text-foreground-muted">{p.phone_number}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                    p.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {p.status}
                  </span>
                  <p className="text-xs text-foreground-muted mt-1">{formatSafeDate(p.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pay Modal */}
      {canPay && (
        <PayInvoiceModal
          isOpen={showPayModal}
          onClose={() => setShowPayModal(false)}
          invoice={invoice}
          onPaymentComplete={fetchInvoice}
        />
      )}
    </div>
  );
}
