'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { AdminSubscription } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import SubscriptionStatusBadge from '../../components/SubscriptionStatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import EditSubscriptionModal from '../../components/EditSubscriptionModal';
import DataTable from '../../components/DataTable';
import MobileDataCard from '../../components/MobileDataCard';
import { SkeletonCard } from '../../components/LoadingSpinner';

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

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
];

export default function AdminSubscriptionsPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  // Action state
  const [actionTarget, setActionTarget] = useState<AdminSubscription | null>(null);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activateMonths, setActivateMonths] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getAdminSubscriptions({
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setSubscriptions(result.subscriptions);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleActivate = async () => {
    if (!actionTarget) return;
    setActionLoading(true);
    try {
      await api.activateSubscription(actionTarget.id, activateMonths);
      setShowActivateDialog(false);
      fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!actionTarget) return;
    setActionLoading(true);
    try {
      await api.deactivateSubscription(actionTarget.id);
      setShowSuspendDialog(false);
      fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suspend');
    } finally {
      setActionLoading(false);
    }
  };

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
        title="Subscriptions"
        subtitle={`${total} reseller subscriptions`}
        action={
          <Link href="/admin/subscriptions/revenue" className="btn-primary text-sm px-4 py-2">
            Revenue
          </Link>
        }
      />

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or organization..."
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === f.value
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'border border-border text-foreground-muted hover:bg-background-tertiary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-danger mb-4">{error}</p>
          <button onClick={fetchSubscriptions} className="btn-primary px-4 py-2 text-sm">Retry</button>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-foreground-muted">No subscriptions found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <DataTable
              columns={[
                { key: 'reseller', label: 'Reseller' },
                { key: 'status', label: 'Status' },
                { key: 'expires', label: 'Expires' },
                { key: 'total_paid', label: 'Total Paid', className: 'text-right' },
                { key: 'outstanding', label: 'Outstanding', className: 'text-right' },
                { key: 'last_login', label: 'Last Login' },
                { key: 'actions', label: '' },
              ]}
              data={subscriptions}
              rowKey={(sub) => sub.id}
              renderCell={(sub, col) => {
                switch (col) {
                  case 'reseller':
                    return (
                      <div>
                        <p className="font-medium text-sm">{sub.organization_name}</p>
                        <p className="text-xs text-foreground-muted">{sub.email}</p>
                      </div>
                    );
                  case 'status':
                    return <SubscriptionStatusBadge status={sub.subscription_status} />;
                  case 'expires':
                    return <span className="text-sm text-foreground-muted">{formatSafeDate(sub.subscription_expires_at)}</span>;
                  case 'total_paid':
                    return <span className="text-sm font-medium">{formatKES(sub.total_paid)}</span>;
                  case 'outstanding':
                    return <span className={`text-sm font-medium ${sub.outstanding > 0 ? 'text-amber-500' : 'text-foreground-muted'}`}>{formatKES(sub.outstanding)}</span>;
                  case 'last_login':
                    return <span className="text-xs text-foreground-muted">{formatSafeDate(sub.last_login_at)}</span>;
                  case 'actions':
                    return (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setActionTarget(sub); setShowEditModal(true); }}
                          className="p-1.5 rounded-lg text-foreground-muted hover:bg-background-tertiary hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                        </button>
                        {sub.subscription_status !== 'active' ? (
                          <button
                            onClick={() => { setActionTarget(sub); setActivateMonths(1); setShowActivateDialog(true); }}
                            className="p-1.5 rounded-lg text-emerald-500/70 hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                            title="Activate"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => { setActionTarget(sub); setShowSuspendDialog(true); }}
                            className="p-1.5 rounded-lg text-red-500/70 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                            title="Suspend"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          </button>
                        )}
                      </div>
                    );
                  default: return null;
                }
              }}
              onRowClick={(sub) => { window.location.href = `/admin/subscriptions/${sub.id}`; }}
              emptyState={{ message: 'No subscriptions found' }}
            />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {subscriptions.map((sub) => (
              <MobileDataCard
                key={sub.id}
                id={sub.id}
                title={sub.organization_name}
                subtitle={sub.email}
                avatar={{ text: sub.organization_name.slice(0, 2).toUpperCase(), color: sub.subscription_status === 'active' ? 'success' : sub.subscription_status === 'trial' ? 'info' : 'danger' }}
                status={{ label: sub.subscription_status, variant: sub.subscription_status === 'active' ? 'success' : sub.subscription_status === 'trial' ? 'info' : sub.subscription_status === 'suspended' ? 'danger' : 'neutral' }}
                value={{ text: formatKES(sub.total_paid) }}
                fields={[
                  { value: `Expires: ${formatSafeDate(sub.subscription_expires_at)}` },
                  ...(sub.outstanding > 0 ? [{ value: `Outstanding: ${formatKES(sub.outstanding)}` }] : []),
                ]}
                layout="compact"
                href={`/admin/subscriptions/${sub.id}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Activate Dialog */}
      <ConfirmDialog
        isOpen={showActivateDialog}
        onClose={() => setShowActivateDialog(false)}
        onConfirm={handleActivate}
        title="Activate Subscription"
        message={`Activate ${actionTarget?.organization_name}'s subscription for ${activateMonths} month(s)?`}
        confirmLabel="Activate"
        variant="primary"
        loading={actionLoading}
      />

      {/* Suspend Dialog */}
      <ConfirmDialog
        isOpen={showSuspendDialog}
        onClose={() => setShowSuspendDialog(false)}
        onConfirm={handleSuspend}
        title="Suspend Subscription"
        message={`Are you sure? This will block ${actionTarget?.organization_name} from using the system.`}
        confirmLabel="Suspend"
        variant="danger"
        loading={actionLoading}
      />

      {/* Edit Modal */}
      {actionTarget && (
        <EditSubscriptionModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          resellerId={actionTarget.id}
          currentStatus={actionTarget.subscription_status}
          currentExpiry={actionTarget.subscription_expires_at}
          onSaved={fetchSubscriptions}
        />
      )}
    </div>
  );
}
