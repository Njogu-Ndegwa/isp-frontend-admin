'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { api } from '../../lib/api';
import {
  AdminSubscriptionCollectionsSummary,
  AdminSubscriptionPaymentRow,
  AdminSubscriptionPaymentsResponse,
  OwnerBankDestination,
  BankSendStatus,
  B2BTransaction,
  SendToBankResponse,
} from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import Tabs from '../../components/Tabs';
import DataTable from '../../components/DataTable';
import MobileDataCard from '../../components/MobileDataCard';
import ConfirmDialog from '../../components/ConfirmDialog';
import { SkeletonCard } from '../../components/LoadingSpinner';
import { formatKES } from '../../lib/format';


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

const formatDateTime = (dateStr: string | null | undefined): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

type SendStatusConfig = { label: string; className: string };

const SEND_STATUS_MAP: Record<BankSendStatus, SendStatusConfig> = {
  unsent: { label: 'In Paybill', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  pending_send: { label: 'Transferring', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  partially_sent: { label: 'Partial', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  sent: { label: 'In Bank', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  not_applicable: { label: 'N/A', className: 'bg-foreground/5 text-foreground-muted border-border' },
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  failed: { label: 'Failed', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

const B2B_STATUS_MAP: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  failed: { label: 'Failed', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
  timeout: { label: 'Timeout', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
};

function StatusBadge({ config }: { config: { label: string; className: string } }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${config.className}`}>
      {config.label}
    </span>
  );
}

type TabValue = 'overview' | 'transactions' | 'bank-destination' | 'transfer-history';

export default function SubscriptionCollectionsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabValue>('overview');

  // Overview
  const [summary, setSummary] = useState<AdminSubscriptionCollectionsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Transactions
  const [payments, setPayments] = useState<AdminSubscriptionPaymentRow[]>([]);
  const [paymentsResponse, setPaymentsResponse] = useState<AdminSubscriptionPaymentsResponse | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [sendStatusFilter, setSendStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const paymentsRequestSeqRef = useRef(0);
  const [loadedPaymentsQueryKey, setLoadedPaymentsQueryKey] = useState<string | null>(null);

  const paymentsQueryKey = useMemo(() => JSON.stringify({
    paymentsPage,
    paymentStatusFilter,
    sendStatusFilter,
    startDate,
    endDate,
  }), [paymentsPage, paymentStatusFilter, sendStatusFilter, startDate, endDate]);

  // Bank destinations
  const [destinations, setDestinations] = useState<OwnerBankDestination[]>([]);
  const [destinationsLoading, setDestinationsLoading] = useState(false);
  const [destinationsError, setDestinationsError] = useState<string | null>(null);
  const [destinationsLoaded, setDestinationsLoaded] = useState(false);
  const destinationsRequestSeqRef = useRef(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formMethodType, setFormMethodType] = useState<'bank_account' | 'mpesa_paybill'>('bank_account');
  const [formLabel, setFormLabel] = useState('');
  const [formBankPaybill, setFormBankPaybill] = useState('');
  const [formBankAccount, setFormBankAccount] = useState('');
  const [formMpesaPaybill, setFormMpesaPaybill] = useState('');

  // Transfer history
  const [b2bTransactions, setB2bTransactions] = useState<B2BTransaction[]>([]);
  const [b2bLoading, setB2bLoading] = useState(false);
  const [b2bError, setB2bError] = useState<string | null>(null);
  const [b2bLoaded, setB2bLoaded] = useState(false);
  const b2bRequestSeqRef = useRef(0);

  // Send to bank
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState<SendToBankResponse | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<OwnerBankDestination | null>(null);

  // General
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      const result = await api.getAdminSubscriptionCollections();
      setSummary(result);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Failed to load collections summary');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    const requestSeq = paymentsRequestSeqRef.current + 1;
    paymentsRequestSeqRef.current = requestSeq;
    const requestQueryKey = paymentsQueryKey;

    try {
      setPaymentsLoading(true);
      setPaymentsError(null);
      const result = await api.getAdminSubscriptionPayments({
        page: paymentsPage,
        per_page: 50,
        status: paymentStatusFilter || undefined,
        send_status: sendStatusFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      if (paymentsRequestSeqRef.current !== requestSeq) return;
      setPayments(result.payments);
      setPaymentsResponse(result);
      setLoadedPaymentsQueryKey(requestQueryKey);
    } catch (err) {
      if (paymentsRequestSeqRef.current !== requestSeq) return;
      setLoadedPaymentsQueryKey(requestQueryKey);
      setPaymentsError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      if (paymentsRequestSeqRef.current === requestSeq) {
        setPaymentsLoading(false);
      }
    }
  }, [paymentsQueryKey, paymentsPage, paymentStatusFilter, sendStatusFilter, startDate, endDate]);

  const fetchDestinations = useCallback(async () => {
    const requestSeq = destinationsRequestSeqRef.current + 1;
    destinationsRequestSeqRef.current = requestSeq;

    try {
      setDestinationsLoading(true);
      setDestinationsError(null);
      const result = await api.getAdminBankDestinations();
      if (destinationsRequestSeqRef.current !== requestSeq) return undefined;
      setDestinations(result.destinations);
      setDestinationsLoaded(true);
      return result.destinations;
    } catch (err) {
      if (destinationsRequestSeqRef.current !== requestSeq) return undefined;
      setDestinationsLoaded(true);
      setDestinationsError(err instanceof Error ? err.message : 'Failed to load bank destinations');
      return undefined;
    } finally {
      if (destinationsRequestSeqRef.current === requestSeq) {
        setDestinationsLoading(false);
      }
    }
  }, []);

  const fetchB2BTransactions = useCallback(async () => {
    const requestSeq = b2bRequestSeqRef.current + 1;
    b2bRequestSeqRef.current = requestSeq;

    try {
      setB2bLoading(true);
      setB2bError(null);
      const adminUser = user;
      const result = await api.getAdminB2BTransactions({
        reseller_id: adminUser?.id,
      });
      if (b2bRequestSeqRef.current !== requestSeq) return;
      setB2bTransactions(result.transactions);
      setB2bLoaded(true);
    } catch (err) {
      if (b2bRequestSeqRef.current !== requestSeq) return;
      setB2bLoaded(true);
      setB2bError(err instanceof Error ? err.message : 'Failed to load transfer history');
    } finally {
      if (b2bRequestSeqRef.current === requestSeq) {
        setB2bLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (activeTab === 'transactions') fetchPayments();
  }, [activeTab, fetchPayments]);

  useEffect(() => {
    if (activeTab === 'bank-destination') fetchDestinations();
  }, [activeTab, fetchDestinations]);

  useEffect(() => {
    if (activeTab === 'transfer-history') fetchB2BTransactions();
  }, [activeTab, fetchB2BTransactions]);

  const handleSendToBank = async () => {
    setSendLoading(true);
    setSendError(null);
    try {
      const result = await api.sendSubscriptionCollectionsToBank(
        selectedDestination ? { payment_method_id: selectedDestination.id } : undefined
      );
      setSendResult(result);
      setShowSendDialog(false);
      setSuccessMessage(`Transfer initiated: ${formatKES(result.transaction.net_amount)} to ${result.destination.label}`);
      fetchSummary();
      if (activeTab === 'transactions') fetchPayments();
      if (activeTab === 'transfer-history') fetchB2BTransactions();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setSendLoading(false);
    }
  };

  const handleCreateDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.createAdminBankDestination({
        method_type: formMethodType,
        label: formLabel,
        ...(formMethodType === 'bank_account'
          ? { bank_paybill_number: formBankPaybill, bank_account_number: formBankAccount }
          : { mpesa_paybill_number: formMpesaPaybill }),
      });
      setShowCreateForm(false);
      setFormLabel('');
      setFormBankPaybill('');
      setFormBankAccount('');
      setFormMpesaPaybill('');
      setSuccessMessage('Bank destination created successfully');
      fetchDestinations();
    } catch (err) {
      setDestinationsError(err instanceof Error ? err.message : 'Failed to create destination');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenSendDialog = async () => {
    const latestDestinations = await fetchDestinations();
    const availableDestinations = latestDestinations ?? destinations;
    if (availableDestinations.length > 0) {
      setSelectedDestination(availableDestinations.find(d => d.is_active) || availableDestinations[0]);
    }
    setSendError(null);
    setSendResult(null);
    setShowSendDialog(true);
  };

  const showPaymentsLoading = paymentsLoading || (activeTab === 'transactions' && loadedPaymentsQueryKey !== paymentsQueryKey);
  const showDestinationsLoading = destinationsLoading || (activeTab === 'bank-destination' && !destinationsLoaded);
  const showB2BLoading = b2bLoading || (activeTab === 'transfer-history' && !b2bLoaded);

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
          <p className="text-foreground-muted text-sm">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Header
        title="Subscription Collections"
        subtitle="Platform subscription payments from resellers"
        backHref="/admin/subscriptions"
      />

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400/60 hover:text-emerald-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { value: 'overview' as TabValue, label: 'Overview' },
          { value: 'transactions' as TabValue, label: 'Transactions' },
          { value: 'bank-destination' as TabValue, label: 'Bank Destination' },
          { value: 'transfer-history' as TabValue, label: 'Transfer History' },
        ]}
      />

      {activeTab === 'overview' && (
        <OverviewTab
          summary={summary}
          loading={summaryLoading}
          error={summaryError}
          onRetry={fetchSummary}
          onSendToBank={handleOpenSendDialog}
        />
      )}

      {activeTab === 'transactions' && (
        <TransactionsTab
          payments={payments}
          response={paymentsResponse}
          loading={showPaymentsLoading}
          error={paymentsError}
          page={paymentsPage}
          onPageChange={setPaymentsPage}
          paymentStatusFilter={paymentStatusFilter}
          onPaymentStatusChange={(v) => { setPaymentStatusFilter(v); setPaymentsPage(1); }}
          sendStatusFilter={sendStatusFilter}
          onSendStatusChange={(v) => { setSendStatusFilter(v); setPaymentsPage(1); }}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          onRetry={fetchPayments}
        />
      )}

      {activeTab === 'bank-destination' && (
        <BankDestinationTab
          destinations={destinations}
          loading={showDestinationsLoading}
          error={destinationsError}
          showCreateForm={showCreateForm}
          onToggleForm={() => setShowCreateForm(!showCreateForm)}
          createLoading={createLoading}
          formMethodType={formMethodType}
          onMethodTypeChange={setFormMethodType}
          formLabel={formLabel}
          onLabelChange={setFormLabel}
          formBankPaybill={formBankPaybill}
          onBankPaybillChange={setFormBankPaybill}
          formBankAccount={formBankAccount}
          onBankAccountChange={setFormBankAccount}
          formMpesaPaybill={formMpesaPaybill}
          onMpesaPaybillChange={setFormMpesaPaybill}
          onSubmit={handleCreateDestination}
          onRetry={fetchDestinations}
        />
      )}

      {activeTab === 'transfer-history' && (
        <TransferHistoryTab
          transactions={b2bTransactions}
          loading={showB2BLoading}
          error={b2bError}
          onRetry={fetchB2BTransactions}
        />
      )}

      {/* Send to Bank Confirmation Dialog */}
      {showSendDialog && summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !sendLoading && setShowSendDialog(false)} />
          <div className="relative card p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-semibold">Confirm Transfer</h3>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-foreground-muted">Gross amount</span>
                <span className="font-medium">{formatKES(summary.available_to_send)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground-muted">Safaricom fee</span>
                <span className="text-red-400">-{formatKES(summary.fee_preview.safaricom_fee)}</span>
              </div>
              {summary.fee_preview.kadogo_surcharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-muted">Kadogo surcharge</span>
                  <span className="text-red-400">-{formatKES(summary.fee_preview.kadogo_surcharge)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between text-sm">
                <span className="font-medium">Net payout</span>
                <span className="font-semibold text-emerald-500">{formatKES(summary.fee_preview.net_payout)}</span>
              </div>
            </div>

            {destinations.length > 0 && (
              <div>
                <label className="block text-xs text-foreground-muted mb-1">Destination</label>
                <select
                  value={selectedDestination?.id || ''}
                  onChange={(e) => {
                    const dest = destinations.find(d => d.id === Number(e.target.value));
                    setSelectedDestination(dest || null);
                  }}
                  className="input text-sm"
                >
                  {destinations.filter(d => d.is_active).map(d => (
                    <option key={d.id} value={d.id}>
                      {d.label} ({d.method_type === 'bank_account'
                        ? `${d.bank_paybill_number} / ${d.bank_account_number}`
                        : d.mpesa_paybill_number})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {sendError && (
              <p className="text-sm text-red-400">{sendError}</p>
            )}

            <p className="text-xs text-foreground-muted">
              Pending transfers are reserved and already excluded from available balance.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSendDialog(false)}
                disabled={sendLoading}
                className="flex-1 px-4 py-2 text-sm rounded-xl border border-border text-foreground-muted hover:bg-background-tertiary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendToBank}
                disabled={sendLoading || summary.available_to_send <= 0}
                className="flex-1 btn-primary px-4 py-2 text-sm disabled:opacity-50"
              >
                {sendLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Processing...
                  </span>
                ) : 'Send to Bank'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Overview Tab
// ────────────────────────────────────────────────────────────────────

function OverviewTab({
  summary,
  loading,
  error,
  onRetry,
  onSendToBank,
}: {
  summary: AdminSubscriptionCollectionsSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSendToBank: () => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-danger mb-4">{error}</p>
        <button onClick={onRetry} className="btn-primary px-4 py-2 text-sm">Retry</button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Total Collected"
          value={formatKES(summary.total_collected)}
          subtitle="All subscription payments"
          accent="success"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="In Your Bank"
          value={formatKES(summary.completed_sent)}
          subtitle="Successfully transferred"
          accent="info"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 12.75l6 6 9-13.5" /></svg>}
        />
        <StatCard
          title="Transferring"
          value={formatKES(summary.pending_send)}
          subtitle="Transfer in progress"
          accent="warning"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Still in Paybill"
          value={formatKES(summary.available_to_send)}
          subtitle="Ready to send to bank"
          accent="primary"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>}
        />
        <StatCard
          title="Transfer Fees"
          value={formatKES(summary.completed_fees)}
          subtitle="Completed transfer fees"
          accent="danger"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" /></svg>}
        />
      </div>

      {/* Transfer Preview Card */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-3 flex-1">
            <h3 className="text-sm font-semibold text-foreground">Transfer Preview</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground-muted">Gross available</span>
                <span className="font-medium">{formatKES(summary.available_to_send)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground-muted">Safaricom fee</span>
                <span className="text-red-400">-{formatKES(summary.fee_preview.safaricom_fee)}</span>
              </div>
              {summary.fee_preview.kadogo_surcharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-muted">Kadogo surcharge</span>
                  <span className="text-red-400">-{formatKES(summary.fee_preview.kadogo_surcharge)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between text-sm">
                <span className="font-medium">Net payout</span>
                <span className="font-semibold text-emerald-500">{formatKES(summary.fee_preview.net_payout)}</span>
              </div>
            </div>
            <p className="text-xs text-foreground-muted mt-3">
              Pending transfers are reserved and already excluded from available balance.
            </p>
          </div>
          <div className="sm:pt-6">
            <button
              onClick={onSendToBank}
              disabled={summary.available_to_send <= 0}
              className="btn-primary px-6 py-2.5 text-sm w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Available Balance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Transactions Tab
// ────────────────────────────────────────────────────────────────────

const PAYMENT_STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const SEND_STATUS_FILTERS = [
  { value: '', label: 'All Bank Status' },
  { value: 'unsent', label: 'In Paybill' },
  { value: 'pending_send', label: 'Transferring' },
  { value: 'partially_sent', label: 'Partial' },
  { value: 'sent', label: 'In Bank' },
  { value: 'not_applicable', label: 'N/A' },
];

function TransactionsTab({
  payments,
  response,
  loading,
  error,
  page,
  onPageChange,
  paymentStatusFilter,
  onPaymentStatusChange,
  sendStatusFilter,
  onSendStatusChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onRetry,
}: {
  payments: AdminSubscriptionPaymentRow[];
  response: AdminSubscriptionPaymentsResponse | null;
  loading: boolean;
  error: string | null;
  page: number;
  onPageChange: (p: number) => void;
  paymentStatusFilter: string;
  onPaymentStatusChange: (v: string) => void;
  sendStatusFilter: string;
  onSendStatusChange: (v: string) => void;
  startDate: string;
  onStartDateChange: (v: string) => void;
  endDate: string;
  onEndDateChange: (v: string) => void;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={paymentStatusFilter}
          onChange={(e) => onPaymentStatusChange(e.target.value)}
          className="input text-sm"
        >
          {PAYMENT_STATUS_FILTERS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <select
          value={sendStatusFilter}
          onChange={(e) => onSendStatusChange(e.target.value)}
          className="input text-sm"
        >
          {SEND_STATUS_FILTERS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="input text-sm"
          placeholder="Start date"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="input text-sm"
          placeholder="End date"
        />
      </div>

      {/* Summary bar */}
      {response?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-3 text-center">
            <p className="text-xs text-foreground-muted">Total Collected</p>
            <p className="text-sm font-semibold">{formatKES(response.summary.total_collected)}</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xs text-foreground-muted">In Your Bank</p>
            <p className="text-sm font-semibold">{formatKES(response.summary.completed_sent)}</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xs text-foreground-muted">Transferring</p>
            <p className="text-sm font-semibold">{formatKES(response.summary.pending_send)}</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xs text-foreground-muted">Still in Paybill</p>
            <p className="text-sm font-semibold">{formatKES(response.summary.available_to_send)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-danger mb-4">{error}</p>
          <button onClick={onRetry} className="btn-primary px-4 py-2 text-sm">Retry</button>
        </div>
      ) : payments.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-foreground-muted">No payments found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <DataTable
              columns={[
                { key: 'date', label: 'Date' },
                { key: 'reseller', label: 'Reseller' },
                { key: 'invoice', label: 'Invoice' },
                { key: 'amount', label: 'Amount', className: 'text-right' },
                { key: 'reference', label: 'Reference' },
                { key: 'payment_status', label: 'Payment' },
                { key: 'send_status', label: 'Bank Status' },
                { key: 'sent', label: 'Sent', className: 'text-right' },
                { key: 'pending', label: 'Pending', className: 'text-right' },
                { key: 'unsent', label: 'Unsent', className: 'text-right' },
              ]}
              data={payments}
              rowKey={(p) => p.id}
              renderCell={(p, col) => {
                switch (col) {
                  case 'date':
                    return <span className="text-xs text-foreground-muted">{formatSafeDate(p.created_at)}</span>;
                  case 'reseller':
                    return (
                      <div>
                        <p className="text-sm font-medium">{p.reseller_name || '-'}</p>
                        <p className="text-xs text-foreground-muted">{p.reseller_email}</p>
                      </div>
                    );
                  case 'invoice':
                    return <span className="text-sm text-foreground-muted">#{p.invoice_id || '-'}</span>;
                  case 'amount':
                    return <span className="text-sm font-medium">{formatKES(p.amount)}</span>;
                  case 'reference':
                    return <span className="text-xs text-foreground-muted font-mono">{p.payment_reference || '-'}</span>;
                  case 'payment_status':
                    return <StatusBadge config={PAYMENT_STATUS_MAP[p.status] || { label: p.status, className: 'bg-foreground/5 text-foreground-muted border-border' }} />;
                  case 'send_status':
                    return <StatusBadge config={SEND_STATUS_MAP[p.send_status]} />;
                  case 'sent':
                    return <span className="text-sm text-foreground-muted">{formatKES(p.sent_amount)}</span>;
                  case 'pending':
                    return <span className="text-sm text-foreground-muted">{formatKES(p.pending_send_amount)}</span>;
                  case 'unsent':
                    return <span className={`text-sm ${p.unsent_amount > 0 ? 'text-amber-500 font-medium' : 'text-foreground-muted'}`}>{formatKES(p.unsent_amount)}</span>;
                  default:
                    return null;
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
                title={p.reseller_name || p.reseller_email}
                subtitle={formatSafeDate(p.created_at)}
                status={{
                  label: SEND_STATUS_MAP[p.send_status].label,
                  variant: p.send_status === 'sent' ? 'success' : p.send_status === 'unsent' ? 'warning' : p.send_status === 'not_applicable' ? 'neutral' : 'info',
                }}
                value={{ text: formatKES(p.amount) }}
                fields={[
                  { value: `Ref: ${p.payment_reference || '-'}` },
                  { value: `Unsent: ${formatKES(p.unsent_amount)}` },
                ]}
                layout="compact"
              />
            ))}
          </div>

          {/* Pagination */}
          {response && response.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-foreground-muted">
                Page {response.page} of {response.total_pages} ({response.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border text-foreground-muted hover:bg-background-tertiary disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= response.total_pages}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border text-foreground-muted hover:bg-background-tertiary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Bank Destination Tab
// ────────────────────────────────────────────────────────────────────

function BankDestinationTab({
  destinations,
  loading,
  error,
  showCreateForm,
  onToggleForm,
  createLoading,
  formMethodType,
  onMethodTypeChange,
  formLabel,
  onLabelChange,
  formBankPaybill,
  onBankPaybillChange,
  formBankAccount,
  onBankAccountChange,
  formMpesaPaybill,
  onMpesaPaybillChange,
  onSubmit,
  onRetry,
}: {
  destinations: OwnerBankDestination[];
  loading: boolean;
  error: string | null;
  showCreateForm: boolean;
  onToggleForm: () => void;
  createLoading: boolean;
  formMethodType: 'bank_account' | 'mpesa_paybill';
  onMethodTypeChange: (v: 'bank_account' | 'mpesa_paybill') => void;
  formLabel: string;
  onLabelChange: (v: string) => void;
  formBankPaybill: string;
  onBankPaybillChange: (v: string) => void;
  formBankAccount: string;
  onBankAccountChange: (v: string) => void;
  formMpesaPaybill: string;
  onMpesaPaybillChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-danger mb-4">{error}</p>
        <button onClick={onRetry} className="btn-primary px-4 py-2 text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing Destinations */}
      {destinations.length > 0 ? (
        <div className="space-y-3">
          {destinations.filter(d => d.is_active).map(d => (
            <div key={d.id} className="card p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold">{d.label}</h4>
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-foreground-muted capitalize">{d.method_type.replace('_', ' ')}</p>
                  {d.method_type === 'bank_account' ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm"><span className="text-foreground-muted">Paybill:</span> {d.bank_paybill_number}</p>
                      <p className="text-sm"><span className="text-foreground-muted">Account:</span> {d.bank_account_number}</p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-sm"><span className="text-foreground-muted">Paybill:</span> {d.mpesa_paybill_number}</p>
                    </div>
                  )}
                </div>
                <span className="text-xs text-foreground-muted">{formatSafeDate(d.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-foreground-muted/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
          <p className="text-sm text-foreground-muted mb-1">No bank destinations configured</p>
          <p className="text-xs text-foreground-muted">Add a destination to enable transfers</p>
        </div>
      )}

      {/* Add Button */}
      <button
        onClick={onToggleForm}
        className={`w-full px-4 py-2 text-sm rounded-xl border transition-colors ${
          showCreateForm
            ? 'border-amber-500/20 bg-amber-500/10 text-amber-500'
            : 'border-border text-foreground-muted hover:bg-background-tertiary'
        }`}
      >
        {showCreateForm ? 'Cancel' : '+ Add Destination'}
      </button>

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={onSubmit} className="card p-5 space-y-4">
          <h4 className="text-sm font-semibold">New Bank Destination</h4>

          <div>
            <label className="block text-xs text-foreground-muted mb-1">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onMethodTypeChange('bank_account')}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  formMethodType === 'bank_account'
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    : 'border-border text-foreground-muted hover:bg-background-tertiary'
                }`}
              >
                Bank Account
              </button>
              <button
                type="button"
                onClick={() => onMethodTypeChange('mpesa_paybill')}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  formMethodType === 'mpesa_paybill'
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    : 'border-border text-foreground-muted hover:bg-background-tertiary'
                }`}
              >
                M-Pesa Paybill
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-foreground-muted mb-1">Label</label>
            <input
              type="text"
              value={formLabel}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder="e.g. Equity Settlement Account"
              className="input text-sm"
              required
            />
          </div>

          {formMethodType === 'bank_account' ? (
            <>
              <div>
                <label className="block text-xs text-foreground-muted mb-1">Bank Paybill Number</label>
                <input
                  type="text"
                  value={formBankPaybill}
                  onChange={(e) => onBankPaybillChange(e.target.value)}
                  placeholder="e.g. 247247"
                  className="input text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-foreground-muted mb-1">Bank Account Number</label>
                <input
                  type="text"
                  value={formBankAccount}
                  onChange={(e) => onBankAccountChange(e.target.value)}
                  placeholder="e.g. 1234567890"
                  className="input text-sm"
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs text-foreground-muted mb-1">M-Pesa Paybill Number</label>
              <input
                type="text"
                value={formMpesaPaybill}
                onChange={(e) => onMpesaPaybillChange(e.target.value)}
                placeholder="e.g. 123456"
                className="input text-sm"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={createLoading}
            className="btn-primary px-4 py-2 text-sm w-full disabled:opacity-50"
          >
            {createLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Creating...
              </span>
            ) : 'Create Destination'}
          </button>
        </form>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Transfer History Tab
// ────────────────────────────────────────────────────────────────────

function TransferHistoryTab({
  transactions,
  loading,
  error,
  onRetry,
}: {
  transactions: B2BTransaction[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-danger mb-4">{error}</p>
        <button onClick={onRetry} className="btn-primary px-4 py-2 text-sm">Retry</button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="card p-8 text-center">
        <svg className="w-12 h-12 mx-auto text-foreground-muted/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-sm text-foreground-muted">No transfers yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <DataTable
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'amount', label: 'Amount', className: 'text-right' },
            { key: 'fee', label: 'Fee', className: 'text-right' },
            { key: 'net', label: 'Net Amount', className: 'text-right' },
            { key: 'destination', label: 'Destination' },
            { key: 'status', label: 'Status' },
            { key: 'result', label: 'Result' },
            { key: 'tx_id', label: 'M-Pesa ID' },
            { key: 'completed', label: 'Completed' },
          ]}
          data={transactions}
          rowKey={(t) => t.id}
          renderCell={(t, col) => {
            switch (col) {
              case 'date':
                return <span className="text-xs text-foreground-muted">{formatDateTime(t.created_at)}</span>;
              case 'amount':
                return <span className="text-sm font-medium">{formatKES(t.amount)}</span>;
              case 'fee':
                return <span className="text-sm text-red-400">{formatKES(t.fee)}</span>;
              case 'net':
                return <span className="text-sm font-medium text-emerald-500">{formatKES(t.net_amount)}</span>;
              case 'destination':
                return (
                  <div className="text-xs text-foreground-muted">
                    <p>{t.party_b}</p>
                    {t.account_reference && <p className="font-mono">{t.account_reference}</p>}
                  </div>
                );
              case 'status':
                return <StatusBadge config={B2B_STATUS_MAP[t.status] || { label: t.status, className: 'bg-foreground/5 text-foreground-muted border-border' }} />;
              case 'result':
                return <span className="text-xs text-foreground-muted max-w-[200px] truncate block">{t.result_desc || '-'}</span>;
              case 'tx_id':
                return <span className="text-xs font-mono text-foreground-muted">{t.transaction_id || '-'}</span>;
              case 'completed':
                return <span className="text-xs text-foreground-muted">{formatDateTime(t.completed_at)}</span>;
              default:
                return null;
            }
          }}
          emptyState={{ message: 'No transfers found' }}
        />
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {transactions.map((t) => (
          <MobileDataCard
            key={t.id}
            id={t.id}
            title={`Transfer #${t.id}`}
            subtitle={formatDateTime(t.created_at)}
            status={{
              label: (B2B_STATUS_MAP[t.status] || { label: t.status }).label,
              variant: t.status === 'completed' ? 'success' : t.status === 'failed' ? 'danger' : 'warning',
            }}
            value={{ text: formatKES(t.net_amount) }}
            fields={[
              { value: `Gross: ${formatKES(t.amount)} | Fee: ${formatKES(t.fee)}` },
              { value: `To: ${t.party_b}${t.account_reference ? ` / ${t.account_reference}` : ''}` },
              ...(t.transaction_id ? [{ value: `ID: ${t.transaction_id}` }] : []),
            ]}
            layout="compact"
          />
        ))}
      </div>
    </div>
  );
}
