'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import {
  Voucher,
  VoucherStats,
  VouchersListResponse,
  GenerateVouchersRequest,
  Plan,
  Router,
} from '../lib/types';
import Header from '../components/Header';
import DataTable, { DataTableColumn } from '../components/DataTable';
import { PageLoader } from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import SearchInput from '../components/SearchInput';
import PullToRefresh from '../components/PullToRefresh';
import { formatDateGMT3 } from '../lib/dateUtils';

const formatSafeDate = (dateStr: string | null | undefined): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return formatDateGMT3(dateStr, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '-';
  }
};

type StatusFilter = '' | 'available' | 'used' | 'disabled' | 'expired';

const VOUCHER_COLUMNS: DataTableColumn[] = [
  { key: 'code', label: 'Code' },
  { key: 'plan', label: 'Plan' },
  { key: 'router', label: 'Router' },
  { key: 'status', label: 'Status' },
  { key: 'expires', label: 'Expires' },
  { key: 'created', label: 'Created' },
  { key: 'actions', label: 'Actions' },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'used', label: 'Used' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'expired', label: 'Expired' },
];

const statusBadge = (status: Voucher['status']) => {
  const map: Record<Voucher['status'], string> = {
    available: 'badge-success',
    used: 'badge-info',
    disabled: 'badge-danger',
    expired: 'badge-warning',
  };
  return map[status] ?? 'badge-neutral';
};

const statusVariant = (status: Voucher['status']): 'success' | 'info' | 'danger' | 'warning' | 'neutral' => {
  const map: Record<Voucher['status'], 'success' | 'info' | 'danger' | 'warning' | 'neutral'> = {
    available: 'success',
    used: 'info',
    disabled: 'danger',
    expired: 'warning',
  };
  return map[status] ?? 'neutral';
};

function VoucherCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 touch-manipulation ${
        copied
          ? 'bg-success/15 text-success'
          : 'bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20'
      }`}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function VouchersPage() {
  const [stats, setStats] = useState<VoucherStats | null>(null);
  const [vouchersData, setVouchersData] = useState<VouchersListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getVoucherStats();
      setStats(data);
    } catch {
      // non-critical
    }
  }, []);

  const loadVouchers = useCallback(async (pageNum = 1, status: StatusFilter = statusFilter) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getVouchers({
        status: status || undefined,
        page: pageNum,
        per_page: 50,
      });
      setVouchersData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadStats();
    loadVouchers(1, '');
  }, []);

  const handleStatusChange = (newStatus: StatusFilter) => {
    setStatusFilter(newStatus);
    setPage(1);
    loadVouchers(1, newStatus);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadVouchers(newPage);
  };

  const handleRefresh = async () => {
    await Promise.all([loadStats(), loadVouchers(page)]);
  };

  const handleDisable = async (voucherId: number) => {
    if (!confirm('Disable this voucher? It will no longer be usable.')) return;
    try {
      setActionLoading(voucherId);
      setActionError(null);
      await api.disableVoucher(voucherId);
      await Promise.all([loadStats(), loadVouchers(page)]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to disable voucher');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloadLoading(true);
      setActionError(null);
      await api.downloadVouchersCSV({ status: statusFilter || undefined });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to download CSV');
    } finally {
      setDownloadLoading(false);
    }
  };

  const vouchers = vouchersData?.vouchers ?? [];
  const pagination = vouchersData
    ? { page: vouchersData.page, total_pages: vouchersData.pages, total: vouchersData.total }
    : null;

  const filteredVouchers = vouchers.filter((v) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        v.code.toLowerCase().includes(query) ||
        (v.plan?.name?.toLowerCase() || '').includes(query) ||
        (v.router?.name?.toLowerCase() || '').includes(query)
      );
    }
    return true;
  });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Vouchers</h2>
          <p className="text-foreground-muted mb-4">{error}</p>
          <button onClick={() => loadVouchers(page)} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Vouchers"
        subtitle="Generate and manage hotspot voucher codes"
        action={
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={downloadLoading}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              {downloadLoading ? (
                <div className="w-4 h-4 border-2 border-foreground-muted/30 border-t-foreground-muted rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Generate</span>
            </button>
          </div>
        }
      />

      {/* Summary Stats */}
      {stats && typeof stats.total === 'number' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
          <div className="animate-fade-in delay-1" style={{ opacity: 0 }}>
            <StatCard
              title="Available"
              value={stats.available ?? 0}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              accent="success"
            />
          </div>
          <div className="animate-fade-in delay-2" style={{ opacity: 0 }}>
            <StatCard
              title="Used"
              value={stats.used ?? 0}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
              accent="info"
            />
          </div>
          <div className="animate-fade-in delay-3" style={{ opacity: 0 }}>
            <StatCard
              title="Disabled"
              value={stats.disabled ?? 0}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              }
              accent="danger"
            />
          </div>
          <div className="animate-fade-in delay-4" style={{ opacity: 0 }}>
            <StatCard
              title="Total"
              value={stats.total ?? 0}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              }
              accent="primary"
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3 mb-6 animate-fade-in">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by code, plan, or router..."
        />

        <div className="flex rounded-lg border border-border overflow-x-auto flex-shrink-0 no-scrollbar">
          {STATUS_FILTERS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              className={`px-3 py-2 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                statusFilter === opt.value
                  ? 'bg-accent-primary text-background'
                  : 'bg-background-secondary text-foreground-muted hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {actionError && (
        <div className="mb-4 p-4 rounded-lg bg-danger/10 border border-danger/30 flex items-center gap-3 animate-fade-in">
          <svg className="w-5 h-5 text-danger flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-danger text-sm flex-1">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-danger hover:text-danger/70">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : (
        <PullToRefresh onRefresh={handleRefresh}>
          {/* Desktop Table */}
          <DataTable<Voucher>
            columns={VOUCHER_COLUMNS}
            data={filteredVouchers}
            rowKey={(v) => v.id}
            renderCell={(v, key) => {
              switch (key) {
                case 'code':
                  return (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-foreground tracking-wider">
                        {v.code}
                      </span>
                      <VoucherCopyButton code={v.code} />
                    </div>
                  );
                case 'plan':
                  return (
                    <div>
                      <p className="font-medium text-foreground">{v.plan?.name ?? `Plan #${v.plan_id}`}</p>
                      <p className="text-xs text-foreground-muted">KES {v.plan?.price ?? '-'}</p>
                    </div>
                  );
                case 'router':
                  return <span className="text-foreground-muted">{v.router?.name ?? (v.router_id ? `Router #${v.router_id}` : '-')}</span>;
                case 'status':
                  return (
                    <span className={`badge ${statusBadge(v.status)} capitalize`}>{v.status}</span>
                  );
                case 'expires':
                  return <span className="text-foreground-muted text-sm">{formatSafeDate(v.expires_at)}</span>;
                case 'created':
                  return <span className="text-foreground-muted text-sm">{formatSafeDate(v.created_at)}</span>;
                case 'actions':
                  return v.status === 'available' ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDisable(v.id); }}
                      disabled={actionLoading === v.id}
                      className="flex items-center gap-1 text-sm text-foreground-muted hover:text-danger transition-colors disabled:opacity-50"
                      title="Disable voucher"
                    >
                      {actionLoading === v.id ? (
                        <div className="w-4 h-4 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      )}
                      <span>Disable</span>
                    </button>
                  ) : (
                    <span className="text-foreground-muted text-sm">-</span>
                  );
                default:
                  return null;
              }
            }}
            rowStyle={(_v, index) => ({ animationDelay: `${index * 0.03}s`, opacity: 0 })}
            emptyState={{
              icon: (
                <svg className="w-12 h-12 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              ),
              message: searchQuery ? 'No vouchers match your search' : 'No vouchers found',
            }}
            footer={
              pagination && pagination.total_pages > 1 ? (
                <div className="p-4 flex items-center justify-between">
                  <p className="text-sm text-foreground-muted">
                    Page {pagination.page} of {pagination.total_pages} &middot; {pagination.total} total
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= pagination.total_pages}
                      className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : undefined
            }
          />

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {filteredVouchers.length === 0 ? (
              <div className="card p-8 text-center text-foreground-muted">
                <svg className="w-12 h-12 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                {searchQuery ? 'No vouchers match your search' : 'No vouchers found'}
              </div>
            ) : (
              filteredVouchers.map((v) => (
                <VoucherMobileCard
                  key={v.id}
                  voucher={v}
                  onDisable={handleDisable}
                  disabling={actionLoading === v.id}
                />
              ))
            )}

            {/* Mobile Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-between pt-2 pb-2">
                <p className="text-xs text-foreground-muted">
                  Page {pagination.page} of {pagination.total_pages} &middot; {pagination.total} total
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= pagination.total_pages}
                    className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            <p className="text-center text-xs text-foreground-muted pb-2">
              Showing {filteredVouchers.length} of {pagination?.total ?? vouchers.length} vouchers
            </p>
          </div>
        </PullToRefresh>
      )}

      {/* Generate Vouchers Modal */}
      {showGenerateModal && (
        <GenerateVouchersModal
          onClose={() => setShowGenerateModal(false)}
          onSuccess={async () => {
            setShowGenerateModal(false);
            setPage(1);
            await Promise.all([loadStats(), loadVouchers(1, statusFilter)]);
          }}
        />
      )}
    </div>
  );
}

function VoucherMobileCard({
  voucher: v,
  onDisable,
  disabling,
}: {
  voucher: Voucher;
  onDisable: (id: number) => void;
  disabling: boolean;
}) {
  const variant = statusVariant(v.status);
  const badgeCls: Record<string, string> = {
    success: 'badge-success',
    info: 'badge-info',
    danger: 'badge-danger',
    warning: 'badge-warning',
    neutral: 'badge-neutral',
  };

  return (
    <div className="card p-0 overflow-hidden animate-fade-in">
      {/* Top row: Code + Copy + Status */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <span className="font-mono text-base font-bold text-foreground tracking-wider truncate select-all">
            {v.code}
          </span>
        </div>
        <span className={`badge ${badgeCls[variant]} capitalize text-[11px] flex-shrink-0 ml-2`}>
          {v.status}
        </span>
      </div>

      {/* Info row: plan + price + router */}
      <div className="flex items-center gap-2 px-4 pb-2 text-sm">
        <span className="text-foreground-muted truncate">{v.plan?.name ?? `Plan #${v.plan_id}`}</span>
        {v.plan?.price !== undefined && (
          <>
            <span className="text-foreground-muted/40">&middot;</span>
            <span className="font-medium text-foreground">KES {v.plan.price}</span>
          </>
        )}
        {v.router?.name && (
          <>
            <span className="text-foreground-muted/40">&middot;</span>
            <span className="text-foreground-muted truncate">{v.router.name}</span>
          </>
        )}
      </div>

      {/* Action bar: Copy button prominent + meta */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-background-secondary/50 border-t border-border/50">
        <div className="flex items-center gap-3">
          <VoucherCopyButton code={v.code} />
          {v.status === 'available' && (
            <button
              onClick={() => onDisable(v.id)}
              disabled={disabling}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground-muted hover:text-danger hover:bg-danger/10 transition-all active:scale-95 touch-manipulation"
            >
              {disabling ? (
                <div className="w-3 h-3 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              )}
              Disable
            </button>
          )}
        </div>
        <span className="text-[11px] text-foreground-muted flex-shrink-0">
          {v.expires_at ? `Exp ${formatSafeDate(v.expires_at)}` : formatSafeDate(v.created_at)}
        </span>
      </div>
    </div>
  );
}

function GenerateVouchersModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [routers, setRouters] = useState<Router[]>([]);
  const [formData, setFormData] = useState<GenerateVouchersRequest>({
    plan_id: 0,
    quantity: 1,
    router_id: null,
    expires_at: null,
  });

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [plansData, routersData] = await Promise.all([api.getPlans(), api.getRouters()]);
        setPlans(plansData);
        setRouters(routersData);
        if (plansData.length > 0) {
          setFormData((f) => ({ ...f, plan_id: plansData[0].id }));
        }
      } catch {
        // non-critical
      }
    };
    loadOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plan_id) {
      setError('Please select a plan');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const payload: GenerateVouchersRequest = {
        plan_id: formData.plan_id,
        quantity: formData.quantity,
        ...(formData.router_id ? { router_id: formData.router_id } : {}),
        ...(formData.expires_at ? { expires_at: formData.expires_at } : {}),
      };
      await api.generateVouchers(payload);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate vouchers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg card rounded-b-none sm:rounded-b-2xl p-5 sm:p-6 animate-slide-up sm:animate-fade-in max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Drag handle on mobile */}
        <div className="sm:hidden w-10 h-1 rounded-full bg-foreground-muted/30 mx-auto mb-4" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Generate Vouchers</h2>
          <button onClick={onClose} className="p-2 -mr-1 rounded-lg hover:bg-background-tertiary transition-colors touch-manipulation">
            <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Plan *</label>
            <select
              value={formData.plan_id}
              onChange={(e) => setFormData({ ...formData, plan_id: parseInt(e.target.value) })}
              className="select text-base"
              required
            >
              <option value={0} disabled>Select a plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — KES {p.price}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Quantity
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Math.min(100, Math.max(1, parseInt(e.target.value) || 1)) })}
                className="input text-base"
                min={1}
                max={100}
                required
              />
              <p className="text-[11px] text-foreground-muted mt-1">1–100 vouchers</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Router
              </label>
              <select
                value={formData.router_id ?? ''}
                onChange={(e) => setFormData({ ...formData, router_id: e.target.value ? parseInt(e.target.value) : null })}
                className="select text-base"
              >
                <option value="">Any Router</option>
                {routers.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-foreground-muted mt-1">Optional</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Expires At <span className="text-foreground-muted font-normal">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={formData.expires_at ?? ''}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value || null })}
              className="input text-base"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3 touch-manipulation">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.plan_id}
              className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-60 touch-manipulation"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  Generate {formData.quantity > 1 ? `${formData.quantity} Vouchers` : 'Voucher'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
