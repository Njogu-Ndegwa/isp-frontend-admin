'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { MpesaTransaction, TransactionSummary } from '../lib/types';
import { formatDateGMT3 } from '../lib/dateUtils';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';

type StatusFilter = 'all' | 'completed' | 'pending' | 'failed' | 'expired';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadData();
  }, [statusFilter, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const [txData, summaryData] = await Promise.all([
        api.getTransactions(
          1,
          undefined,
          dateRange.startDate || undefined,
          dateRange.endDate || undefined,
          status
        ),
        api.getTransactionSummary(
          1,
          undefined,
          dateRange.startDate || undefined,
          dateRange.endDate || undefined
        ),
      ]);
      setTransactions(txData);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        tx.phone_number.includes(query) ||
        tx.customer?.name.toLowerCase().includes(query) ||
        tx.mpesa_receipt_number?.toLowerCase().includes(query) ||
        tx.reference?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusBadge = (status: MpesaTransaction['status']) => {
    const badges = {
      completed: 'badge-success',
      pending: 'badge-warning',
      failed: 'badge-danger',
      expired: 'badge-neutral',
    };
    return badges[status] || 'badge-neutral';
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Transactions</h2>
          <p className="text-foreground-muted mb-4">{error}</p>
          <button onClick={loadData} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="M-Pesa Transactions" subtitle="View and manage payment transactions" />

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="animate-fade-in delay-1" style={{ opacity: 0 }}>
            <StatCard
              title="Total Transactions"
              value={summary.total_transactions}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
              accent="primary"
            />
          </div>
          <div className="animate-fade-in delay-2" style={{ opacity: 0 }}>
            <StatCard
              title="Total Amount"
              value={`KES ${summary.total_amount.toLocaleString()}`}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              accent="success"
            />
          </div>
          <div className="animate-fade-in delay-3" style={{ opacity: 0 }}>
            <StatCard
              title="Completed"
              value={summary.status_breakdown.completed?.count || 0}
              subtitle={`KES ${(summary.status_breakdown.completed?.amount || 0).toLocaleString()}`}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              accent="success"
            />
          </div>
          <div className="animate-fade-in delay-4" style={{ opacity: 0 }}>
            <StatCard
              title="Pending/Failed"
              value={(summary.status_breakdown.pending?.count || 0) + (summary.status_breakdown.failed?.count || 0)}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              accent="warning"
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6 animate-fade-in">
        {/* Search */}
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by phone, name, or receipt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="input w-auto"
          />
          <span className="text-foreground-muted">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="input w-auto"
          />
        </div>

        {/* Status Filter */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['all', 'completed', 'pending', 'failed'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
                statusFilter === status
                  ? 'bg-accent-primary text-background'
                  : 'bg-background-secondary text-foreground-muted hover:text-foreground'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button onClick={loadData} className="btn-secondary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <>
          {/* Transactions Table */}
          <div className="card animate-fade-in">
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Receipt</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-foreground-muted py-12">
                        <svg className="w-12 h-12 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {searchQuery ? 'No transactions match your search' : 'No transactions found'}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx, index) => (
                      <tr
                        key={tx.transaction_id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 0.03}s`, opacity: 0 }}
                      >
                        <td className="font-mono text-sm text-foreground-muted">#{tx.transaction_id}</td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent-secondary/10 flex items-center justify-center text-accent-secondary font-medium text-sm">
                              {tx.customer?.name.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span className="font-medium text-foreground">{tx.customer?.name || '-'}</span>
                          </div>
                        </td>
                        <td className="font-mono text-sm text-foreground-muted">{tx.phone_number}</td>
                        <td>
                          <div>
                            <p className="font-medium text-foreground">{tx.plan?.name || '-'}</p>
                            <p className="text-xs text-foreground-muted">
                              {tx.plan ? `${tx.plan.duration_value} ${tx.plan.duration_unit}` : '-'}
                            </p>
                          </div>
                        </td>
                        <td className="font-semibold text-accent-primary">KES {tx.amount.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(tx.status)} capitalize`}>{tx.status}</span>
                        </td>
                        <td className="font-mono text-xs text-foreground-muted">{tx.mpesa_receipt_number || '-'}</td>
                        <td className="text-foreground-muted text-sm">
                          {formatDateGMT3(tx.transaction_date || tx.created_at, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Router Breakdown */}
          {summary && Object.keys(summary.router_breakdown).length > 0 && (
            <div className="card p-6 mt-6 animate-fade-in delay-3" style={{ opacity: 0 }}>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
                Revenue by Router
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(summary.router_breakdown).map(([name, data]) => (
                  <div
                    key={data.router_id}
                    className="p-4 rounded-lg bg-background-tertiary flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">{name}</p>
                      <p className="text-sm text-foreground-muted">{data.count} transactions</p>
                    </div>
                    <p className="text-lg font-bold text-accent-primary">
                      KES {data.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}







