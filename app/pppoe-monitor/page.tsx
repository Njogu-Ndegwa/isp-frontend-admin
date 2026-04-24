'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../lib/api';
import {
  PPPoEMonitorResponse,
  PPPoEMonitorUser,
  PPPoEDiagnoseResponse,
} from '../lib/types';
import Header from '../components/Header';
import RouterSelector from '../components/RouterSelector';
import StatCard from '../components/StatCard';
import DataTable, { DataTableColumn } from '../components/DataTable';
import MobileDataCard from '../components/MobileDataCard';
import SearchInput from '../components/SearchInput';
import FilterSelect from '../components/FilterSelect';
import Pagination from '../components/Pagination';
import { PageLoader } from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { formatDateGMT3 } from '../lib/dateUtils';

type StatusFilter = 'all' | 'online' | 'offline';
type SortBy = 'status' | 'download' | 'upload' | 'usage' | 'name';

function formatRate(bpsStr: string): string {
  const bps = parseInt(bpsStr, 10) || 0;
  if (bps === 0) return '—';
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)} Kbps`;
  return `${bps} bps`;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '—';
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatMbps(bps: number): string {
  if (!bps || bps === 0) return '0 Mbps';
  return `${(bps / 1_000_000).toFixed(1)} Mbps`;
}

const POLL_INTERVAL = 30_000;

const TABLE_COLUMNS: DataTableColumn[] = [
  { key: 'customer', label: 'Customer' },
  { key: 'status', label: 'Status' },
  { key: 'ip', label: 'IP Address', className: 'hidden lg:table-cell' },
  { key: 'uptime', label: 'Uptime', className: 'hidden lg:table-cell' },
  { key: 'download', label: 'Download' },
  { key: 'upload', label: 'Upload' },
  { key: 'session', label: 'Session Usage', className: 'hidden xl:table-cell' },
  { key: 'limit', label: 'Limit', className: 'hidden xl:table-cell' },
  { key: 'plan', label: 'Plan', className: 'hidden lg:table-cell' },
  { key: 'lastSeen', label: 'Last Seen / Reason', className: 'hidden xl:table-cell' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
];

const SORT_OPTIONS = [
  { value: 'status', label: 'Sort: Status' },
  { value: 'download', label: 'Sort: Download ↓' },
  { value: 'upload', label: 'Sort: Upload ↓' },
  { value: 'usage', label: 'Sort: Session Usage ↓' },
  { value: 'name', label: 'Sort: Name A-Z' },
];

function StatusDot({ online, disabled }: { online: boolean; disabled: boolean }) {
  if (disabled) {
    return (
      <span className="inline-flex items-center gap-1.5 text-yellow-500">
        <span className="w-2 h-2 rounded-full bg-yellow-400" />
        <span className="text-xs font-medium">Disabled</span>
      </span>
    );
  }
  if (online) {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-500">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-medium">Online</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-foreground-muted">
      <span className="w-2 h-2 rounded-full bg-foreground-muted/40" />
      <span className="text-xs font-medium">Offline</span>
    </span>
  );
}

function DiagnoseDialog({
  username,
  routerId,
  onClose,
}: {
  username: string;
  routerId: number;
  onClose: () => void;
}) {
  const [result, setResult] = useState<PPPoEDiagnoseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.diagnosePPPoE(routerId, username);
        if (!cancelled) setResult(data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Diagnosis failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [routerId, username]);

  const formatExpiry = (dateStr: string | null) => {
    try {
      if (!dateStr) return '—';
      return formatDateGMT3(dateStr, { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Diagnose: {username}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-background-tertiary text-foreground-muted"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-[3px] rounded-full border-amber-500/30 border-t-amber-500 animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`badge ${result.status === 'online' ? 'badge-success' : 'badge-danger'}`}>
                {result.status}
              </span>
              {result.has_critical && (
                <span className="badge badge-danger">Critical Issues</span>
              )}
              <span className="text-xs text-foreground-muted">
                {result.issues_count} issue{result.issues_count !== 1 ? 's' : ''} found
              </span>
            </div>

            {result.customer && (
              <div className="p-3 rounded-lg bg-background-tertiary text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-foreground-muted text-xs">Customer</span>
                    <p className="font-medium text-foreground">{result.customer.name}</p>
                  </div>
                  <div>
                    <span className="text-foreground-muted text-xs">Status</span>
                    <p className="font-medium text-foreground">{result.customer.status}</p>
                  </div>
                  <div>
                    <span className="text-foreground-muted text-xs">Plan</span>
                    <p className="font-medium text-foreground">{result.customer.plan || '—'}</p>
                  </div>
                  <div>
                    <span className="text-foreground-muted text-xs">Expiry</span>
                    <p className="font-medium text-foreground">{formatExpiry(result.customer.expiry)}</p>
                  </div>
                </div>
              </div>
            )}

            {result.issues.length > 0 ? (
              <div className="space-y-2">
                {result.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg text-sm border ${
                      issue.severity === 'critical'
                        ? 'bg-danger/10 border-danger/20'
                        : issue.severity === 'warning'
                        ? 'bg-warning/10 border-warning/20'
                        : 'bg-info/10 border-info/20'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-xs font-semibold uppercase mt-0.5 ${
                        issue.severity === 'critical' ? 'text-danger' :
                        issue.severity === 'warning' ? 'text-warning' : 'text-info'
                      }`}>
                        {issue.severity}
                      </span>
                      <div>
                        <p className="text-foreground">{issue.message}</p>
                        {issue.recommendation && (
                          <p className="text-foreground-muted text-xs mt-1">{issue.recommendation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-success text-sm text-center">
                No issues found — connection looks healthy.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PPPoEMonitorPage() {
  const { isAuthenticated } = useAuth();
  const [selectedRouterId, setSelectedRouterId] = useState<number | null>(null);
  const [data, setData] = useState<PPPoEMonitorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('status');
  const [diagnoseUser, setDiagnoseUser] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetchData = useCallback(async (routerId: number, mode: 'initial' | 'refresh' | 'poll' = 'initial') => {
    try {
      if (mode === 'initial') {
        setLoading(true);
        setData(null);
      } else if (mode === 'refresh') {
        setRefreshing(true);
      }
      // 'poll' mode updates silently in the background — no spinners, no data clear
      setError(null);
      const result = await api.getPPPoEUsers(routerId, mode === 'refresh');
      setData(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load PPPoE users');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedRouterId || !isAuthenticated) return;

    fetchData(selectedRouterId, 'initial');
    const interval = setInterval(() => fetchData(selectedRouterId, 'poll'), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedRouterId, isAuthenticated, fetchData]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery, sortBy]);

  const handleRefresh = () => {
    if (selectedRouterId) fetchData(selectedRouterId, 'refresh');
  };

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePerPageChange = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  }, []);

  const sortedFilteredUsers = useMemo(() => {
    if (!data) return [];

    let users = data.users;

    if (statusFilter === 'online') users = users.filter((u) => u.online);
    else if (statusFilter === 'offline') users = users.filter((u) => !u.online);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      users = users.filter((u) =>
        u.username.toLowerCase().includes(q) ||
        (u.customer?.name ?? '').toLowerCase().includes(q) ||
        (u.customer?.phone ?? '').includes(q)
      );
    }

    const sorted = [...users];
    switch (sortBy) {
      case 'status':
        sorted.sort((a, b) => {
          if (a.online === b.online) return (a.customer?.name ?? a.username).localeCompare(b.customer?.name ?? b.username);
          return a.online ? -1 : 1;
        });
        break;
      case 'download':
        sorted.sort((a, b) => (parseInt(b.download_rate) || 0) - (parseInt(a.download_rate) || 0));
        break;
      case 'upload':
        sorted.sort((a, b) => (parseInt(b.upload_rate) || 0) - (parseInt(a.upload_rate) || 0));
        break;
      case 'usage':
        sorted.sort((a, b) => b.download_bytes - a.download_bytes);
        break;
      case 'name':
        sorted.sort((a, b) => (a.customer?.name ?? a.username).localeCompare(b.customer?.name ?? b.username));
        break;
    }

    return sorted;
  }, [data, statusFilter, searchQuery, sortBy]);

  const displayedUsers = sortedFilteredUsers.slice((page - 1) * perPage, page * perPage);
  const effectiveTotal = sortedFilteredUsers.length;

  const renderCell = (user: PPPoEMonitorUser, key: string) => {
    switch (key) {
      case 'customer':
        return (
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
              user.online ? 'bg-success/10 text-success' : 'bg-foreground-muted/10 text-foreground-muted'
            }`}>
              {(user.customer?.name ?? user.username).charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="font-medium text-foreground">
                {user.customer?.name ?? user.username}
              </span>
              {user.customer && (
                <p className="text-xs font-mono text-foreground-muted">{user.username}</p>
              )}
              {user.customer?.phone && (
                <p className="text-xs text-foreground-muted">{user.customer.phone}</p>
              )}
            </div>
          </div>
        );
      case 'status':
        return <StatusDot online={user.online} disabled={user.disabled} />;
      case 'ip':
        return <span className="font-mono text-sm text-foreground-muted">{user.address ?? '—'}</span>;
      case 'uptime':
        return <span className="text-sm text-foreground-muted">{user.uptime ?? '—'}</span>;
      case 'download':
        return <span className="font-semibold text-accent-primary text-sm">{formatRate(user.download_rate)}</span>;
      case 'upload':
        return <span className="text-teal-500 text-sm">{formatRate(user.upload_rate)}</span>;
      case 'session':
        return user.online ? (
          <span className="text-xs text-foreground-muted">
            ↓{formatBytes(user.download_bytes)} / ↑{formatBytes(user.upload_bytes)}
          </span>
        ) : <span className="text-foreground-muted">—</span>;
      case 'limit':
        return <span className="font-mono text-xs text-foreground-muted">{user.max_limit || '—'}</span>;
      case 'plan':
        return <span className="text-sm text-foreground-muted">{user.customer?.plan ?? '—'}</span>;
      case 'lastSeen':
        if (user.online || !user.last_logged_out) return <span className="text-foreground-muted">—</span>;
        return (
          <div className="text-xs">
            <div className="text-foreground-muted">{user.last_logged_out}</div>
            {user.last_disconnect_reason && (
              <div className="text-warning">{user.last_disconnect_reason}</div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const formatSafeDate = (dateStr: string | undefined | null): string => {
    try {
      if (!dateStr) return '—';
      return formatDateGMT3(dateStr, { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const errorForStatus = (err: string) => {
    if (err.includes('404')) return 'Router not found or not accessible.';
    if (err.includes('503')) return 'Cannot connect to router. Please try again later.';
    if (err.includes('504')) return 'Router timed out. The router may be overloaded.';
    return err;
  };

  const STATUS_LABELS: Record<string, string> = { online: 'Online', offline: 'Offline' };
  const SORT_LABELS: Record<string, string> = { download: 'Download ↓', upload: 'Upload ↓', usage: 'Session Usage ↓', name: 'Name A-Z' };

  if (!isAuthenticated) return null;

  if (error && !data) {
    return (
      <div>
        <Header title="PPPoE Monitor" />
        <div className="mb-5">
          <RouterSelector
            selectedRouterId={selectedRouterId}
            onRouterChange={setSelectedRouterId}
          />
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load PPPoE Users</h2>
            <p className="text-foreground-muted mb-4">{errorForStatus(error)}</p>
            <button onClick={handleRefresh} className="btn-primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="PPPoE Monitor"
        subtitle={data ? `${data.router_name} — ${data.summary.online} online, ${data.summary.offline} offline` : undefined}
      />

      <div className="mb-5">
        <RouterSelector
          selectedRouterId={selectedRouterId}
          onRouterChange={setSelectedRouterId}
        />
      </div>

      {/* Stale cache warning */}
      {data?.stale && (
        <div className="mb-4 p-3 rounded-xl bg-warning/10 border border-warning/20 text-warning text-sm flex items-center gap-2 animate-fade-in">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Router unreachable — showing cached data from {Math.round(data.cache_age_seconds ?? 0)}s ago
        </div>
      )}

      {/* No router selected */}
      {!selectedRouterId && !loading && (
        <div className="card p-12 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <p className="text-foreground font-medium mb-1">Select a Router</p>
          <p className="text-foreground-muted text-sm">Choose a router above to monitor PPPoE users.</p>
        </div>
      )}

      {/* Summary Stats */}
      {data && (
        <div className={`grid grid-cols-2 gap-3 sm:gap-6 mb-6 ${
          data.summary.disabled > 0
            ? 'md:grid-cols-3 lg:grid-cols-6'
            : 'md:grid-cols-3 lg:grid-cols-5'
        }`}>
          <div className="animate-fade-in delay-1" style={{ opacity: 0 }}>
            <StatCard
              title="Total Users"
              value={data.summary.total}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              }
              accent="primary"
            />
          </div>
          <div className="animate-fade-in delay-2" style={{ opacity: 0 }}>
            <StatCard
              title="Online"
              value={data.summary.online}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              accent="success"
            />
          </div>
          <div className="animate-fade-in delay-3" style={{ opacity: 0 }}>
            <StatCard
              title="Offline"
              value={data.summary.offline}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              }
              accent="danger"
            />
          </div>
          {data.summary.disabled > 0 && (
            <div className="animate-fade-in delay-4" style={{ opacity: 0 }}>
              <StatCard
                title="Disabled"
                value={data.summary.disabled}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                  </svg>
                }
                accent="warning"
              />
            </div>
          )}
          <div className="animate-fade-in delay-4" style={{ opacity: 0 }}>
            <StatCard
              title="Total Download"
              value={formatMbps(data.summary.total_download_rate_bps)}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              }
              accent="info"
            />
          </div>
          <div className="animate-fade-in delay-4" style={{ opacity: 0 }}>
            <StatCard
              title="Total Upload"
              value={formatMbps(data.summary.total_upload_rate_bps)}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              }
              accent="secondary"
            />
          </div>
        </div>
      )}

      {/* Filters */}
      {data && (
        <div className="mb-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by name, username, or phone..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <FilterSelect
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }}
                options={STATUS_FILTER_OPTIONS}
              />
              <FilterSelect
                value={sortBy}
                onChange={(v) => { setSortBy(v as SortBy); setPage(1); }}
                options={SORT_OPTIONS}
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-primary flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Active Filters */}
          {(statusFilter !== 'all' || sortBy !== 'status') && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs text-foreground-muted">Filters:</span>
              {statusFilter !== 'all' && (
                <button
                  onClick={() => setStatusFilter('all')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors capitalize"
                >
                  {STATUS_LABELS[statusFilter]}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
              {sortBy !== 'status' && (
                <button
                  onClick={() => setSortBy('status')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
                >
                  {SORT_LABELS[sortBy]}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
              <button
                onClick={() => { setStatusFilter('all'); setSortBy('status'); setPage(1); }}
                className="text-xs text-foreground-muted hover:text-foreground transition-colors underline underline-offset-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {loading && !data && selectedRouterId ? (
        <PageLoader />
      ) : data ? (
        <>
          {/* Desktop Table */}
          <DataTable<PPPoEMonitorUser>
            columns={TABLE_COLUMNS}
            data={displayedUsers}
            rowKey={(u) => u.username}
            renderCell={renderCell}
            onRowClick={(u) => setDiagnoseUser(u.username)}
            rowClassName={(u) =>
              `cursor-pointer transition-colors ${u.online ? 'hover:bg-success/5' : 'hover:bg-background-tertiary'}`
            }
            rowStyle={(_u, index) => ({ animationDelay: `${index * 0.03}s`, opacity: 0 })}
            emptyState={{
              icon: (
                <svg className="w-12 h-12 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              ),
              message: searchQuery ? 'No users match your search' : 'No PPPoE users found on this router',
            }}
            footer={
              <Pagination
                page={page}
                perPage={perPage}
                total={effectiveTotal}
                onPageChange={handlePageChange}
                onPerPageChange={handlePerPageChange}
                loading={loading}
                noun="users"
              />
            }
          />

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 animate-fade-in">
            {displayedUsers.length === 0 ? (
              <div className="card p-8 text-center text-foreground-muted">
                <svg className="w-12 h-12 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                {searchQuery ? 'No users match your search' : 'No PPPoE users found'}
              </div>
            ) : (
              <>
                {displayedUsers.map((user) => (
                  <MobileDataCard
                    key={user.username}
                    id={user.username}
                    title={user.customer?.name ?? user.username}
                    subtitle={user.customer ? user.username : undefined}
                    avatar={{
                      text: (user.customer?.name ?? user.username).charAt(0).toUpperCase(),
                      color: user.disabled ? 'warning' : user.online ? 'success' : 'danger',
                    }}
                    status={{
                      label: user.disabled ? 'Disabled' : user.online ? 'Online' : 'Offline',
                      variant: user.disabled ? 'warning' : user.online ? 'success' : 'neutral',
                    }}
                    value={{
                      text: user.customer?.plan ?? user.profile ?? '—',
                      highlight: user.online,
                    }}
                    secondary={{
                      left: (
                        <span className="flex items-center gap-1.5">
                          {user.online && (
                            <>
                              <span className="text-accent-primary">↓{formatRate(user.download_rate)}</span>
                              <span className="text-teal-500">↑{formatRate(user.upload_rate)}</span>
                            </>
                          )}
                          {!user.online && user.last_disconnect_reason && (
                            <span className="text-warning text-xs">{user.last_disconnect_reason}</span>
                          )}
                          {!user.online && !user.last_disconnect_reason && (
                            <span className="text-foreground-muted">{user.customer?.plan ?? '—'}</span>
                          )}
                        </span>
                      ),
                      right: user.online
                        ? user.uptime ?? '—'
                        : user.last_logged_out || '—',
                    }}
                    rightAction={
                      <div className="flex items-center gap-2">
                        {user.online && (
                          <span className="text-xs text-foreground-muted font-mono">{user.address}</span>
                        )}
                        <span className="text-xs text-foreground-muted">{user.max_limit || '—'}</span>
                      </div>
                    }
                    onClick={() => setDiagnoseUser(user.username)}
                    layout="compact"
                    className="animate-fade-in"
                  />
                ))}

                <Pagination
                  page={page}
                  perPage={perPage}
                  total={effectiveTotal}
                  onPageChange={handlePageChange}
                  onPerPageChange={handlePerPageChange}
                  loading={loading}
                  noun="users"
                />
              </>
            )}
          </div>

          {/* Footer info */}
          <div className="hidden md:flex items-center justify-between text-xs text-foreground-muted gap-1 px-1 mt-4">
            <span>
              {data.cached && !data.stale && (
                <>Cached ({Math.round(data.cache_age_seconds ?? 0)}s ago) · </>
              )}
              Auto-refreshes every 30s
            </span>
            <span>
              Generated: {formatSafeDate(data.generated_at)}
            </span>
          </div>
        </>
      ) : null}

      {/* Diagnose Dialog */}
      {diagnoseUser && selectedRouterId && (
        <DiagnoseDialog
          username={diagnoseUser}
          routerId={selectedRouterId}
          onClose={() => setDiagnoseUser(null)}
        />
      )}
    </div>
  );
}
