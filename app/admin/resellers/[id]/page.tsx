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
  AdminTransactionCharge,
  AdminCreateTransactionChargeRequest,
  AdminPaymentMethod,
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
import Pagination from '../../../components/Pagination';

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

const formatKES = (amount: number | undefined | null): string => {
  return `KES ${(amount ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

type Tab = 'payments' | 'routers' | 'payouts' | 'charges';

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
  const [paymentsPerPage, setPaymentsPerPage] = useState(20);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);
  const [paymentsTotalCount, setPaymentsTotalCount] = useState(0);
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
  const [payoutsPerPage, setPayoutsPerPage] = useState(20);
  const [payoutsTotalPages, setPayoutsTotalPages] = useState(1);
  const [payoutsTotalCount, setPayoutsTotalCount] = useState(0);
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

  // Transaction charges state
  const [charges, setCharges] = useState<AdminTransactionCharge[]>([]);
  const [chargesPage, setChargesPage] = useState(1);
  const [chargesPerPage, setChargesPerPage] = useState(20);
  const [chargesTotalPages, setChargesTotalPages] = useState(1);
  const [chargesTotalCount, setChargesTotalCount] = useState(0);
  const [chargesLoading, setChargesLoading] = useState(false);
  const [chargesLoaded, setChargesLoaded] = useState(false);
  const [chargeStartDate, setChargeStartDate] = useState('');
  const [chargeEndDate, setChargeEndDate] = useState('');
  const [chargesSummary, setChargesSummary] = useState<{ total_charges: number; total_amount: number } | null>(null);

  // Charge modal state
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [chargeForm, setChargeForm] = useState<AdminCreateTransactionChargeRequest>({
    amount: 0,
    description: '',
    reference: '',
  });
  const [chargeSubmitting, setChargeSubmitting] = useState(false);
  const [chargeError, setChargeError] = useState('');

  // B2B Payout modal state
  const [showB2BPayoutModal, setShowB2BPayoutModal] = useState(false);
  const [b2bStep, setB2bStep] = useState<'confirm' | 'sending' | 'result'>('confirm');
  const [b2bPreview, setB2bPreview] = useState<Record<string, unknown> | null>(null);
  const [b2bPreviewLoading, setB2bPreviewLoading] = useState(false);
  const [b2bSelectedMethodId, setB2bSelectedMethodId] = useState<number | undefined>(undefined);
  const [b2bResult, setB2bResult] = useState<Record<string, unknown> | null>(null);
  const [b2bSubmitting, setB2bSubmitting] = useState(false);
  const [b2bError, setB2bError] = useState('');

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

  const fetchPayments = useCallback(async (page = 1, pp = paymentsPerPage) => {
    try {
      setPaymentsLoading(true);
      const result = await api.getAdminResellerPayments(resellerId, {
        page,
        per_page: pp,
        date: paymentDate || undefined,
      });
      setAllPayments(result.payments);
      setPaymentsPage(result.page);
      setPaymentsTotalPages(result.total_pages);
      setPaymentsTotalCount(result.total_count);
      setPaymentsSummary(result.summary);
    } catch {
      // silently fail, user can retry
    } finally {
      setPaymentsLoading(false);
    }
  }, [resellerId, paymentDate, paymentsPerPage]);

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

  const fetchPayouts = useCallback(async (page = 1, pp = payoutsPerPage) => {
    try {
      setPayoutsLoading(true);
      const result = await api.getAdminPayouts(resellerId, {
        page,
        per_page: pp,
        start_date: payoutStartDate || undefined,
        end_date: payoutEndDate || undefined,
      });
      setPayouts(result.payouts);
      setPayoutsPage(result.page);
      setPayoutsTotalPages(result.total_pages);
      setPayoutsTotalCount(result.total_count);
      setPayoutsLoaded(true);
    } catch {
      // silently fail
    } finally {
      setPayoutsLoading(false);
    }
  }, [resellerId, payoutStartDate, payoutEndDate, payoutsPerPage]);

  const fetchCharges = useCallback(async (page = 1, pp = chargesPerPage) => {
    try {
      setChargesLoading(true);
      const result = await api.getAdminTransactionCharges(resellerId, {
        page,
        per_page: pp,
        start_date: chargeStartDate || undefined,
        end_date: chargeEndDate || undefined,
      });
      setCharges(result.charges);
      setChargesPage(result.page);
      setChargesTotalPages(result.total_pages);
      setChargesTotalCount(result.total_count);
      setChargesSummary(result.summary);
      setChargesLoaded(true);
    } catch {
      // silently fail
    } finally {
      setChargesLoading(false);
    }
  }, [resellerId, chargeStartDate, chargeEndDate, chargesPerPage]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  useEffect(() => {
    if (activeTab === 'routers' && !routersLoaded) fetchRouters();
  }, [activeTab, routersLoaded, fetchRouters]);

  useEffect(() => {
    if (activeTab === 'payouts' && !payoutsLoaded) fetchPayouts();
  }, [activeTab, payoutsLoaded, fetchPayouts]);

  useEffect(() => {
    if (activeTab === 'charges' && !chargesLoaded) fetchCharges();
  }, [activeTab, chargesLoaded, fetchCharges]);

  useEffect(() => {
    if (showAllPayments) fetchPayments(1);
  }, [showAllPayments, fetchPayments]);

  const handleSubmitCharge = async () => {
    if (chargeForm.amount <= 0) {
      setChargeError('Amount must be greater than 0');
      return;
    }
    if (!chargeForm.description.trim()) {
      setChargeError('Description is required');
      return;
    }
    try {
      setChargeSubmitting(true);
      setChargeError('');
      await api.createAdminTransactionCharge(resellerId, {
        ...chargeForm,
        reference: chargeForm.reference || undefined,
      });
      showAlert('success', 'Transaction charge recorded successfully');
      setShowChargeModal(false);
      setChargeForm({ amount: 0, description: '', reference: '' });
      setChargesLoaded(false);
      fetchDetail(revenueStartDate || revenueEndDate ? { start_date: revenueStartDate, end_date: revenueEndDate } : undefined);
    } catch (err) {
      setChargeError(err instanceof Error ? err.message : 'Failed to record charge');
    } finally {
      setChargeSubmitting(false);
    }
  };

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

  const handleOpenB2BPayout = async () => {
    setShowB2BPayoutModal(true);
    setB2bStep('confirm');
    setB2bPreview(null);
    setB2bResult(null);
    setB2bError('');
    setB2bSelectedMethodId(undefined);
    try {
      setB2bPreviewLoading(true);
      const preview = await api.getB2BFeePreview(resellerId);
      setB2bPreview(preview);
    } catch {
      // Preview is optional — we still show the confirmation with known balance
    } finally {
      setB2bPreviewLoading(false);
    }
  };

  const handleConfirmB2BPayout = async () => {
    try {
      setB2bSubmitting(true);
      setB2bError('');
      setB2bStep('sending');
      const result = await api.triggerB2BPayout(
        resellerId,
        b2bSelectedMethodId ? { payment_method_id: b2bSelectedMethodId } : undefined
      );
      setB2bResult(result);
      setB2bStep('result');
      showAlert('success', 'Payout triggered — Safaricom is processing it in the background.');
      setPayoutsLoaded(false);
      fetchDetail(revenueStartDate || revenueEndDate ? { start_date: revenueStartDate, end_date: revenueEndDate } : undefined);
    } catch (err) {
      setB2bError(err instanceof Error ? err.message : 'Failed to trigger payout');
      setB2bStep('confirm');
    } finally {
      setB2bSubmitting(false);
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
    { key: 'charges', label: 'Charges' },
  ];

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      <Header
        title={detail.organization_name}
        subtitle={detail.email}
        backHref="/admin/resellers"
        action={
          <div className="flex items-center gap-2">
            <button onClick={handleOpenB2BPayout} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              Send Payout
            </button>
            <button onClick={() => setShowPayoutModal(true)} className="btn-secondary text-sm px-4 py-2">
              Record Payout
            </button>
          </div>
        }
      />

      {/* Payment Methods */}
      <PaymentMethodsSection
        methods={detail.payment_methods || []}
        fallbackShortcode={detail.mpesa_shortcode}
        onRecordPayout={() => setShowPayoutModal(true)}
        onSendPayout={handleOpenB2BPayout}
      />

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
          <div className={`grid gap-2 ${detail.payouts.total_transaction_charges ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-500 stat-value">{formatKES(detail.payouts.total_paid)}</p>
              <p className="text-xs text-foreground-muted mt-0.5">Paid</p>
            </div>
            {(detail.payouts.total_transaction_charges != null && detail.payouts.total_transaction_charges > 0) && (
              <div className="text-center">
                <p className="text-lg font-bold text-orange-500 stat-value">{formatKES(detail.payouts.total_transaction_charges)}</p>
                <p className="text-xs text-foreground-muted mt-0.5">Charges</p>
              </div>
            )}
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
          perPage={paymentsPerPage}
          total={paymentsTotalCount}
          onPageChange={(p) => fetchPayments(p)}
          onPerPageChange={(pp) => { setPaymentsPerPage(pp); setPaymentsPage(1); fetchPayments(1, pp); }}
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
          perPage={payoutsPerPage}
          total={payoutsTotalCount}
          onPageChange={(p) => fetchPayouts(p)}
          onPerPageChange={(pp) => { setPayoutsPerPage(pp); setPayoutsPage(1); fetchPayouts(1, pp); }}
          startDate={payoutStartDate}
          endDate={payoutEndDate}
          onStartDateChange={(d) => { setPayoutStartDate(d); setPayoutsLoaded(false); }}
          onEndDateChange={(d) => { setPayoutEndDate(d); setPayoutsLoaded(false); }}
          onRecordPayout={() => setShowPayoutModal(true)}
          onSendPayout={handleOpenB2BPayout}
        />
      )}

      {activeTab === 'charges' && (
        <ChargesTab
          recentCharges={detail.recent_transaction_charges || []}
          allCharges={charges}
          showAll={chargesLoaded}
          onShowAll={() => fetchCharges(1)}
          loading={chargesLoading}
          page={chargesPage}
          perPage={chargesPerPage}
          total={chargesTotalCount}
          onPageChange={(p) => fetchCharges(p)}
          onPerPageChange={(pp) => { setChargesPerPage(pp); setChargesPage(1); fetchCharges(1, pp); }}
          startDate={chargeStartDate}
          endDate={chargeEndDate}
          onStartDateChange={(d) => { setChargeStartDate(d); setChargesLoaded(false); }}
          onEndDateChange={(d) => { setChargeEndDate(d); setChargesLoaded(false); }}
          onAddCharge={() => setShowChargeModal(true)}
          summary={chargesSummary}
        />
      )}

      {/* Record Transaction Charge Modal */}
      {showChargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !chargeSubmitting && setShowChargeModal(false)} />
          <div className="relative bg-background-secondary border border-border rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Record Transaction Charge</h3>

            <div className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <p className="text-xs text-foreground-muted">Deduction against</p>
              <p className="text-sm font-semibold">{detail.organization_name}</p>
              <p className="text-xs text-foreground-muted mt-1">This charge will reduce the reseller&apos;s unpaid balance (bank fees, M-Pesa charges, etc.)</p>
            </div>

            {chargeError && (
              <div className="mb-4 p-3 rounded-xl bg-danger/10 text-danger text-sm">{chargeError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount (KES) *</label>
                <input
                  type="number"
                  className="input w-full"
                  value={chargeForm.amount || ''}
                  onChange={(e) => setChargeForm({ ...chargeForm, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <input
                  type="text"
                  className="input w-full"
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                  placeholder="e.g. Bank transfer fee, M-Pesa charges"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reference</label>
                <input
                  type="text"
                  className="input w-full"
                  value={chargeForm.reference}
                  onChange={(e) => setChargeForm({ ...chargeForm, reference: e.target.value })}
                  placeholder="Optional reference number"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowChargeModal(false)}
                className="btn-secondary flex-1 py-2.5"
                disabled={chargeSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCharge}
                className="btn-primary flex-1 py-2.5"
                disabled={chargeSubmitting || chargeForm.amount <= 0 || !chargeForm.description.trim()}
              >
                {chargeSubmitting ? 'Recording...' : 'Record Charge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B2B Send Payout Modal */}
      {showB2BPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !b2bSubmitting && setShowB2BPayoutModal(false)} />
          <div className="relative bg-background-secondary border border-border rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">

            {/* Confirm step */}
            {b2bStep === 'confirm' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-primary/15 flex items-center justify-center">
                    <svg className="w-5 h-5 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Send Payout</h3>
                    <p className="text-xs text-foreground-muted">Trigger M-Pesa B2B payment to {detail.organization_name}</p>
                  </div>
                </div>

                {/* Reseller info from already-loaded detail */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 mb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-foreground-muted">Reseller</p>
                      <p className="text-sm font-semibold">{detail.organization_name}</p>
                      <p className="text-xs text-foreground-muted">{detail.business_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-foreground-muted">Unpaid Balance</p>
                      <p className="text-xl font-bold text-emerald-500">{formatKES(detail.payouts.unpaid_balance)}</p>
                    </div>
                  </div>

                  {/* Show preview data from the backend if available */}
                  {b2bPreviewLoading ? (
                    <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/20">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-foreground-muted">Loading fee details...</span>
                    </div>
                  ) : b2bPreview && Object.keys(b2bPreview).length > 0 ? (
                    <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
                      {Object.entries(b2bPreview)
                        .filter(([key]) => !['reseller_id', 'payment_method_id'].includes(key))
                        .map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-sm">
                            <span className="text-foreground-muted capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="font-medium">
                              {typeof value === 'number' ? formatKES(value) : String(value ?? '-')}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-foreground-muted pt-2 border-t border-emerald-500/20">
                      Transaction fees are calculated by the backend during processing.
                    </p>
                  )}
                </div>

                {/* Payment method selector if reseller has multiple */}
                {detail.payment_methods && detail.payment_methods.filter(m => m.is_active).length > 1 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1.5">Payment Method</label>
                    <select
                      className="select w-full"
                      value={b2bSelectedMethodId ?? ''}
                      onChange={(e) => setB2bSelectedMethodId(e.target.value ? Number(e.target.value) : undefined)}
                    >
                      <option value="">Default (reseller&apos;s preferred)</option>
                      {detail.payment_methods.filter(m => m.is_active).map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {b2bError && (
                  <div className="mb-4 p-3 rounded-xl bg-danger/10 text-danger text-sm">{b2bError}</div>
                )}

                {detail.payouts.unpaid_balance <= 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-500/10 text-amber-600 text-sm">
                    This reseller has no unpaid balance to pay out.
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowB2BPayoutModal(false)}
                    className="btn-secondary flex-1 py-2.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmB2BPayout}
                    className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
                    disabled={detail.payouts.unpaid_balance <= 0 || b2bSubmitting}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    Send Payout
                  </button>
                </div>
              </>
            )}

            {/* Sending step */}
            {b2bStep === 'sending' && (
              <div className="py-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-12 h-12 border-3 border-accent-primary border-t-transparent rounded-full animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Sending Payout...</h3>
                  <p className="text-sm text-foreground-muted">Triggering M-Pesa B2B payment. Please wait.</p>
                </div>
              </div>
            )}

            {/* Result step */}
            {b2bStep === 'result' && b2bResult && (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
                    b2bResult.status === 'failed' ? 'bg-danger/15' : 'bg-emerald-500/15'
                  }`}>
                    {b2bResult.status === 'failed' ? (
                      <svg className="w-7 h-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                      <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold">
                    {b2bResult.status === 'failed' ? 'Payout Failed' : 'Payout Triggered'}
                  </h3>
                  <p className="text-sm text-foreground-muted mt-1">
                    {b2bResult.status === 'failed'
                      ? 'The payout could not be processed.'
                      : b2bResult.status === 'pending'
                        ? 'The transaction is being processed by Safaricom.'
                        : 'The payout has been completed.'}
                  </p>
                </div>

                {/* Dynamically render whatever the backend returned */}
                <div className="rounded-xl border border-border bg-background-tertiary/50 p-4 space-y-2.5">
                  {Object.entries(b2bResult)
                    .filter(([key]) => !['reseller_id'].includes(key))
                    .map(([key, value]) => {
                      if (value === null || value === undefined) return null;
                      const label = key.replace(/_/g, ' ');
                      const isStatus = key === 'status';
                      const statusStr = String(value);
                      return (
                        <div key={key} className={`flex justify-between text-sm ${isStatus ? 'border-t border-border pt-2.5' : ''}`}>
                          <span className="text-foreground-muted capitalize">{label}</span>
                          {isStatus ? (
                            <span className={`inline-flex items-center gap-1.5 font-medium ${
                              statusStr === 'completed' ? 'text-emerald-500' :
                              statusStr === 'failed' ? 'text-danger' :
                              'text-amber-500'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                statusStr === 'completed' ? 'bg-emerald-500' :
                                statusStr === 'failed' ? 'bg-danger' :
                                'bg-amber-500 animate-pulse'
                              }`} />
                              {statusStr.charAt(0).toUpperCase() + statusStr.slice(1)}
                            </span>
                          ) : (
                            <span className="font-medium">
                              {typeof value === 'number' ? formatKES(value) : String(value)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>

                {b2bResult.status === 'pending' && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                    <p className="text-xs text-foreground-muted">
                      Safaricom will process this in the background. The status will update automatically once the callback is received.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setShowB2BPayoutModal(false)}
                  className="btn-primary w-full py-2.5"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
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
  perPage,
  total,
  onPageChange,
  onPerPageChange,
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
  perPage: number;
  total: number;
  onPageChange: (p: number) => void;
  onPerPageChange: (pp: number) => void;
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

          {showAll && (
            <Pagination
              page={page}
              perPage={perPage}
              total={total}
              onPageChange={onPageChange}
              onPerPageChange={onPerPageChange}
              loading={loading}
              noun="payments"
            />
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
  perPage,
  total,
  onPageChange,
  onPerPageChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRecordPayout,
  onSendPayout,
}: {
  payouts: AdminPayout[];
  loading: boolean;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (p: number) => void;
  onPerPageChange: (pp: number) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (d: string) => void;
  onEndDateChange: (d: string) => void;
  onRecordPayout: () => void;
  onSendPayout: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <FilterDatePicker value={startDate} onChange={onStartDateChange} />
        <span className="text-foreground-muted text-sm">to</span>
        <FilterDatePicker value={endDate} onChange={onEndDateChange} />
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={onSendPayout} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            Send Payout
          </button>
          <button onClick={onRecordPayout} className="btn-secondary text-sm px-3 py-1.5">
            Record Payout
          </button>
        </div>
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

          <Pagination
            page={page}
            perPage={perPage}
            total={total}
            onPageChange={onPageChange}
            onPerPageChange={onPerPageChange}
            loading={loading}
            noun="payouts"
          />
        </>
      )}
    </div>
  );
}

// ─── Charges Tab ─────────────────────────────────────────────────────

function ChargesTab({
  recentCharges,
  allCharges,
  showAll,
  onShowAll,
  loading,
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onAddCharge,
  summary,
}: {
  recentCharges: AdminTransactionCharge[];
  allCharges: AdminTransactionCharge[];
  showAll: boolean;
  onShowAll: () => void;
  loading: boolean;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (p: number) => void;
  onPerPageChange: (pp: number) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (d: string) => void;
  onEndDateChange: (d: string) => void;
  onAddCharge: () => void;
  summary: { total_charges: number; total_amount: number } | null;
}) {
  const charges = showAll ? allCharges : recentCharges;

  return (
    <div className="space-y-3">
      {showAll && (
        <div className="flex flex-wrap items-center gap-3">
          <FilterDatePicker value={startDate} onChange={onStartDateChange} />
          <span className="text-foreground-muted text-sm">to</span>
          <FilterDatePicker value={endDate} onChange={onEndDateChange} />
          {summary && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-foreground-muted">{summary.total_charges} charges</span>
              <span className="font-medium text-amber-500">{formatKES(summary.total_amount)}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={onAddCharge} className="btn-primary text-sm px-3 py-1.5">
          Add Charge
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : charges.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-foreground-muted">No transaction charges found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <DataTable
              columns={[
                { key: 'id', label: 'ID', className: 'w-[60px]' },
                { key: 'amount', label: 'Amount', className: 'text-right' },
                { key: 'description', label: 'Description' },
                { key: 'reference', label: 'Reference' },
                { key: 'date', label: 'Date' },
              ]}
              data={charges}
              rowKey={(item) => item.id}
              renderCell={(item, col) => {
                switch (col) {
                  case 'id': return <span className="text-foreground-muted text-xs">#{item.id}</span>;
                  case 'amount': return <span className="font-semibold text-amber-500">{formatKES(item.amount)}</span>;
                  case 'description': return <span className="text-sm">{item.description}</span>;
                  case 'reference': return <span className="text-sm font-mono text-foreground-muted">{item.reference || '-'}</span>;
                  case 'date': return <span className="text-sm text-foreground-muted">{formatSafeDate(item.created_at)}</span>;
                  default: return null;
                }
              }}
              emptyState={{ message: 'No transaction charges' }}
            />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {charges.map((c) => (
              <MobileDataCard
                key={c.id}
                id={c.id}
                title={formatKES(c.amount)}
                subtitle={c.description}
                avatar={{ text: 'TC', color: 'warning' }}
                status={{
                  label: 'charge',
                  variant: 'warning',
                }}
                fields={[
                  ...(c.reference ? [{ label: 'Ref', value: c.reference }] : []),
                ]}
                footer={
                  <span className="text-xs text-foreground-muted">{formatSafeDate(c.created_at)}</span>
                }
              />
            ))}
          </div>

          {showAll && (
            <Pagination
              page={page}
              perPage={perPage}
              total={total}
              onPageChange={onPageChange}
              onPerPageChange={onPerPageChange}
              loading={loading}
              noun="charges"
            />
          )}

          {!showAll && (
            <button onClick={onShowAll} className="btn-secondary w-full py-2 text-sm">
              View All Charges
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Payment Methods Section ────────────────────────────────────────

const METHOD_META: Record<string, { icon: React.ReactNode; color: string; bgColor: string; borderColor: string }> = {
  bank_account: {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11M8 14v4m4-4v4m4-4v4" /></svg>,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  mpesa_paybill: {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  mpesa_paybill_with_keys: {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-600/10',
    borderColor: 'border-emerald-600/30',
  },
  zenopay: {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
};

const METHOD_TYPE_LABELS: Record<string, string> = {
  bank_account: 'Bank Account',
  mpesa_paybill: 'M-Pesa Paybill',
  mpesa_paybill_with_keys: 'M-Pesa Till',
  zenopay: 'ZenoPay',
};

function getMethodDetails(m: AdminPaymentMethod): { label: string; value: string }[] {
  const details: { label: string; value: string }[] = [];
  if (m.bank_paybill_number) details.push({ label: 'Paybill', value: m.bank_paybill_number });
  if (m.bank_account_number) details.push({ label: 'Account', value: m.bank_account_number });
  if (m.mpesa_paybill_number) details.push({ label: 'Paybill No.', value: m.mpesa_paybill_number });
  if (m.mpesa_shortcode) details.push({ label: 'Shortcode', value: m.mpesa_shortcode });
  if (m.zenopay_account_id) details.push({ label: 'Account ID', value: m.zenopay_account_id });
  return details;
}

function PaymentMethodsSection({
  methods,
  fallbackShortcode,
  onRecordPayout,
  onSendPayout,
}: {
  methods: AdminPaymentMethod[];
  fallbackShortcode: string;
  onRecordPayout: () => void;
  onSendPayout: () => void;
}) {
  if (methods.length === 0) {
    return (
      <div className="card p-4 sm:p-5 border-2 border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">M-Pesa Paybill / Till Number</p>
              <p className="text-2xl font-bold text-emerald-500 font-mono tracking-wider">{fallbackShortcode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onSendPayout}
              className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              Send Payout
            </button>
            <button
              onClick={onRecordPayout}
              className="btn-secondary text-sm px-4 py-2 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Record
            </button>
          </div>
        </div>
      </div>
    );
  }

  const active = methods.filter(m => m.is_active);
  const inactive = methods.filter(m => !m.is_active);

  return (
    <div className="card p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          Payment Methods
          <span className="text-xs font-normal text-foreground-muted">
            ({active.length} active{inactive.length > 0 ? `, ${inactive.length} inactive` : ''})
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onSendPayout}
            className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            Send Payout
          </button>
          <button
            onClick={onRecordPayout}
            className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Record
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {methods.map((m) => {
          const meta = METHOD_META[m.method_type] || METHOD_META.mpesa_paybill;
          const details = getMethodDetails(m);
          return (
            <div
              key={m.id}
              className={`relative rounded-xl border p-3.5 transition-colors ${
                m.is_active
                  ? `${meta.borderColor} ${meta.bgColor.replace('/10', '/5')}`
                  : 'border-border bg-background-tertiary/30 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  m.is_active ? meta.bgColor : 'bg-foreground-muted/10'
                }`}>
                  <span className={m.is_active ? meta.color : 'text-foreground-muted'}>
                    {meta.icon}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{m.label}</p>
                    <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      m.is_active
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-foreground-muted/10 text-foreground-muted'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${m.is_active ? 'bg-emerald-500' : 'bg-foreground-muted'}`} />
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground-muted mt-0.5">
                    {METHOD_TYPE_LABELS[m.method_type] || m.method_type}
                  </p>
                  {details.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {details.map((d) => (
                        <div key={d.label} className="flex items-center gap-2 text-xs">
                          <span className="text-foreground-muted">{d.label}:</span>
                          <span className="font-mono font-medium">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
