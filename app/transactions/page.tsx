'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { MpesaTransaction, TransactionSummary } from '../lib/types';
import { formatDateGMT3 } from '../lib/dateUtils';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import MobileDataCard from '../components/MobileDataCard';
import SearchInput from '../components/SearchInput';

type StatusFilter = 'all' | 'completed' | 'pending' | 'failed' | 'expired';

// Safe date formatting function to prevent crashes
const formatTransactionDate = (tx: MpesaTransaction): string => {
  try {
    const dateStr = tx.transaction_date || tx.created_at;
    if (!dateStr) return '-';
    
    // Validate date string
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateStr);
      return '-';
    }
    
    return formatDateGMT3(dateStr, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    console.error('Date formatting error:', e, tx);
    return '-';
  }
};

// Friendly labels for M-Pesa result codes
const RESULT_CODE_LABELS: Record<string, string> = {
  '0': 'Success',
  '1': 'Insufficient balance',
  '1032': 'Cancelled by user',
  '1037': 'DS timeout - user took too long',
  '2001': 'Wrong PIN entered',
  '1025': 'Server error',
  '1019': 'Transaction expired',
  '17': 'System internal error',
  '26': 'System busy',
  '1001': 'Unable to lock subscriber',
  '1028': 'Unable to complete M-Pesa transaction',
  '9999': 'Request timeout',
};

const FAILURE_SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  client: { label: 'Client', color: 'text-amber-400' },
  server: { label: 'Server', color: 'text-red-400' },
  timeout: { label: 'Timeout', color: 'text-orange-400' },
  mpesa: { label: 'M-Pesa', color: 'text-rose-400' },
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTx, setExpandedTx] = useState<number | null>(null);
  const [mobileDisplayCount, setMobileDisplayCount] = useState(50);

  // Track the active request so we can cancel stale ones on unmount or re-fetch
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    // Cancel any in-flight request before starting a new one
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const [txData, summaryData] = await Promise.all([
        api.getTransactions(
          1,
          undefined,
          undefined,
          undefined,
          status,
          controller.signal
        ),
        api.getTransactionSummary(
          1,
          undefined,
          undefined,
          undefined,
          controller.signal
        ),
      ]);
      // Only update state if this request wasn't cancelled
      if (!controller.signal.aborted) {
        setTransactions(txData || []);
        setSummary(summaryData);
      }
    } catch (err) {
      // Silently ignore AbortError (expected when navigating away)
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [statusFilter]);

  // Fetch data when filters change; abort on unmount
  useEffect(() => {
    setMobileDisplayCount(50); // Reset pagination when filters change
    loadData();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [loadData]);

  const filteredTransactions = (transactions || []).filter((tx) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (tx.phone_number || '').includes(query) ||
        tx.customer?.name?.toLowerCase().includes(query) ||
        tx.mpesa_receipt_number?.toLowerCase().includes(query) ||
        tx.reference?.toLowerCase().includes(query) ||
        tx.result_desc?.toLowerCase().includes(query) ||
        tx.result_code?.includes(query)
      );
    }
    return true;
  });

  // Get failed transactions count for stat display
  const failedTransactions = (transactions || []).filter((tx) => tx.status === 'failed');

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
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
              title="Failed"
              value={summary.status_breakdown.failed?.count || 0}
              subtitle="Transaction failures"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              accent="danger"
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3 mb-6 animate-fade-in">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search phone, name, receipt..."
        />

        {/* Status Filter */}
        <div className="flex rounded-lg border border-border overflow-x-auto flex-shrink-0 no-scrollbar">
          {(['all', 'completed', 'pending', 'failed', 'expired'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-accent-primary text-background'
                  : 'bg-background-secondary text-foreground-muted hover:text-foreground'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <>
          {/* Mobile Transaction Cards — paginated to keep DOM light */}
          <div className="md:hidden space-y-3 animate-fade-in">
            {filteredTransactions.length === 0 ? (
              <div className="card p-8 text-center text-foreground-muted">
                <svg className="w-12 h-12 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {searchQuery ? 'No transactions match your search' : 'No transactions found'}
              </div>
            ) : (
              <>
                {filteredTransactions.slice(0, mobileDisplayCount).map((tx) => (
                  <MobileDataCard
                    key={tx.transaction_id}
                    id={tx.transaction_id}
                    title={tx.customer?.name || '-'}
                    subtitle={tx.phone_number}
                    avatar={{
                      text: tx.customer?.name?.charAt(0).toUpperCase() || '?',
                      color: 'secondary'
                    }}
                    status={{
                      label: tx.status,
                      variant: tx.status === 'completed' ? 'success' : tx.status === 'failed' ? 'danger' : tx.status === 'pending' ? 'warning' : 'neutral'
                    }}
                    value={{
                      text: `KES ${(tx.amount ?? 0).toLocaleString()}`,
                      highlight: true
                    }}
                    secondary={{
                      left: tx.plan?.name || '-',
                      right: formatTransactionDate(tx)
                    }}
                    footer={tx.status !== 'failed' && tx.mpesa_receipt_number ? (
                      <div className="flex items-center justify-between w-full">
                        <span>Receipt: <span className="font-mono">{tx.mpesa_receipt_number}</span></span>
                        <span className="font-mono">#{tx.transaction_id}</span>
                      </div>
                    ) : undefined}
                    expandableContent={tx.status === 'failed' ? (
                      <div className="border-t border-red-500/10 pt-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {tx.failure_source && (
                              <span className={`text-[10px] font-medium ${FAILURE_SOURCE_LABELS[tx.failure_source]?.color || 'text-foreground-muted'} uppercase tracking-wider`}>
                                {FAILURE_SOURCE_LABELS[tx.failure_source]?.label || tx.failure_source}
                              </span>
                            )}
                            {tx.result_code && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-500/10 text-[10px] font-mono text-red-400">
                                {tx.result_code}
                              </span>
                            )}
                          </div>
                          <svg className="w-4 h-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={expandedTx === tx.transaction_id ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
                          </svg>
                        </div>
                        <p className="text-xs text-red-400/80 mt-1">
                          {tx.result_desc || RESULT_CODE_LABELS[tx.result_code || ''] || '-'}
                        </p>
                        {expandedTx === tx.transaction_id && (
                          <div className="mt-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-xs space-y-2">
                            <div className="flex justify-between">
                              <span className="text-foreground-muted">Source:</span>
                              <span className="text-foreground capitalize">{tx.failure_source || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-foreground-muted">Result Code:</span>
                              <span className="font-mono text-red-400">{tx.result_code || '-'}</span>
                            </div>
                            <div>
                              <span className="text-foreground-muted">Description:</span>
                              <p className="text-foreground mt-0.5">{tx.result_desc || '-'}</p>
                            </div>
                            {tx.checkout_request_id && (
                              <div>
                                <span className="text-foreground-muted">Checkout ID:</span>
                                <p className="font-mono text-foreground-muted text-[10px] mt-0.5 break-all">{tx.checkout_request_id}</p>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-foreground-muted">Transaction ID:</span>
                              <span className="font-mono text-foreground-muted">#{tx.transaction_id}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : undefined}
                    highlight={tx.status === 'failed'}
                    highlightColor="danger"
                    onClick={tx.status === 'failed' ? () => {
                      setExpandedTx(expandedTx === tx.transaction_id ? null : tx.transaction_id);
                    } : undefined}
                    layout="compact"
                  />
                ))}

                {/* Load More button */}
                {filteredTransactions.length > mobileDisplayCount && (
                  <button
                    onClick={() => setMobileDisplayCount((prev) => prev + 50)}
                    className="w-full py-3 text-sm font-medium text-accent-primary bg-accent-primary/5 border border-accent-primary/20 rounded-xl active:opacity-70 transition-colors"
                  >
                    Show More ({filteredTransactions.length - mobileDisplayCount} remaining)
                  </button>
                )}

                {/* Count indicator */}
                <p className="text-center text-xs text-foreground-muted pb-2">
                  Showing {Math.min(mobileDisplayCount, filteredTransactions.length)} of {filteredTransactions.length} transactions
                </p>
              </>
            )}
          </div>

          {/* Desktop Transactions Table */}
          <div className="card animate-fade-in hidden md:block">
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
                    <th>Receipt / Reason</th>
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
                        className={`animate-fade-in ${tx.status === 'failed' ? 'cursor-pointer hover:bg-red-500/5' : ''}`}
                        style={{ animationDelay: `${index * 0.03}s`, opacity: 0 }}
                        onClick={() => {
                          if (tx.status === 'failed') {
                            setExpandedTx(expandedTx === tx.transaction_id ? null : tx.transaction_id);
                          }
                        }}
                      >
                        <td className="font-mono text-sm text-foreground-muted">#{tx.transaction_id}</td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent-secondary/10 flex items-center justify-center text-accent-secondary font-medium text-sm">
                              {tx.customer?.name?.charAt(0).toUpperCase() || '?'}
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
                          <div className="flex flex-col gap-1">
                            <span className={`badge ${getStatusBadge(tx.status)} capitalize`}>{tx.status}</span>
                            {tx.status === 'failed' && tx.failure_source && (
                              <span className={`text-[10px] font-medium ${FAILURE_SOURCE_LABELS[tx.failure_source]?.color || 'text-foreground-muted'} uppercase tracking-wider`}>
                                {FAILURE_SOURCE_LABELS[tx.failure_source]?.label || tx.failure_source}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {tx.status === 'failed' ? (
                            <div className="max-w-[200px]">
                              <div className="flex items-center gap-1.5">
                                {tx.result_code && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-500/10 text-[10px] font-mono text-red-400">
                                    {tx.result_code}
                                  </span>
                                )}
                                <svg className="w-3.5 h-3.5 text-foreground-muted/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={expandedTx === tx.transaction_id ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
                                </svg>
                              </div>
                              <p className="text-xs text-red-400/80 mt-0.5 truncate" title={tx.result_desc}>
                                {tx.result_desc || RESULT_CODE_LABELS[tx.result_code || ''] || '-'}
                              </p>
                              {expandedTx === tx.transaction_id && (
                                <div className="mt-2 p-2 rounded bg-red-500/5 border border-red-500/10 text-xs space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-foreground-muted">Source:</span>
                                    <span className="text-foreground capitalize">{tx.failure_source || 'Unknown'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-foreground-muted">Code:</span>
                                    <span className="font-mono text-red-400">{tx.result_code || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-foreground-muted">Description:</span>
                                    <p className="text-foreground mt-0.5">{tx.result_desc || '-'}</p>
                                  </div>
                                  {tx.checkout_request_id && (
                                    <div className="flex justify-between">
                                      <span className="text-foreground-muted">Checkout ID:</span>
                                      <span className="font-mono text-foreground-muted text-[10px]">{tx.checkout_request_id}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-foreground-muted">{tx.mpesa_receipt_number || '-'}</span>
                          )}
                        </td>
                        <td className="text-foreground-muted text-sm">
                          {formatTransactionDate(tx)}
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
            <div className="card p-4 sm:p-6 mt-4 sm:mt-6 animate-fade-in delay-3" style={{ opacity: 0 }}>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
                Revenue by Router
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {Object.entries(summary.router_breakdown).map(([name, data]) => (
                  <div
                    key={data.router_id}
                    className="p-3 sm:p-4 rounded-lg bg-background-tertiary flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm sm:text-base truncate">{name}</p>
                      <p className="text-xs sm:text-sm text-foreground-muted">{data.count} transactions</p>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-accent-primary flex-shrink-0 ml-3">
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







