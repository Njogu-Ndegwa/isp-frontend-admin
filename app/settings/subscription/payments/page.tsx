'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { SubscriptionPayment } from '../../../lib/types';
import DataTable from '../../../components/DataTable';
import MobileDataCard from '../../../components/MobileDataCard';
import { SkeletonCard } from '../../../components/LoadingSpinner';

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

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getSubscriptionPayments(page, 20);
      setPayments(result.payments);
      setTotalPages(result.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return (
    <div className="space-y-5 pb-24 md:pb-6">
      {/* Header */}
      <div>
        <Link
          href="/settings/subscription"
          className="inline-flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors mb-3"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Subscription
        </Link>
        <h2 className="text-lg font-semibold text-foreground">Payment History</h2>
        <p className="text-xs text-foreground-muted mt-0.5">Your subscription payment records</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-background-secondary border border-border p-8 text-center">
          <p className="text-sm text-danger mb-3">{error}</p>
          <button onClick={fetchPayments} className="btn-primary px-4 py-2 text-sm">Retry</button>
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-2xl bg-background-secondary border border-border p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-foreground-muted/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
          <p className="text-sm text-foreground-muted">No payments yet</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <DataTable
              columns={[
                { key: 'date', label: 'Date' },
                { key: 'amount', label: 'Amount', className: 'text-right' },
                { key: 'method', label: 'Method' },
                { key: 'reference', label: 'Reference' },
                { key: 'status', label: 'Status' },
                { key: 'invoice', label: 'Invoice' },
              ]}
              data={payments}
              rowKey={(p) => p.id}
              renderCell={(p, col) => {
                switch (col) {
                  case 'date': return <span className="text-sm">{formatSafeDate(p.created_at)}</span>;
                  case 'amount': return <span className="font-semibold">{formatKES(p.amount)}</span>;
                  case 'method': return <span className="text-sm uppercase">{p.payment_method}</span>;
                  case 'reference': return <span className="text-sm text-foreground-muted font-mono">{p.payment_reference}</span>;
                  case 'status': return (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                      p.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>{p.status}</span>
                  );
                  case 'invoice': return p.invoice_id ? (
                    <Link href={`/settings/subscription/invoices/${p.invoice_id}`} className="text-sm text-accent-primary hover:underline">
                      #{p.invoice_id}
                    </Link>
                  ) : <span className="text-foreground-muted">-</span>;
                  default: return null;
                }
              }}
              emptyState={{ message: 'No payments found' }}
            />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {payments.map((p) => (
              <MobileDataCard
                key={p.id}
                id={p.id}
                title={formatKES(p.amount)}
                subtitle={`${p.payment_method.toUpperCase()} — ${p.payment_reference}`}
                avatar={{ text: 'M', color: p.status === 'completed' ? 'success' : p.status === 'pending' ? 'warning' : 'danger' }}
                status={{ label: p.status, variant: p.status === 'completed' ? 'success' : p.status === 'pending' ? 'warning' : 'danger' }}
                fields={[
                  { value: formatSafeDate(p.created_at) },
                  ...(p.invoice_id ? [{ value: `Invoice #${p.invoice_id}` }] : []),
                ]}
                layout="compact"
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-foreground-muted hover:bg-background-tertiary disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-xs text-foreground-muted">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-foreground-muted hover:bg-background-tertiary disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
