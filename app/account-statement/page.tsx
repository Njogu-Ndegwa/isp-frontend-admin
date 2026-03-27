'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { ResellerAccountStatement } from '../lib/types';
import { formatDateGMT3 } from '../lib/dateUtils';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import MobileDataCard from '../components/MobileDataCard';
import FilterDatePicker from '../components/FilterDatePicker';
import Pagination from '../components/Pagination';
import { SkeletonCard } from '../components/LoadingSpinner';

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

const formatKES = (amount: number | undefined | null): string => {
  return `KES ${(amount ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
    fetchStatement();
  }, [fetchStatement]);

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
        subtitle="Your balance, payouts, and charges"
      />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-danger mb-4">{error}</p>
          <button onClick={() => fetchStatement()} className="btn-primary px-4 py-2 text-sm">Retry</button>
        </div>
      ) : data ? (
        <>
          {/* Balance Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              title="Revenue Collected"
              value={formatKES(data.balance.total_system_collected)}
              accent="success"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1" /></svg>}
            />
            <StatCard
              title="Paid to You"
              value={formatKES(data.balance.total_paid_to_you)}
              accent="info"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              title="Charges / Fees"
              value={formatKES(data.balance.total_transaction_charges)}
              accent="warning"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              title="Unpaid Balance"
              value={formatKES(data.balance.unpaid_balance)}
              accent="primary"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            />
          </div>

          {/* Balance Breakdown */}
          <div className="card p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Balance Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-foreground-muted">M-Pesa Revenue (system collected)</span>
                <span className="font-medium text-emerald-500">{formatKES(data.balance.total_system_collected)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground-muted">Payouts (paid to you)</span>
                <span className="font-medium text-blue-500">- {formatKES(data.balance.total_paid_to_you)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground-muted">Transaction Charges (fees)</span>
                <span className="font-medium text-orange-500">- {formatKES(data.balance.total_transaction_charges)}</span>
              </div>
              <div className="border-t border-border pt-2 flex items-center justify-between">
                <span className="font-semibold">Net Unpaid Balance</span>
                <span className="font-bold text-lg">{formatKES(data.balance.unpaid_balance)}</span>
              </div>
            </div>
          </div>

          {/* Period Filter & Entries */}
          <div className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-foreground">Statement Entries</h3>
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
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="card p-3 bg-background-tertiary/50">
                  <p className="text-xs text-foreground-muted mb-0.5">Period Payouts</p>
                  <p className="text-lg font-bold text-emerald-500">{formatKES(data.period_summary.total_payouts)}</p>
                </div>
                <div className="card p-3 bg-background-tertiary/50">
                  <p className="text-xs text-foreground-muted mb-0.5">Period Charges</p>
                  <p className="text-lg font-bold text-amber-500">{formatKES(data.period_summary.total_charges)}</p>
                </div>
                <div className="card p-3 bg-background-tertiary/50">
                  <p className="text-xs text-foreground-muted mb-0.5">Net</p>
                  <p className="text-lg font-bold">{formatKES(data.period_summary.net)}</p>
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
                              {item.type === 'charge' ? '- ' : ''}{formatKES(item.amount)}
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
                      title={`${entry.type === 'charge' ? '- ' : ''}${formatKES(entry.amount)}`}
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
