'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../lib/api';
import {
  AdminResellerDetail,
  AdminResellerPayment,
  AdminRouterDetail,
  AdminPayout,
  AdminCreatePayoutRequest,
} from '../../../lib/types';
import { formatDateGMT3 } from '../../../lib/dateUtils';
import { useAuth } from '../../../context/AuthContext';
import { useAlert } from '../../../context/AlertContext';
import Header from '../../../components/Header';
import StatCard from '../../../components/StatCard';
import { MiniStat } from '../../../components/StatCard';
import DataTable from '../../../components/DataTable';
import MobileDataCard from '../../../components/MobileDataCard';
import FilterDatePicker from '../../../components/FilterDatePicker';
import { SkeletonCard } from '../../../components/LoadingSpinner';

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

const formatShortDate = (dateStr: string | null | undefined): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return formatDateGMT3(dateStr, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '-';
  }
};

const formatKES = (amount: number): string => {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

type Tab = 'payments' | 'routers' | 'payouts';

export default function ResellerDetailPage() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const params = useParams();
  const resellerId = Number(params.id);

  const [detail, setDetail] = useState<AdminResellerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('payments');

  // Revenue date filter
  const [revenueStartDate, setRevenueStartDate] = useState('');
  const [revenueEndDate, setRevenueEndDate] = useState('');
  const [revenueFilterLoading, setRevenueFilterLoading] = useState(false);

  // Payments tab state
  const [allPayments, setAllPayments] = useState<AdminResellerPayment[]>([]);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState('');
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [paymentsSummary, setPaymentsSummary] = useState<{ total_transactions: number; total_amount: number; mpesa_amount: number } | null>(null);

  // Routers tab state
  const [routers, setRouters] = useState<AdminRouterDetail[]>([]);
  const [routersLoading, setRoutersLoading] = useState(false);
  const [routersLoaded, setRoutersLoaded] = useState(false);

  // Payouts tab state
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [payoutsTotalPages, setPayoutsTotalPages] = useState(1);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutsLoaded, setPayoutsLoaded] = useState(false);
  const [payoutStartDate, setPayoutStartDate] = useState('');
  const [payoutEndDate, setPayoutEndDate] = useState('');

  // Payout modal state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState<AdminCreatePayoutRequest>({
    amount: 0,
    payment_method: 'mpesa',
    reference: '',
    notes: '',
    period_start: '',
    period_end: '',
  });
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutError, setPayoutError] = useState('');

  const fetchDetail = useCallback(async (dateParams?: { start_date?: string; end_date?: string }) => {
    try {
      if (dateParams) {
        setRevenueFilterLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const result = await api.getAdminResellerDetail(resellerId, {
        start_date: dateParams?.start_date || undefined,
        end_date: dateParams?.end_date || undefined,
      });
      setDetail(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reseller');
    } finally {
      setLoading(false);
      setRevenueFilterLoading(false);
    }
  }, [resellerId]);

  const fetchPayments = useCallback(async (page = 1) => {
    try {
      setPaymentsLoading(true);
      const result = await api.getAdminResellerPayments(resellerId, {
        page,
        per_page: 50,
        date: paymentDate || undefined,
      });
      setAllPayments(result.payments);
      setPaymentsPage(result.page);
      setPaymentsTotalPages(result.total_pages);
      setPaymentsSummary(result.summary);
    } catch {
      // silently fail, user can retry
    } finally {
      setPaymentsLoading(false);
    }
  }, [resellerId, paymentDate]);

  const fetchRouters = useCallback(async () => {
    try {
      setRoutersLoading(true);
      const result = await api.getAdminResellerRouters(resellerId);
      setRouters(result.routers);
      setRoutersLoaded(true);
    } catch {
      // silently fail
    } finally {
      setRoutersLoading(false);
    }
  }, [resellerId]);

  const fetchPayouts = useCallback(async (page = 1) => {
    try {
      setPayoutsLoading(true);
      const result = await api.getAdminPayouts(resellerId, {
        page,
        per_page: 50,
        start_date: payoutStartDate || undefined,
        end_date: payoutEndDate || undefined,
      });
      setPayouts(result.payouts);
      setPayoutsPage(result.page);
      setPayoutsTotalPages(result.total_pages);
      setPayoutsLoaded(true);
    } catch {
      // silently fail
    } finally {
      setPayoutsLoading(false);
    }
  }, [resellerId, payoutStartDate, payoutEndDate]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  useEffect(() => {
    if (activeTab === 'routers' && !routersLoaded) fetchRouters();
  }, [activeTab, routersLoaded, fetchRouters]);

  useEffect(() => {
    if (activeTab === 'payouts' && !payoutsLoaded) fetchPayouts();
  }, [activeTab, payoutsLoaded, fetchPayouts]);

  useEffect(() => {
    if (showAllPayments) fetchPayments(1);
  }, [showAllPayments, fetchPayments]);

  const handleSubmitPayout = async () => {
    if (payoutForm.amount <= 0) {
      setPayoutError('Amount must be greater than 0');
      return;
    }
    try {
      setPayoutSubmitting(true);
      setPayoutError('');
      await api.createAdminPayout(resellerId, {
        ...payoutForm,
        period_start: payoutForm.period_start || undefined,
        period_end: payoutForm.period_end || undefined,
        reference: payoutForm.reference || undefined,
        notes: payoutForm.notes || undefined,
      });
      showAlert('success', 'Payout recorded successfully');
      setShowPayoutModal(false);
      setPayoutForm({ amount: 0, payment_method: 'mpesa', reference: '', notes: '', period_start: '', period_end: '' });
      setPayoutsLoaded(false);
      fetchDetail(revenueStartDate || revenueEndDate ? { start_date: revenueStartDate, end_date: revenueEndDate } : undefined);
    } catch (err) {
      setPayoutError(err instanceof Error ? err.message : 'Failed to record payout');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-danger mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
          <p className="text-foreground-muted text-sm">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 pb-24 md:pb-6">
        <Header title="Loading..." backHref="/admin/resellers" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4 pb-24 md:pb-6">
        <Header title="Error" backHref="/admin/resellers" />
        <div className="card p-8 text-center">
          <p className="text-danger mb-4">{error || 'Reseller not found'}</p>
          <button onClick={() => fetchDetail()} className="btn-primary px-4 py-2 text-sm">Retry</button>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'payments', label: 'Payments' },
    { key: 'routers', label: `Routers (${detail.routers.length})` },
    { key: 'payouts', label: 'Payouts' },
  ];

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      <Header
        title={detail.organization_name}
        subtitle={detail.email}
        backHref="/admin/resellers"
        action={
          <button onClick={() => setShowPayoutModal(true)} className="btn-primary text-sm px-4 py-2">
            Record Payout
          </button>
        }
      />

      {/* Paybill Highlight */}
      <div className="card p-4 sm:p-5 border-2 border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">M-Pesa Paybill / Till Number</p>
              <p className="text-2xl font-bold text-emerald-500 font-mono tracking-wider">{detail.mpesa_shortcode}</p>
            </div>
          </div>
          <button
            onClick={() => setShowPayoutModal(true)}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Record Payment
          </button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-foreground-muted mb-0.5">Business Name</p>
            <p className="font-medium">{detail.business_name}</p>
          </div>
          <div>
            <p className="text-xs text-foreground-muted mb-0.5">Support Phone</p>
            <p className="font-medium">{detail.support_phone}</p>
          </div>
          <div>
            <p className="text-xs text-foreground-muted mb-0.5">Joined</p>
            <p className="font-medium">{formatSafeDate(detail.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-foreground-muted mb-0.5">Last Login</p>
            <p className="font-medium">{formatSafeDate(detail.last_login_at)}</p>
          </div>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="card p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Revenue</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-foreground-muted">Filter:</span>
            <FilterDatePicker value={revenueStartDate} onChange={setRevenueStartDate} />
            <span className="text-foreground-muted text-xs">to</span>
            <FilterDatePicker value={revenueEndDate} onChange={setRevenueEndDate} />
            <button
              onClick={() => fetchDetail({ start_date: revenueStartDate, end_date: revenueEndDate })}
              disabled={revenueFilterLoading || (!revenueStartDate && !revenueEndDate)}
              className="btn-primary text-xs px-3 py-1 disabled:opacity-40"
            >
              {revenueFilterLoading ? 'Loading...' : 'Apply'}
            </button>
            {(revenueStartDate || revenueEndDate) && (
              <button
                onClick={() => { setRevenueStartDate(''); setRevenueEndDate(''); fetchDetail(); }}
                className="text-xs text-accent-primary hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {detail.revenue.period !== undefined ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="card p-4 bg-background-tertiary/50">
              <p className="text-xs text-foreground-muted mb-1">Period Total</p>
              <p className="text-xl font-bold">{formatKES(detail.revenue.period)}</p>
            </div>
            <div className="card p-4 bg-background-tertiary/50">
              <p className="text-xs text-foreground-muted mb-1">Period M-Pesa</p>
              <p className="text-xl font-bold text-emerald-500">{formatKES(detail.revenue.period_mpesa ?? 0)}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Today', total: detail.revenue.today ?? 0, mpesa: detail.revenue.today_mpesa ?? 0, accent: 'primary' as const },
              { label: 'This Week', total: detail.revenue.this_week ?? 0, mpesa: detail.revenue.this_week_mpesa ?? 0, accent: 'info' as const },
              { label: 'This Month', total: detail.revenue.this_month ?? 0, mpesa: detail.revenue.this_month_mpesa ?? 0, accent: 'success' as const },
              { label: 'All Time', total: detail.revenue.all_time ?? 0, mpesa: detail.revenue.all_time_mpesa ?? 0, accent: 'secondary' as const },
            ].map((item) => (
              <StatCard
                key={item.label}
                title={item.label}
                value={formatKES(item.total)}
                subtitle={`M-Pesa: ${formatKES(item.mpesa)}`}
                accent={item.accent}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1" /></svg>}
              />
            ))}
          </div>
        )}
      </div>

      {/* Customer Summary + Payout Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Customers</h3>
          <div className="grid grid-cols-4 gap-2">
            <MiniStat label="Active" value={detail.customers.active} color="success" />
            <MiniStat label="Inactive" value={detail.customers.inactive} color="default" />
            <MiniStat label="Pending" value={detail.customers.pending} color="warning" />
            <MiniStat label="Total" value={detail.customers.total} color="primary" />
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Payout Status</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-500 stat-value">{formatKES(detail.payouts.total_paid)}</p>
              <p className="text-xs text-foreground-muted mt-0.5">Paid</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-500 stat-value">{formatKES(detail.payouts.unpaid_balance)}</p>
              <p className="text-xs text-foreground-muted mt-0.5">Unpaid</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground-muted stat-value">{formatShortDate(detail.payouts.last_payout_date)}</p>
              <p className="text-xs text-foreground-muted mt-0.5">Last Payout</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-accent-primary'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'payments' && (
        <PaymentsTab
          recentPayments={detail.recent_payments}
          allPayments={allPayments}
          showAll={showAllPayments}
          onShowAll={() => setShowAllPayments(true)}
          loading={paymentsLoading}
          page={paymentsPage}
          totalPages={paymentsTotalPages}
          onPageChange={(p) => fetchPayments(p)}
          dateFilter={paymentDate}
          onDateChange={(d) => { setPaymentDate(d); if (showAllPayments) fetchPayments(1); }}
          summary={paymentsSummary}
        />
      )}

      {activeTab === 'routers' && (
        <RoutersTab routers={routers} loading={routersLoading} />
      )}

      {activeTab === 'payouts' && (
        <PayoutsTab
          payouts={payouts}
          loading={payoutsLoading}
          page={payoutsPage}
          totalPages={payoutsTotalPages}
          onPageChange={(p) => fetchPayouts(p)}
          startDate={payoutStartDate}
          endDate={payoutEndDate}
          onStartDateChange={(d) => { setPayoutStartDate(d); setPayoutsLoaded(false); }}
          onEndDateChange={(d) => { setPayoutEndDate(d); setPayoutsLoaded(false); }}
          onRecordPayout={() => setShowPayoutModal(true)}
        />
      )}

      {/* Record Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !payoutSubmitting && setShowPayoutModal(false)} />
          <div className="relative bg-background-secondary border border-border rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Record Payout</h3>

            {/* Paybill highlight in modal */}
            <div className="mb-4 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-foreground-muted">Pay to M-Pesa Paybill</p>
                  <p className="text-xl font-bold text-emerald-500 font-mono tracking-wider">{detail.mpesa_shortcode}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-foreground-muted">Unpaid Balance</p>
                  <p className="text-lg font-bold text-amber-500">{formatKES(detail.payouts.unpaid_balance)}</p>
                </div>
              </div>
              <p className="text-xs text-foreground-muted mt-1">{detail.organization_name} &bull; {detail.business_name}</p>
            </div>

            {payoutError && (
              <div className="mb-4 p-3 rounded-xl bg-danger/10 text-danger text-sm">{payoutError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount (KES) *</label>
                <input
                  type="number"
                  className="input w-full"
                  value={payoutForm.amount || ''}
                  onChange={(e) => setPayoutForm({ ...payoutForm, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Method *</label>
                <select
                  className="select w-full"
                  value={payoutForm.payment_method}
                  onChange={(e) => setPayoutForm({ ...payoutForm, payment_method: e.target.value })}
                >
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reference</label>
                <input
                  type="text"
                  className="input w-full"
                  value={payoutForm.reference}
                  onChange={(e) => setPayoutForm({ ...payoutForm, reference: e.target.value })}
                  placeholder="M-Pesa code, bank ref, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  value={payoutForm.notes}
                  onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                  placeholder="e.g. March week 3 payout"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Period Start</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={payoutForm.period_start}
                    onChange={(e) => setPayoutForm({ ...payoutForm, period_start: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Period End</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={payoutForm.period_end}
                    onChange={(e) => setPayoutForm({ ...payoutForm, period_end: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPayoutModal(false)}
                className="btn-secondary flex-1 py-2.5"
                disabled={payoutSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPayout}
                className="btn-primary flex-1 py-2.5"
                disabled={payoutSubmitting || payoutForm.amount <= 0}
              >
                {payoutSubmitting ? 'Recording...' : 'Record Payout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Payments Tab ────────────────────────────────────────────────────

function PaymentsTab({
  recentPayments,
  allPayments,
  showAll,
  onShowAll,
  loading,
  page,
  totalPages,
  onPageChange,
  dateFilter,
  onDateChange,
  summary,
}: {
  recentPayments: AdminResellerPayment[];
  allPayments: AdminResellerPayment[];
  showAll: boolean;
  onShowAll: () => void;
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  dateFilter: string;
  onDateChange: (d: string) => void;
  summary: { total_transactions: number; total_amount: number; mpesa_amount: number } | null;
}) {
  const payments = showAll ? allPayments : recentPayments;

  return (
    <div className="space-y-3">
      {showAll && (
        <div className="flex flex-wrap items-center gap-3">
          <FilterDatePicker value={dateFilter} onChange={onDateChange} />
          {summary && (
            <div className="flex items-center gap-4 ml-auto text-sm">
              <span className="text-foreground-muted">{summary.total_transactions} txns</span>
              <span className="font-medium">{formatKES(summary.total_amount)}</span>
              <span className="text-emerald-500 text-xs">M-Pesa: {formatKES(summary.mpesa_amount)}</span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : payments.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-foreground-muted">No payments found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <DataTable
              columns={[
                { key: 'id', label: 'ID', className: 'w-[70px]' },
                { key: 'customer', label: 'Customer' },
                { key: 'plan', label: 'Plan' },
                { key: 'method', label: 'Method' },
                { key: 'amount', label: 'Amount', className: 'text-right' },
                { key: 'date', label: 'Date' },
              ]}
              data={payments}
              rowKey={(item) => item.id}
              renderCell={(item, col) => {
                switch (col) {
                  case 'id': return <span className="text-foreground-muted text-xs">#{item.id}</span>;
                  case 'customer':
                    return (
                      <div>
                        <p className="text-sm font-medium">{item.customer_name}</p>
                        <p className="text-xs text-foreground-muted">{item.customer_phone}</p>
                      </div>
                    );
                  case 'plan': return <span className="badge-info text-xs">{item.plan_name}</span>;
                  case 'method': return <span className="text-sm capitalize">{item.payment_method.replace('_', ' ')}</span>;
                  case 'amount': return <span className="font-semibold text-sm">{formatKES(item.amount)}</span>;
                  case 'date': return <span className="text-sm text-foreground-muted">{formatSafeDate(item.created_at)}</span>;
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
                title={p.customer_name}
                subtitle={p.customer_phone}
                avatar={{ text: p.customer_name.slice(0, 2).toUpperCase(), color: 'success' }}
                value={{ text: formatKES(p.amount) }}
                secondary={{ left: <span>{p.plan_name}</span>, right: null }}
                footer={
                  <div className="flex items-center justify-between text-xs text-foreground-muted">
                    <span className="capitalize">{p.payment_method.replace('_', ' ')}</span>
                    <span>{formatSafeDate(p.created_at)}</span>
                  </div>
                }
                layout="compact"
              />
            ))}
          </div>

          {/* Pagination / View All */}
          {showAll && totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-foreground-muted">Page {page} of {totalPages}</span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}

          {!showAll && (
            <button onClick={onShowAll} className="btn-secondary w-full py-2 text-sm">
              View All Payments
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Routers Tab ─────────────────────────────────────────────────────

function RoutersTab({ routers, loading }: { routers: AdminRouterDetail[]; loading: boolean }) {
  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  }

  if (routers.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-foreground-muted">No routers found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {routers.map((r) => (
        <div key={r.id} className="card p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-sm">{r.name}</h4>
              <p className="text-xs text-foreground-muted">{r.identity}</p>
            </div>
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
              r.is_online
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-red-500/10 text-red-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${r.is_online ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {r.is_online ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-foreground-muted">IP</p>
              <p className="font-mono text-xs">{r.ip_address}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">Customers</p>
              <p className="font-semibold">{r.customer_count}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">Revenue</p>
              <p className="font-semibold text-emerald-500">{formatKES(r.total_revenue)}</p>
            </div>
          </div>
          {r.last_checked_at && (
            <p className="text-[10px] text-foreground-muted mt-2">
              Checked: {formatSafeDate(r.last_checked_at)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Payouts Tab ─────────────────────────────────────────────────────

function PayoutsTab({
  payouts,
  loading,
  page,
  totalPages,
  onPageChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRecordPayout,
}: {
  payouts: AdminPayout[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (d: string) => void;
  onEndDateChange: (d: string) => void;
  onRecordPayout: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <FilterDatePicker value={startDate} onChange={onStartDateChange} />
        <span className="text-foreground-muted text-sm">to</span>
        <FilterDatePicker value={endDate} onChange={onEndDateChange} />
        <button onClick={onRecordPayout} className="btn-primary text-sm px-3 py-1.5 ml-auto">
          Record Payout
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : payouts.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-foreground-muted">No payouts found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <DataTable
              columns={[
                { key: 'id', label: 'ID', className: 'w-[60px]' },
                { key: 'amount', label: 'Amount', className: 'text-right' },
                { key: 'method', label: 'Method' },
                { key: 'reference', label: 'Reference' },
                { key: 'notes', label: 'Notes' },
                { key: 'period', label: 'Period' },
                { key: 'date', label: 'Date' },
              ]}
              data={payouts}
              rowKey={(item) => item.id}
              renderCell={(item, col) => {
                switch (col) {
                  case 'id': return <span className="text-foreground-muted text-xs">#{item.id}</span>;
                  case 'amount': return <span className="font-semibold text-emerald-500">{formatKES(item.amount)}</span>;
                  case 'method': return <span className="text-sm capitalize">{item.payment_method}</span>;
                  case 'reference': return <span className="text-sm font-mono text-foreground-muted">{item.reference || '-'}</span>;
                  case 'notes': return <span className="text-sm text-foreground-muted truncate max-w-[150px] block">{item.notes || '-'}</span>;
                  case 'period':
                    return item.period_start && item.period_end
                      ? <span className="text-xs text-foreground-muted">{formatShortDate(item.period_start)} - {formatShortDate(item.period_end)}</span>
                      : <span className="text-foreground-muted">-</span>;
                  case 'date': return <span className="text-sm text-foreground-muted">{formatSafeDate(item.created_at)}</span>;
                  default: return null;
                }
              }}
              emptyState={{ message: 'No payouts recorded' }}
            />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {payouts.map((p) => (
              <MobileDataCard
                key={p.id}
                id={p.id}
                title={formatKES(p.amount)}
                subtitle={p.notes || undefined}
                avatar={{ text: p.payment_method.slice(0, 2).toUpperCase(), color: 'success' }}
                status={{
                  label: p.payment_method,
                  variant: 'info',
                }}
                fields={[
                  ...(p.reference ? [{ label: 'Ref', value: p.reference }] : []),
                  ...(p.period_start && p.period_end ? [{
                    label: 'Period',
                    value: `${formatShortDate(p.period_start)} - ${formatShortDate(p.period_end)}`,
                  }] : []),
                ]}
                footer={
                  <span className="text-xs text-foreground-muted">{formatSafeDate(p.created_at)}</span>
                }
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-foreground-muted">Page {page} of {totalPages}</span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
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
