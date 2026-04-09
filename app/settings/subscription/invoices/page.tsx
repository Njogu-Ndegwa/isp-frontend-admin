'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { SubscriptionInvoice } from '../../../lib/types';
import InvoiceStatusBadge from '../../../components/InvoiceStatusBadge';
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
    return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '-';
  }
};

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'waived', label: 'Waived' },
];

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getSubscriptionInvoices(page, 20, statusFilter || undefined);
      setInvoices(result.invoices);
      setTotalPages(result.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    setPage(1);
  };

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
        <h2 className="text-lg font-semibold text-foreground">Invoices</h2>
        <p className="text-xs text-foreground-muted mt-0.5">Your subscription billing history</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              statusFilter === f.value
                ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20'
                : 'border border-border text-foreground-muted hover:bg-background-tertiary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-background-secondary border border-border p-8 text-center">
          <p className="text-sm text-danger mb-3">{error}</p>
          <button onClick={fetchInvoices} className="btn-primary px-4 py-2 text-sm">Retry</button>
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-2xl bg-background-secondary border border-border p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-foreground-muted/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <p className="text-sm text-foreground-muted">No invoices found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <DataTable
              columns={[
                { key: 'period', label: 'Period' },
                { key: 'amount', label: 'Amount', className: 'text-right' },
                { key: 'status', label: 'Status' },
                { key: 'due_date', label: 'Due Date' },
                { key: 'message', label: 'Message' },
              ]}
              data={invoices}
              rowKey={(inv) => inv.id}
              renderCell={(inv, col) => {
                switch (col) {
                  case 'period': return <span className="font-medium">{inv.period_label}</span>;
                  case 'amount': return <span className="font-semibold">{formatKES(inv.final_charge)}</span>;
                  case 'status': return <InvoiceStatusBadge status={inv.status} />;
                  case 'due_date': return <span className="text-foreground-muted text-sm">{formatSafeDate(inv.due_date)}</span>;
                  case 'message': return <span className={`text-sm ${inv.is_overdue ? 'text-red-500' : inv.is_due_soon ? 'text-amber-500' : 'text-foreground-muted'}`}>{inv.human_message || '-'}</span>;
                  default: return null;
                }
              }}
              onRowClick={(inv) => { window.location.href = `/settings/subscription/invoices/${inv.id}`; }}
              emptyState={{ message: 'No invoices found' }}
            />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {invoices.map((inv) => (
              <Link key={inv.id} href={`/settings/subscription/invoices/${inv.id}`}>
                <MobileDataCard
                  id={inv.id}
                  title={inv.period_label}
                  subtitle={inv.human_message || formatSafeDate(inv.due_date)}
                  avatar={{ text: inv.status.charAt(0).toUpperCase(), color: inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : 'warning' }}
                  status={{ label: inv.status, variant: inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : inv.status === 'waived' ? 'neutral' : 'warning' }}
                  value={{ text: formatKES(inv.final_charge) }}
                  layout="compact"
                />
              </Link>
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
