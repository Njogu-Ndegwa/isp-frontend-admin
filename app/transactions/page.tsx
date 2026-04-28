'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { api } from '../lib/api';
import { MpesaTransaction, TransactionSummary } from '../lib/types';
import { formatDateGMT3 } from '../lib/dateUtils';
import { useAlert } from '../context/AlertContext';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import MobileDataCard from '../components/MobileDataCard';
import SearchInput from '../components/SearchInput';
import FilterSelect from '../components/FilterSelect';
import FilterDatePicker from '../components/FilterDatePicker';
import DataTable, { DataTableColumn } from '../components/DataTable';
import Pagination from '../components/Pagination';

type StatusFilter = 'all' | 'completed' | 'pending' | 'failed' | 'expired';
type PaymentMethodFilter = 'all' | 'mobile_money' | 'cash';

const TRANSACTION_COLUMNS: DataTableColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'type', label: 'Type' },
  { key: 'phone', label: 'Phone' },
  { key: 'plan', label: 'Plan' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'receipt', label: 'Receipt / Reason' },
  { key: 'date', label: 'Date' },
  { key: 'actions', label: 'Actions' },
];

const formatTransactionDate = (tx: MpesaTransaction): string => {
  try {
    const dateStr = tx.transaction_date || tx.created_at;
    if (!dateStr) return '-';

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
  '1028': 'Unable to complete mobile transaction',
  '9999': 'Request timeout',
};

const FAILURE_SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  client: { label: 'Client', color: 'text-amber-400' },
  server: { label: 'Server', color: 'text-red-400' },
  timeout: { label: 'Timeout', color: 'text-orange-400' },
  mpesa: { label: 'Mobile', color: 'text-rose-400' },
};

const PAYMENT_METHOD_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  mobile_money: { label: 'Mobile', color: 'text-green-400', bg: 'bg-green-500/10' },
  cash: { label: 'Cash', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  card: { label: 'Card', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  bank_transfer: { label: 'Bank', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  other: { label: 'Other', color: 'text-gray-400', bg: 'bg-gray-500/10' },
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [methodFilter, setMethodFilter] = useState<PaymentMethodFilter>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTx, setExpandedTx] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [provisioningId, setProvisioningId] = useState<number | null>(null);

  const { showAlert } = useAlert();
  const [allTransactionsCache, setAllTransactionsCache] = useState<MpesaTransaction[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasSearchFilter = searchQuery.trim() !== '';

  const refreshData = useCallback(() => setRefreshKey(k => k + 1), []);

  const prevSearchRef = useRef(searchQuery);
  useEffect(() => {
    if (prevSearchRef.current !== searchQuery) {
      setPage(1);
      prevSearchRef.current = searchQuery;
    }
  }, [searchQuery]);

  useEffect(() => {
    if (hasSearchFilter) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const status = statusFilter === 'all' ? undefined : statusFilter;
        const method = methodFilter === 'all' ? undefined : methodFilter;
        const exactDate = dateFilter || undefined;
        const [txResult, summaryData] = await Promise.all([
          api.getTransactions(1, undefined, undefined, undefined, status, controller.signal, method, exactDate, page, perPage),
          api.getTransactionSummary(1, undefined, undefined, undefined, controller.signal, method, exactDate),
        ]);
        if (!controller.signal.aborted) {
          setTransactions(txResult.data || []);
          setTotalItems(txResult.total);
          setAllTransactionsCache([]);
          setSummary(summaryData);
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Failed to load transactions');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [statusFilter, methodFilter, dateFilter, page, perPage, hasSearchFilter, refreshKey]);

  useEffect(() => {
    if (!hasSearchFilter) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const status = statusFilter === 'all' ? undefined : statusFilter;
        const method = methodFilter === 'all' ? undefined : methodFilter;
        const exactDate = dateFilter || undefined;
        const [txResult, summaryData] = await Promise.all([
          api.getTransactions(1, undefined, undefined, undefined, status, controller.signal, method, exactDate, 1, 10000),
          api.getTransactionSummary(1, undefined, undefined, undefined, controller.signal, method, exactDate),
        ]);
        if (!controller.signal.aborted) {
          setAllTransactionsCache(txResult.data || []);
          setTotalItems(txResult.total);
          setSummary(summaryData);
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Failed to load transactions');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [statusFilter, methodFilter, dateFilter, hasSearchFilter, refreshKey]);

  const handleManualProvision = useCallback(async (tx: MpesaTransaction) => {
    if (provisioningId) return;
    setProvisioningId(tx.transaction_id);
    try {
      const result = await api.manualProvisionTransaction(tx.payment_method, tx.transaction_id);
      if (result.success) {
        const msg = result.provisioning_result?.message || 'Transaction provisioned successfully';
        showAlert('success', msg);
        refreshData();
      } else {
        showAlert('error', result.provisioning_error || 'Provisioning failed');
      }
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to provision transaction');
    } finally {
      setProvisioningId(null);
    }
  }, [provisioningId, showAlert, refreshData]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePerPageChange = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  }, []);

  const filteredTransactions = useMemo(() => {
    const source = hasSearchFilter ? allTransactionsCache : transactions;
    if (!searchQuery) return source || [];
    const query = searchQuery.toLowerCase();
    return (source || []).filter((tx) => (
      (tx.phone_number || '').includes(query) ||
      tx.mpesa_receipt_number?.toLowerCase().includes(query) ||
      tx.reference?.toLowerCase().includes(query) ||
      tx.payment_reference?.toLowerCase().includes(query) ||
      tx.result_desc?.toLowerCase().includes(query) ||
      tx.result_code?.includes(query)
    ));
  }, [hasSearchFilter, allTransactionsCache, transactions, searchQuery]);

  const displayedTransactions = hasSearchFilter
    ? filteredTransactions.slice((page - 1) * perPage, page * perPage)
    : filteredTransactions;

  const effectiveTotal = hasSearchFilter ? filteredTransactions.length : totalItems;

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

  const getPaymentMethodBadge = (method: string) => {
    const info = PAYMENT_METHOD_LABELS[method] || PAYMENT_METHOD_LABELS.other;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${info.color} ${info.bg}`}>
        {info.label}
      </span>
    );
  };

  const getReceiptDisplay = (tx: MpesaTransaction) => {
    return tx.mpesa_receipt_number || tx.payment_reference || '-';
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
          <button onClick={refreshData} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Transactions" subtitle="View and manage all payment transactions" />

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
          <div className="animate-fade-in delay-1">
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
          <div className="animate-fade-in delay-2">
            <StatCard
              title="Total Amount"
              value={`KES ${(summary.status_breakdown.completed?.amount || 0).toLocaleString()}`}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              accent="success"
            />
          </div>
          <div className="animate-fade-in delay-3">
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
          <div className="animate-fade-in delay-4">
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
      <div className="mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search phone, receipt, reference..."
            />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <FilterSelect
              value={methodFilter}
              onChange={(v) => { setMethodFilter(v as PaymentMethodFilter); setPage(1); }}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'mobile_money', label: 'Mobile Money' },
                { value: 'cash', label: 'Cash' },
              ]}
            />
            <FilterSelect
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'completed', label: 'Completed' },
                { value: 'pending', label: 'Pending' },
                { value: 'failed', label: 'Failed' },
                { value: 'expired', label: 'Expired' },
              ]}
            />
            <FilterDatePicker
              value={dateFilter}
              onChange={(v) => { setDateFilter(v); setPage(1); }}
            />
          </div>
        </div>

        {/* Active Filters */}
        {(methodFilter !== 'all' || statusFilter !== 'all' || dateFilter) && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-foreground-muted">Filters:</span>
            {methodFilter !== 'all' && (
              <button
                onClick={() => setMethodFilter('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
              >
                {PAYMENT_METHOD_LABELS[methodFilter]?.label || methodFilter}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors capitalize"
              >
                {statusFilter}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            {dateFilter && (() => {
              const [y, m, d] = dateFilter.split('-').map(Number);
              const label = (y && m && d)
                ? `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${y}`
                : dateFilter;
              return (
                <button
                  onClick={() => setDateFilter('')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
                >
                  {label}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              );
            })()}
            <button
              onClick={() => { setMethodFilter('all'); setStatusFilter('all'); setDateFilter(''); setPage(1); }}
              className="text-xs text-foreground-muted hover:text-foreground transition-colors underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <>
          {/* Mobile Transaction Cards */}
          <div className="md:hidden space-y-3 animate-fade-in">
            {displayedTransactions.length === 0 ? (
              <div className="card p-8 text-center text-foreground-muted">
                <svg className="w-12 h-12 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {searchQuery ? 'No transactions match your search' : 'No transactions found'}
              </div>
            ) : (
              <>
                {displayedTransactions.map((tx) => (
                  <MobileDataCard
                    key={`${tx.payment_method}-${tx.transaction_id}`}
                    id={tx.transaction_id}
                    title={tx.phone_number || tx.customer?.name || '-'}
                    avatar={{
                      text: tx.phone_number?.slice(-2) || '?',
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
                      left: (
                        <span className="flex items-center gap-1.5">
                          {getPaymentMethodBadge(tx.payment_method)}
                          <span>{tx.plan?.name || '-'}</span>
                        </span>
                      ),
                      right: formatTransactionDate(tx)
                    }}
                    rightAction={tx.status !== 'failed' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground-muted truncate">
                          {getReceiptDisplay(tx) !== '-' ? `Ref: ${getReceiptDisplay(tx)}` : ''}
                        </span>
                        <span className="text-xs font-mono text-foreground-muted flex-shrink-0">#{tx.transaction_id}</span>
                        {tx.manual_provision_supported ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleManualProvision(tx); }}
                            disabled={provisioningId === tx.transaction_id}
                            className="p-1.5 rounded-md bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 active:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation flex-shrink-0"
                            title="Provision Now"
                          >
                            {provisioningId === tx.transaction_id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            )}
                          </button>
                        ) : (
                          <button
                            disabled
                            className="p-1.5 rounded-md opacity-30 text-foreground-muted cursor-not-allowed flex-shrink-0"
                            title={tx.manual_provision_reason || 'Provisioning not available'}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        )}
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

                <Pagination
                  page={page}
                  perPage={perPage}
                  total={effectiveTotal}
                  onPageChange={handlePageChange}
                  onPerPageChange={handlePerPageChange}
                  loading={loading}
                  noun="transactions"
                />
              </>
            )}
          </div>

          {/* Desktop Transactions Table */}
          <DataTable<MpesaTransaction>
            columns={TRANSACTION_COLUMNS}
            data={displayedTransactions}
            rowKey={(tx) => `${tx.payment_method}-${tx.transaction_id}`}
            scrollable
            renderCell={(tx, key) => {
              switch (key) {
                case 'id':
                  return <span className="font-mono text-sm text-foreground-muted">#{tx.transaction_id}</span>;
                case 'type':
                  return getPaymentMethodBadge(tx.payment_method);
                case 'phone':
                  return <span className="font-mono text-sm text-foreground-muted">{tx.phone_number || tx.customer?.name || '-'}</span>;
                case 'plan':
                  return (
                    <div>
                      <p className="font-medium text-foreground">{tx.plan?.name || '-'}</p>
                      <p className="text-xs text-foreground-muted">
                        {tx.plan ? `${tx.plan.duration_value} ${tx.plan.duration_unit}` : '-'}
                      </p>
                    </div>
                  );
                case 'amount':
                  return <span className="font-semibold text-accent-primary">KES {tx.amount.toLocaleString()}</span>;
                case 'status':
                  return (
                    <div className="flex flex-col gap-1">
                      <span className={`badge ${getStatusBadge(tx.status)} capitalize`}>{tx.status}</span>
                      {tx.status === 'failed' && tx.failure_source && (
                        <span className={`text-[10px] font-medium ${FAILURE_SOURCE_LABELS[tx.failure_source]?.color || 'text-foreground-muted'} uppercase tracking-wider`}>
                          {FAILURE_SOURCE_LABELS[tx.failure_source]?.label || tx.failure_source}
                        </span>
                      )}
                    </div>
                  );
                case 'receipt':
                  return tx.status === 'failed' ? (
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
                      <p className="text-xs text-red-400/80 mt-0.5 truncate" title={tx.result_desc || undefined}>
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
                    <span className="font-mono text-xs text-foreground-muted">{getReceiptDisplay(tx)}</span>
                  );
                case 'date':
                  return <span className="text-foreground-muted text-sm">{formatTransactionDate(tx)}</span>;
                case 'actions':
                  if (tx.manual_provision_supported) {
                    const isProvisioning = provisioningId === tx.transaction_id;
                    return (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleManualProvision(tx); }}
                        disabled={isProvisioning}
                        className="p-1.5 rounded-lg bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Provision"
                      >
                        {isProvisioning ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                      </button>
                    );
                  }
                  return (
                    <button
                      disabled
                      className="p-1.5 rounded-lg opacity-30 text-foreground-muted cursor-not-allowed"
                      title={tx.manual_provision_reason || 'Provisioning not available'}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                  );
                default:
                  return null;
              }
            }}
            onRowClick={(tx) => {
              if (tx.status === 'failed') {
                setExpandedTx(expandedTx === tx.transaction_id ? null : tx.transaction_id);
              }
            }}
            rowClassName={(tx) => tx.status === 'failed' ? 'cursor-pointer hover:bg-red-500/5' : ''}
            rowStyle={(_tx, index) => ({ animationDelay: `${index * 0.03}s` })}
            emptyState={{
              icon: (
                <svg className="w-12 h-12 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              ),
              message: searchQuery ? 'No transactions match your search' : 'No transactions found',
            }}
            footer={
              <Pagination
                page={page}
                perPage={perPage}
                total={effectiveTotal}
                onPageChange={handlePageChange}
                onPerPageChange={handlePerPageChange}
                loading={loading}
                noun="transactions"
              />
            }
          />

          {/* Method Breakdown (completed only) */}
          {(() => {
            const completed = (transactions || []).filter(tx => tx.status === 'completed');
            const byMethod: Record<string, { count: number; amount: number }> = {};
            completed.forEach(tx => {
              const m = tx.payment_method || 'other';
              if (!byMethod[m]) byMethod[m] = { count: 0, amount: 0 };
              byMethod[m].count += 1;
              byMethod[m].amount += tx.amount ?? 0;
            });
            const entries = Object.entries(byMethod);
            if (entries.length <= 1) return null;
            return (
              <div className="card p-4 sm:p-6 mt-4 sm:mt-6 animate-fade-in delay-2">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-accent-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Revenue by Payment Type
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {entries.map(([method, data]) => {
                    const info = PAYMENT_METHOD_LABELS[method] || PAYMENT_METHOD_LABELS.other;
                    return (
                      <div
                        key={method}
                        className="p-3 sm:p-4 rounded-lg bg-background-tertiary flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm sm:text-base truncate flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${info.bg.replace('/10', '')}`} />
                            {info.label}
                          </p>
                          <p className="text-xs sm:text-sm text-foreground-muted">{data.count} transactions</p>
                        </div>
                        <p className="text-base sm:text-lg font-bold text-accent-primary flex-shrink-0 ml-3">
                          KES {data.amount.toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Router Breakdown (completed only) */}
          {(() => {
            const completed = (transactions || []).filter(tx => tx.status === 'completed');
            const byRouter: Record<string, { count: number; amount: number }> = {};
            completed.forEach(tx => {
              const name = tx.router?.name || 'Unknown';
              if (!byRouter[name]) byRouter[name] = { count: 0, amount: 0 };
              byRouter[name].count += 1;
              byRouter[name].amount += tx.amount ?? 0;
            });
            const entries = Object.entries(byRouter);
            if (entries.length === 0) return null;
            return (
              <div className="card p-4 sm:p-6 mt-4 sm:mt-6 animate-fade-in delay-3">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-accent-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                  </svg>
                  Revenue by Router
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {entries.map(([name, data]) => (
                    <div
                      key={name}
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
            );
          })()}
        </>
      )}
    </div>
  );
}
