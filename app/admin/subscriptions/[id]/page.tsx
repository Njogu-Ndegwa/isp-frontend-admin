'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../lib/api';
import { AdminSubscriptionDetail, SubscriptionInvoice } from '../../../lib/types';
import { useAuth } from '../../../context/AuthContext';
import Header from '../../../components/Header';
import SubscriptionStatusBadge from '../../../components/SubscriptionStatusBadge';
import InvoiceStatusBadge from '../../../components/InvoiceStatusBadge';
import EditSubscriptionModal from '../../../components/EditSubscriptionModal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { SkeletonCard } from '../../../components/LoadingSpinner';

const formatKES = (amount: number): string => {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

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

export default function AdminSubscriptionDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const resellerId = Number(params.id);
  const [data, setData] = useState<AdminSubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  // Action state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showWaiveDialog, setShowWaiveDialog] = useState(false);
  const [waiveTarget, setWaiveTarget] = useState<SubscriptionInvoice | null>(null);
  const [activateMonths, setActivateMonths] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getAdminSubscriptionDetail(resellerId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  }, [resellerId]);

  useEffect(() => {
    if (resellerId) fetchData();
  }, [resellerId, fetchData]);

  const handleActivate = async () => {
    setActionLoading(true);
    try {
      await api.activateSubscription(resellerId, activateMonths);
      setShowActivateDialog(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    setActionLoading(true);
    try {
      await api.deactivateSubscription(resellerId);
      setShowSuspendDialog(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWaive = async () => {
    if (!waiveTarget) return;
    setActionLoading(true);
    try {
      await api.waiveInvoice(resellerId, waiveTarget.id);
      setShowWaiveDialog(false);
      setWaiveTarget(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Header
        title={data ? data.reseller.organization_name : 'Subscription Detail'}
        subtitle={data ? data.reseller.email : ''}
        backHref="/admin/subscriptions"
        action={
          data ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="text-sm px-3 py-2 rounded-xl border border-border text-foreground-muted hover:bg-background-tertiary transition-colors"
              >
                Edit
              </button>
              {data.subscription.status !== 'active' ? (
                <button
                  onClick={() => { setActivateMonths(1); setShowActivateDialog(true); }}
                  className="btn-primary text-sm px-3 py-2"
                >
                  Activate
                </button>
              ) : (
                <button
                  onClick={() => setShowSuspendDialog(true)}
                  className="text-sm px-3 py-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  Suspend
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-danger mb-4">{error}</p>
          <button onClick={fetchData} className="btn-primary px-4 py-2 text-sm">Retry</button>
        </div>
      ) : data ? (
        <>
          {/* Subscription Summary */}
          <div className="card p-5 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <SubscriptionStatusBadge status={data.subscription.status} size="md" />
                <p className="text-sm text-foreground-muted mt-2">
                  {data.reseller.business_name || data.reseller.organization_name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-foreground-muted">Total Paid</p>
                <p className="text-xl font-bold text-emerald-500">{formatKES(data.subscription.total_paid)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-xs text-foreground-muted mb-0.5">Expires</p>
                <p className="text-sm font-medium text-foreground">{formatSafeDate(data.subscription.expires_at)}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted mb-0.5">Period Start</p>
                <p className="text-sm font-medium text-foreground">{formatSafeDate(data.subscription.current_period_start)}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted mb-0.5">Period End</p>
                <p className="text-sm font-medium text-foreground">{formatSafeDate(data.subscription.current_period_end)}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted mb-0.5">Invoices</p>
                <p className="text-sm font-medium text-foreground">{data.subscription.invoice_count}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'invoices'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              Invoices ({data.invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'payments'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              Payments ({data.payments.length})
            </button>
          </div>

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="space-y-2">
              {data.invoices.length === 0 ? (
                <div className="card p-6 text-center">
                  <p className="text-sm text-foreground-muted">No invoices yet</p>
                </div>
              ) : (
                data.invoices.map((inv) => (
                  <div key={inv.id} className="card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <InvoiceStatusBadge status={inv.status} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{inv.period_label}</p>
                        <p className="text-xs text-foreground-muted">{inv.human_message || formatSafeDate(inv.due_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">{formatKES(inv.final_charge)}</span>
                      {(inv.status === 'pending' || inv.status === 'overdue') && (
                        <button
                          onClick={() => { setWaiveTarget(inv); setShowWaiveDialog(true); }}
                          className="text-xs px-2 py-1 rounded-lg border border-border text-foreground-muted hover:bg-background-tertiary transition-colors"
                        >
                          Waive
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-2">
              {data.payments.length === 0 ? (
                <div className="card p-6 text-center">
                  <p className="text-sm text-foreground-muted">No payments yet</p>
                </div>
              ) : (
                data.payments.map((p) => (
                  <div key={p.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{formatKES(p.amount)}</p>
                      <p className="text-xs text-foreground-muted">
                        {p.payment_method.toUpperCase()} &mdash; {p.payment_reference}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                        p.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>{p.status}</span>
                      <p className="text-xs text-foreground-muted mt-1">{formatSafeDate(p.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      ) : null}

      {/* Dialogs */}
      <ConfirmDialog
        isOpen={showActivateDialog}
        onClose={() => setShowActivateDialog(false)}
        onConfirm={handleActivate}
        title="Activate Subscription"
        message={`Activate for ${activateMonths} month(s)?`}
        confirmLabel="Activate"
        variant="primary"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={showSuspendDialog}
        onClose={() => setShowSuspendDialog(false)}
        onConfirm={handleSuspend}
        title="Suspend Subscription"
        message="This will block the reseller from using the system. Are you sure?"
        confirmLabel="Suspend"
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={showWaiveDialog}
        onClose={() => { setShowWaiveDialog(false); setWaiveTarget(null); }}
        onConfirm={handleWaive}
        title="Waive Invoice"
        message={waiveTarget ? `Waive the ${waiveTarget.period_label} invoice (${formatKES(waiveTarget.final_charge)})?` : ''}
        confirmLabel="Waive"
        variant="warning"
        loading={actionLoading}
      />

      {/* Edit Modal */}
      {data && (
        <EditSubscriptionModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          resellerId={resellerId}
          currentStatus={data.subscription.status}
          currentExpiry={data.subscription.expires_at}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
