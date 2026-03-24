'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { AdminReseller, AdminResellerFilter, AdminResellerSortBy, AdminSortOrder } from '../../lib/types';
import { formatDateGMT3 } from '../../lib/dateUtils';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import SearchInput from '../../components/SearchInput';
import FilterSelect from '../../components/FilterSelect';
import FilterDatePicker from '../../components/FilterDatePicker';
import DataTable, { DataTableColumn } from '../../components/DataTable';
import MobileDataCard from '../../components/MobileDataCard';
import StatCard from '../../components/StatCard';
import { PageLoader } from '../../components/LoadingSpinner';

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

const formatKES = (amount: number): string => {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const SORT_OPTIONS: { value: AdminResellerSortBy; label: string }[] = [
  { value: 'created_at', label: 'Date Joined' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'mpesa_revenue', label: 'M-Pesa Revenue' },
  { value: 'unpaid_balance', label: 'Unpaid Balance' },
  { value: 'customers', label: 'Customers' },
  { value: 'router_count', label: 'Routers' },
  { value: 'last_login', label: 'Last Login' },
];

const FILTER_OPTIONS: { value: AdminResellerFilter; label: string; group: string }[] = [
  { value: 'unpaid', label: 'Needs Payout', group: 'payment' },
  { value: 'paid_up', label: 'Paid Up', group: 'payment' },
  { value: 'active', label: 'Active', group: 'activity' },
  { value: 'inactive', label: 'Inactive', group: 'activity' },
  { value: 'has_routers', label: 'Has Routers', group: 'setup' },
  { value: 'no_routers', label: 'No Routers', group: 'setup' },
  { value: 'has_revenue', label: 'Has Revenue', group: 'revenue' },
  { value: 'no_revenue', label: 'No Revenue', group: 'revenue' },
];

const FILTER_LABELS: Record<string, string> = Object.fromEntries(FILTER_OPTIONS.map(o => [o.value, o.label]));
const SORT_LABELS: Record<string, string> = Object.fromEntries(SORT_OPTIONS.map(o => [o.value, o.label]));

const RESELLER_COLUMNS: DataTableColumn[] = [
  { key: 'organization', label: 'Organization' },
  { key: 'paybill', label: 'Paybill' },
  { key: 'revenue', label: 'Revenue', className: 'text-right' },
  { key: 'customers', label: 'Customers', className: 'text-right' },
  { key: 'routers', label: 'Routers', className: 'text-right' },
  { key: 'unpaid', label: 'Unpaid', className: 'text-right' },
  { key: 'joined', label: 'Joined' },
  { key: 'last_login', label: 'Last Login' },
];

const DESKTOP_PAGE_SIZE = 20;

function isRecentlyActive(lastLogin: string | null): boolean {
  if (!lastLogin) return false;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return new Date(lastLogin).getTime() > thirtyDaysAgo;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (y && m && d) {
    return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${y}`;
  }
  return dateStr;
}

export default function ResellersListPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [resellers, setResellers] = useState<AdminReseller[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AdminResellerFilter | ''>('');
  const [sortBy, setSortBy] = useState<AdminResellerSortBy>('created_at');
  const [sortOrder, setSortOrder] = useState<AdminSortOrder>('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [desktopPage, setDesktopPage] = useState(1);
  const [mobileDisplayCount, setMobileDisplayCount] = useState(20);

  const fetchResellers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getAdminResellers({
        search: search || undefined,
        filter: filter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setResellers(result.resellers);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resellers');
    } finally {
      setLoading(false);
    }
  }, [search, filter, sortBy, sortOrder, startDate, endDate]);

  useEffect(() => {
    setDesktopPage(1);
    setMobileDisplayCount(20);
    const timer = setTimeout(() => fetchResellers(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchResellers, search]);

  const hasActiveFilters = filter !== '' || sortBy !== 'created_at' || sortOrder !== 'desc' || startDate !== '' || endDate !== '';

  const clearAllFilters = () => {
    setFilter('');
    setSortBy('created_at');
    setSortOrder('desc');
    setStartDate('');
    setEndDate('');
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Resellers</h2>
          <p className="text-foreground-muted mb-4">{error}</p>
          <button onClick={fetchResellers} className="btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  const totalRevenue = resellers.reduce((sum, r) => sum + r.total_revenue, 0);
  const totalMpesa = resellers.reduce((sum, r) => sum + r.mpesa_revenue, 0);
  const totalUnpaid = resellers.reduce((sum, r) => sum + r.unpaid_balance, 0);

  return (
    <div>
      <Header title="Resellers" subtitle={`Manage ${total} registered resellers`} backHref="/admin" />

      {/* Summary Stats */}
      {resellers.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
          <div className="animate-fade-in delay-1" style={{ opacity: 0 }}>
            <StatCard title="Total Resellers" value={total} accent="primary"
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
            />
          </div>
          <div className="animate-fade-in delay-2" style={{ opacity: 0 }}>
            <StatCard title="Total Revenue" value={formatKES(totalRevenue)} accent="success"
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1" /></svg>}
            />
          </div>
          <div className="animate-fade-in delay-3" style={{ opacity: 0 }}>
            <StatCard title="M-Pesa Revenue" value={formatKES(totalMpesa)} accent="info"
              subtitle={`${totalRevenue > 0 ? Math.round((totalMpesa / totalRevenue) * 100) : 0}% of total`}
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            />
          </div>
          <div className="animate-fade-in delay-4" style={{ opacity: 0 }}>
            <StatCard title="Unpaid Balance" value={formatKES(totalUnpaid)} subtitle="Pending payouts" accent="warning"
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3 mb-6 animate-fade-in">
        {/* Search + Sort + Dates row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by email or organization..." />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <FilterSelect
              value={sortBy}
              onChange={(v) => setSortBy(v as AdminResellerSortBy)}
              options={SORT_OPTIONS}
            />
            <FilterDatePicker value={startDate} onChange={setStartDate} />
            <FilterDatePicker value={endDate} onChange={setEndDate} />
          </div>
        </div>

        {/* Sort order toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-background-secondary border border-border hover:bg-background-tertiary transition-colors"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {sortOrder === 'desc' ? 'Highest first' : 'Lowest first'}
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden flex-shrink-0">
            <button
              onClick={() => setFilter('')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                filter === '' ? 'bg-accent-primary text-background' : 'bg-background-secondary text-foreground-muted hover:text-foreground'
              }`}
            >
              All
            </button>
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(filter === opt.value ? '' : opt.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  filter === opt.value ? 'bg-accent-primary text-background' : 'bg-background-secondary text-foreground-muted hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active filter pills */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-foreground-muted">Active:</span>
            {filter && (
              <button
                onClick={() => setFilter('')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
              >
                {FILTER_LABELS[filter] || filter}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            {sortBy !== 'created_at' && (
              <button
                onClick={() => { setSortBy('created_at'); setSortOrder('desc'); }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
              >
                Sort: {SORT_LABELS[sortBy]} {sortOrder === 'asc' ? '↑' : '↓'}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            {sortBy === 'created_at' && sortOrder !== 'desc' && (
              <button
                onClick={() => setSortOrder('desc')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
              >
                Order: {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            {startDate && (
              <button
                onClick={() => setStartDate('')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
              >
                From {formatDateLabel(startDate)}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            {endDate && (
              <button
                onClick={() => setEndDate('')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
              >
                To {formatDateLabel(endDate)}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs text-foreground-muted hover:text-foreground transition-colors underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <PageLoader />
      ) : (() => {
        const desktopTotalPages = Math.ceil(resellers.length / DESKTOP_PAGE_SIZE);
        const desktopSlice = resellers.slice((desktopPage - 1) * DESKTOP_PAGE_SIZE, desktopPage * DESKTOP_PAGE_SIZE);

        return (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 animate-fade-in">
            {resellers.length === 0 ? (
              <div className="card p-8 text-center text-foreground-muted">
                <svg className="w-12 h-12 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {search ? 'No resellers match your search' : filter ? `No ${FILTER_LABELS[filter]?.toLowerCase()} resellers found` : 'No resellers found'}
              </div>
            ) : (
              <>
                {resellers.slice(0, mobileDisplayCount).map((r) => (
                  <MobileDataCard
                    key={r.id}
                    id={r.id}
                    title={r.organization_name}
                    subtitle={r.email}
                    avatar={{
                      text: r.organization_name.slice(0, 2).toUpperCase(),
                      color: isRecentlyActive(r.last_login_at) ? 'primary' : 'info',
                    }}
                    status={{
                      label: isRecentlyActive(r.last_login_at) ? 'Active' : 'Inactive',
                      variant: isRecentlyActive(r.last_login_at) ? 'success' : 'neutral',
                    }}
                    value={{
                      text: formatKES(r.total_revenue),
                      highlight: true,
                    }}
                    secondary={{
                      left: (
                        <span className="flex items-center gap-1.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono bg-emerald-500/10 text-emerald-500">
                            {r.mpesa_shortcode}
                          </span>
                          <span>M-Pesa: {formatKES(r.mpesa_revenue)}</span>
                        </span>
                      ),
                      right: `${r.active_customers}/${r.total_customers} users`,
                    }}
                    footer={
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span>Unpaid: <span className="text-amber-500 font-medium">{formatKES(r.unpaid_balance)}</span></span>
                          <span>Joined: {formatSafeDate(r.created_at)}</span>
                        </div>
                        <div className="flex items-center justify-end">
                          <span>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${isRecentlyActive(r.last_login_at) ? 'bg-emerald-500' : 'bg-foreground-muted/30'}`} />
                            Login: {formatSafeDate(r.last_login_at)}
                          </span>
                        </div>
                      </div>
                    }
                    href={`/admin/resellers/${r.id}`}
                    layout="compact"
                    className="animate-fade-in"
                  />
                ))}

                {resellers.length > mobileDisplayCount && (
                  <button
                    onClick={() => setMobileDisplayCount((prev) => prev + 20)}
                    className="w-full py-3 text-sm font-medium text-accent-primary bg-accent-primary/5 border border-accent-primary/20 rounded-xl active:opacity-70 transition-colors"
                  >
                    Show More ({resellers.length - mobileDisplayCount} remaining)
                  </button>
                )}

                <p className="text-center text-xs text-foreground-muted pb-2">
                  Showing {Math.min(mobileDisplayCount, resellers.length)} of {resellers.length} resellers
                </p>
              </>
            )}
          </div>

          {/* Desktop Table */}
          <DataTable<AdminReseller>
            columns={RESELLER_COLUMNS}
            data={desktopSlice}
            rowKey={(item) => item.id}
            onRowClick={(item) => router.push(`/admin/resellers/${item.id}`)}
            renderCell={(item, col) => {
              switch (col) {
                case 'organization':
                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-medium text-sm">
                        {item.organization_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{item.organization_name}</span>
                        <p className="text-xs text-foreground-muted">{item.email}</p>
                      </div>
                    </div>
                  );
                case 'paybill':
                  return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-mono text-xs font-semibold">
                      {item.mpesa_shortcode}
                    </span>
                  );
                case 'revenue':
                  return (
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatKES(item.total_revenue)}</p>
                      <p className="text-[10px] text-emerald-500">M-Pesa: {formatKES(item.mpesa_revenue)}</p>
                    </div>
                  );
                case 'customers':
                  return (
                    <span className="text-sm">
                      <span className="text-emerald-500 font-medium">{item.active_customers}</span>
                      <span className="text-foreground-muted">/{item.total_customers}</span>
                    </span>
                  );
                case 'routers':
                  return <span className="text-sm text-foreground-muted">{item.router_count}</span>;
                case 'unpaid':
                  return <span className="text-sm font-medium text-amber-500">{formatKES(item.unpaid_balance)}</span>;
                case 'joined':
                  return <span className="text-sm text-foreground-muted">{formatSafeDate(item.created_at)}</span>;
                case 'last_login':
                  return (
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isRecentlyActive(item.last_login_at) ? 'bg-emerald-500' : 'bg-foreground-muted/30'}`} />
                      <span className="text-sm text-foreground-muted">{formatSafeDate(item.last_login_at)}</span>
                    </div>
                  );
                default:
                  return null;
              }
            }}
            rowStyle={(_r, index) => ({ animationDelay: `${index * 0.05}s`, opacity: 0 })}
            emptyState={{
              icon: (
                <svg className="w-12 h-12 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              ),
              message: search ? 'No resellers match your search' : filter ? `No ${FILTER_LABELS[filter]?.toLowerCase()} resellers found` : 'No resellers found',
            }}
            footer={resellers.length > DESKTOP_PAGE_SIZE ? (
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-foreground-muted">
                  Showing {(desktopPage - 1) * DESKTOP_PAGE_SIZE + 1}&ndash;{Math.min(desktopPage * DESKTOP_PAGE_SIZE, resellers.length)} of {resellers.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDesktopPage((p) => Math.max(1, p - 1))}
                    disabled={desktopPage <= 1}
                    className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-foreground-muted">
                    Page {desktopPage} of {desktopTotalPages}
                  </span>
                  <button
                    onClick={() => setDesktopPage((p) => Math.min(desktopTotalPages, p + 1))}
                    disabled={desktopPage >= desktopTotalPages}
                    className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : resellers.length > 0 ? (
              <div className="px-4 py-3">
                <p className="text-sm text-foreground-muted">
                  Showing {resellers.length} reseller{resellers.length !== 1 ? 's' : ''}
                </p>
              </div>
            ) : undefined}
          />
        </>
        );
      })()}
    </div>
  );
}
