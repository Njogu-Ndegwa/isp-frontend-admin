'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { ResellerAccountStatement } from '../lib/types';
import { formatDateGMT3 } from '../lib/dateUtils';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import DataTable from '../components/DataTable';
import MobileDataCard from '../components/MobileDataCard';
import FilterDatePicker from '../components/FilterDatePicker';
import Pagination from '../components/Pagination';
import { SkeletonCard } from '../components/LoadingSpinner';
import { formatAmount } from '../lib/format';
import WithdrawCard from './WithdrawCard';

const formatSafeDate = (dateStr: string | null | undefined): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return formatDateGMT3(dateStr, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '-';
  }
};


export default function AccountStatementPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ResellerAccountStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [filterLoading, setFilterLoading] = useState(false);

  const fetchStatement = useCallback(async (p = 1, dateParams?: { start_date?: string; end_date?: string }, pp = perPage) => {
    try {
      if (dateParams || p !== 1) {
        setFilterLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const result = await api.getResellerAccountStatement({
        page: p,
        per_page: pp,
        start_date: dateParams?.start_date || startDate || undefined,
        end_date: dateParams?.end_date || endDate || undefined,
      });
      setData(result);
      setPage(result.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account statement');
    } finally {
      setLoading(false);
      setFilterLoading(false);
    }
  }, [startDate, endDate, perPage]);

  useEffect(() => {
    fetchStatement(1, undefined, perPage);
    // Refetch only on mount and page-size change; date filters fetch
    // explicitly via Apply/Clear. fetchStatement identity is intentionally
    // excluded so editing a date input doesn't trigger a fetch per change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perPage]);

  const handleApplyFilter = () => {
    fetchStatement(1, { start_date: startDate, end_date: endDate });
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setPage(1);
    fetchStatement(1, { start_date: '', end_date: '' });
  };

  if (user?.role === 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-foreground-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <h2 className="text-lg font-semibold mb-2">Reseller View Only</h2>
          <p className="text-foreground-muted text-sm">This page is for reseller accounts. Use the admin panel to view reseller details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      <Header
        title="Account Statement"
        subtitle="Money sent straight to you, and your balance with Bitwave"
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-danger mb-4">{error}</p>
          <button onClick={() => fetchStatement()} className="btn-primary px-4 py-2 text-sm">Retry</button>
        </div>
      ) : data ? (
        <>
          {/* Money overview: what went straight to the reseller vs what Bitwave holds */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <section className="card p-4 sm:p-5 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" aria-hidden="true" />
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">Sent directly to you</h2>
                  <p className="text-xs text-foreground-muted">Already in your paybill, till or bank</p>
                </div>
              </div>
              <p className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-emerald-500 break-words">
                {formatAmount(data.balance.total_direct_received ?? 0)}
              </p>
              <p className="mt-2 text-xs text-foreground-muted leading-relaxed">
                Customer payments that landed in your own account the moment they paid.
                Nothing to withdraw, and never part of your Bitwave balance.
              </p>
            </section>

            <section className="card p-4 sm:p-5 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1 bg-amber-500" aria-hidden="true" />
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10l9-6 9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18" /></svg>
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">Held by Bitwave for you</h2>
                  <p className="text-xs text-foreground-muted">Your balance, paid out on your schedule</p>
                </div>
              </div>
              <p className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-words">
                {formatAmount(data.balance.unpaid_balance)}
              </p>
              <dl className="mt-3 space-y-1.5 text-xs sm:text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-foreground-muted">Collected by Bitwave</dt>
                  <dd className="font-medium text-foreground tabular-nums">{formatAmount(data.balance.total_system_collected)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-foreground-muted">Paid out to you</dt>
                  <dd className="font-medium text-blue-500 tabular-nums">- {formatAmount(data.balance.total_paid_to_you)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-foreground-muted">Payout fees and charges</dt>
                  <dd className="font-medium text-orange-500 tabular-nums">- {formatAmount(data.balance.total_transaction_charges)}</dd>
                </div>
              </dl>
            </section>
          </div>

          {/* Withdraw + payout schedule */}
          <WithdrawCard onWithdrawn={() => fetchStatement(1)} />

          {/* Period Filter & Entries */}
          <div className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Payouts and charges</h3>
                <p className="text-xs text-foreground-muted">Movements on your Bitwave balance. Direct payments are listed on Transactions.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                <span className="text-xs text-foreground-muted">Filter:</span>
                <FilterDatePicker value={startDate} onChange={setStartDate} />
                <span className="text-foreground-muted text-xs">to</span>
                <FilterDatePicker value={endDate} onChange={setEndDate} />
                <button
                  onClick={handleApplyFilter}
                  disabled={filterLoading || (!startDate && !endDate)}
                  className="btn-primary text-xs px-3 py-1 disabled:opacity-40"
                >
                  {filterLoading ? 'Loading...' : 'Apply'}
                </button>
                {(startDate || endDate) && (
                  <button onClick={handleClearFilter} className="text-xs text-accent-primary hover:underline">
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Period Summary (show when date filters active) */}
            {(startDate || endDate) && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="card p-3 bg-background-tertiary/50">
                  <p className="text-xs text-foreground-muted mb-0.5">Sent directly to you</p>
                  <p className="text-lg font-bold text-emerald-500">{formatAmount(data.period_summary.direct_received ?? 0)}</p>
                </div>
                <div className="card p-3 bg-background-tertiary/50">
                  <p className="text-xs text-foreground-muted mb-0.5">Collected by Bitwave</p>
                  <p className="text-lg font-bold text-foreground">{formatAmount(data.period_summary.system_collected ?? 0)}</p>
                </div>
                <div className="card p-3 bg-background-tertiary/50">
                  <p className="text-xs text-foreground-muted mb-0.5">Paid out to you</p>
                  <p className="text-lg font-bold text-emerald-500">{formatAmount(data.period_summary.total_payouts)}</p>
                </div>
                <div className="card p-3 bg-background-tertiary/50">
                  <p className="text-xs text-foreground-muted mb-0.5">Fees and charges</p>
                  <p className="text-lg font-bold text-amber-500">{formatAmount(data.period_summary.total_charges)}</p>
                </div>
              </div>
            )}

            {/* Entries List */}
            {data.entries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-foreground-muted text-sm">No entries found</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <DataTable
                    columns={[
                      { key: 'type', label: 'Type', className: 'w-[90px]' },
                      { key: 'amount', label: 'Amount', className: 'text-right' },
                      { key: 'description', label: 'Description' },
                      { key: 'reference', label: 'Reference' },
                      { key: 'date', label: 'Date' },
                    ]}
                    data={data.entries}
                    rowKey={(item) => `${item.type}-${item.id}`}
                    renderCell={(item, col) => {
                      switch (col) {
                        case 'type':
                          return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.type === 'payout'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {item.type === 'payout' ? 'Payout' : 'Charge'}
                            </span>
                          );
                        case 'amount':
                          return (
                            <span className={`font-semibold ${item.type === 'payout' ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {item.type === 'charge' ? '- ' : ''}{formatAmount(item.amount)}
                            </span>
                          );
                        case 'description':
                          return (
                            <div>
                              <span className="text-sm">{item.description}</span>
                              {item.notes && <p className="text-xs text-foreground-muted mt-0.5">{item.notes}</p>}
                            </div>
                          );
                        case 'reference': return <span className="text-sm font-mono text-foreground-muted">{item.reference || '-'}</span>;
                        case 'date': return <span className="text-sm text-foreground-muted">{formatSafeDate(item.date)}</span>;
                        default: return null;
                      }
                    }}
                    emptyState={{ message: 'No entries found' }}
                  />
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2">
                  {data.entries.map((entry) => (
                    <MobileDataCard
                      key={`${entry.type}-${entry.id}`}
                      id={entry.id}
                      title={`${entry.type === 'charge' ? '- ' : ''}${formatAmount(entry.amount)}`}
                      subtitle={entry.description}
                      avatar={{
                        text: entry.type === 'payout' ? 'PO' : 'TC',
                        color: entry.type === 'payout' ? 'success' : 'warning',
                      }}
                      status={{
                        label: entry.type,
                        variant: entry.type === 'payout' ? 'success' : 'warning',
                      }}
                      fields={[
                        ...(entry.reference ? [{ label: 'Ref', value: entry.reference }] : []),
                        ...(entry.notes ? [{ label: 'Notes', value: entry.notes }] : []),
                      ]}
                      footer={
                        <span className="text-xs text-foreground-muted">{formatSafeDate(entry.date)}</span>
                      }
                    />
                  ))}
                </div>

                <Pagination
                  page={data.page}
                  perPage={perPage}
                  total={data.total_entries}
                  onPageChange={(p) => { setPage(p); fetchStatement(p); }}
                  onPerPageChange={(pp) => { setPerPage(pp); setPage(1); fetchStatement(1, undefined, pp); }}
                  loading={filterLoading}
                  noun="entries"
                />
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
