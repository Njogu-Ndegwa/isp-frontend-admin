'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import {
  AccessCredential,
  AccessCredFilterStatus,
  Router as RouterType,
} from '../lib/types';
import { useAlert } from '../context/AlertContext';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import MobileDataCard from '../components/MobileDataCard';
import SearchInput from '../components/SearchInput';
import FilterSelect from '../components/FilterSelect';
import DataTable, { DataTableColumn } from '../components/DataTable';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatDateGMT3 } from '../lib/dateUtils';

const COLUMNS: DataTableColumn[] = [
  { key: 'username', label: 'Username' },
  { key: 'label', label: 'Label' },
  { key: 'router', label: 'Router' },
  { key: 'rate', label: 'Rate / Cap' },
  { key: 'binding', label: 'Bound To' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '' },
];

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)} ${units[i]}`;
}

function safeFormatDate(d: string | null | undefined): string {
  try {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '-';
    return formatDateGMT3(d, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
}

export default function AccessCredentialsPage() {
  const routerNav = useRouter();
  const { showAlert } = useAlert();

  const [items, setItems] = useState<AccessCredential[]>([]);
  const [total, setTotal] = useState(0);
  const [routers, setRouters] = useState<RouterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<AccessCredFilterStatus | 'all'>('active');
  const [routerFilter, setRouterFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [refreshKey, setRefreshKey] = useState(0);

  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [credentialsModal, setCredentialsModal] = useState<AccessCredential | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<AccessCredential | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AccessCredential | null>(null);
  const [forceLogoutConfirm, setForceLogoutConfirm] = useState<AccessCredential | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const prevSearchRef = useRef(searchQuery);
  const prevStatusRef = useRef(statusFilter);
  const prevRouterRef = useRef(routerFilter);
  useEffect(() => {
    if (
      prevSearchRef.current !== searchQuery ||
      prevStatusRef.current !== statusFilter ||
      prevRouterRef.current !== routerFilter
    ) {
      setPage(1);
      prevSearchRef.current = searchQuery;
      prevStatusRef.current = statusFilter;
      prevRouterRef.current = routerFilter;
    }
  }, [searchQuery, statusFilter, routerFilter]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const filters = {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          router_id: routerFilter !== 'all' ? routerFilter : undefined,
          q: searchQuery || undefined,
          page,
          per_page: perPage,
        };
        const result = await api.getAccessCredentials(filters);
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load access credentials');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [statusFilter, routerFilter, searchQuery, page, perPage, refreshKey]);

  useEffect(() => {
    api.getRouters().then(setRouters).catch(() => {});
  }, []);

  const handleViewCredentials = useCallback(async (cred: AccessCredential) => {
    try {
      setActionLoading(cred.id);
      const fresh = await api.getAccessCredential(cred.id, true);
      setCredentialsModal(fresh);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load credentials');
    } finally {
      setActionLoading(null);
    }
  }, [showAlert]);

  const handleRotatePassword = useCallback(async (cred: AccessCredential) => {
    try {
      setActionLoading(cred.id);
      const updated = await api.rotateAccessCredentialPassword(cred.id);
      setCredentialsModal(updated);
      showAlert('success', `Password rotated for ${cred.username}`);
      refresh();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to rotate password');
    } finally {
      setActionLoading(null);
    }
  }, [showAlert, refresh]);

  const handleRevoke = useCallback(async () => {
    if (!revokeConfirm) return;
    try {
      setActionLoading(revokeConfirm.id);
      await api.revokeAccessCredential(revokeConfirm.id);
      showAlert('success', `${revokeConfirm.username} revoked`);
      setRevokeConfirm(null);
      refresh();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to revoke');
    } finally {
      setActionLoading(null);
    }
  }, [revokeConfirm, showAlert, refresh]);

  const handleRestore = useCallback(async (cred: AccessCredential) => {
    try {
      setActionLoading(cred.id);
      await api.restoreAccessCredential(cred.id);
      showAlert('success', `${cred.username} restored`);
      refresh();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to restore');
    } finally {
      setActionLoading(null);
    }
  }, [showAlert, refresh]);

  const handleForceLogout = useCallback(async () => {
    if (!forceLogoutConfirm) return;
    try {
      setActionLoading(forceLogoutConfirm.id);
      await api.forceLogoutAccessCredential(forceLogoutConfirm.id);
      showAlert('success', `${forceLogoutConfirm.username} logged out`);
      setForceLogoutConfirm(null);
      refresh();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to force-logout');
    } finally {
      setActionLoading(null);
    }
  }, [forceLogoutConfirm, showAlert, refresh]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      setActionLoading(deleteConfirm.id);
      await api.deleteAccessCredential(deleteConfirm.id);
      showAlert('success', `${deleteConfirm.username} deleted`);
      setDeleteConfirm(null);
      refresh();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setActionLoading(null);
    }
  }, [deleteConfirm, showAlert, refresh]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showAlert('success', `${label} copied`);
  };

  const getRouterName = (id: number) => routers.find((r) => r.id === id)?.name || `#${id}`;

  const computedStatusLabel = (cred: AccessCredential): { text: string; variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info' } => {
    if (cred.status === 'revoked') return { text: 'Revoked', variant: 'danger' };
    if (cred.bound_mac_address) return { text: 'In use', variant: 'info' };
    return { text: 'Available', variant: 'success' };
  };

  const stats = {
    active: items.filter((c) => c.status === 'active').length,
    inUse: items.filter((c) => c.status === 'active' && c.bound_mac_address).length,
    idle: items.filter((c) => c.status === 'active' && !c.bound_mac_address).length,
    revoked: items.filter((c) => c.status === 'revoked').length,
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
          <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load</h2>
          <p className="text-foreground-muted mb-4">{error}</p>
          <button onClick={refresh} className="btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Access Credentials"
        subtitle="Perpetual hotspot logins for staff & comp accounts"
        action={
          <Link
            href="/access-credentials/create"
            className="btn-primary flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New Credential</span>
            <span className="sm:hidden">New</span>
          </Link>
        }
      />

      {/* Quick stats from current page */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard
            title="Active"
            value={stats.active}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            accent="success"
          />
          <StatCard
            title="In Use"
            value={stats.inUse}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            accent="info"
          />
          <StatCard
            title="Idle"
            value={stats.idle}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            accent="primary"
          />
          <StatCard
            title="Revoked"
            value={stats.revoked}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636" />
              </svg>
            }
            accent="info"
          />
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by username or label..."
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <FilterSelect
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as AccessCredFilterStatus | 'all')}
              options={[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'in_use', label: 'In Use' },
                { value: 'idle', label: 'Idle' },
                { value: 'revoked', label: 'Revoked' },
              ]}
            />
            <FilterSelect
              value={String(routerFilter)}
              onChange={(v) => setRouterFilter(v === 'all' ? 'all' : Number(v))}
              options={[
                { value: 'all', label: 'All Routers' },
                ...routers.map((r) => ({ value: String(r.id), label: r.name })),
              ]}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <>
          <DataTable<AccessCredential>
            columns={COLUMNS}
            data={items}
            rowKey={(c) => c.id}
            scrollable
            onRowClick={(c) => routerNav.push(`/access-credentials/${c.id}`)}
            renderCell={(cred, key) => {
              const statusLabel = computedStatusLabel(cred);
              switch (key) {
                case 'username':
                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-medium text-sm flex-shrink-0">
                        {cred.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono font-medium text-foreground truncate block">{cred.username}</span>
                        {cred.live?.is_online && (
                          <span className="text-xs text-success">● Online</span>
                        )}
                      </div>
                    </div>
                  );
                case 'label':
                  return <span className="text-foreground-muted text-sm">{cred.label || '-'}</span>;
                case 'router':
                  return <span className="text-foreground-muted text-sm">{getRouterName(cred.router_id)}</span>;
                case 'rate':
                  return (
                    <div className="text-sm">
                      <p className="font-mono text-foreground">{cred.rate_limit || 'Unlimited'}</p>
                      {cred.data_cap_mb ? (
                        <p className="text-xs text-foreground-muted">{cred.data_cap_mb.toLocaleString()} MB cap</p>
                      ) : null}
                    </div>
                  );
                case 'binding':
                  if (!cred.bound_mac_address) return <span className="text-foreground-muted text-sm">-</span>;
                  return (
                    <div className="text-sm">
                      <p className="font-mono text-foreground">{cred.bound_mac_address}</p>
                      {cred.last_seen_ip && <p className="text-xs text-foreground-muted">{cred.last_seen_ip}</p>}
                    </div>
                  );
                case 'status':
                  return (
                    <span className={`badge ${
                      statusLabel.variant === 'success' ? 'badge-success'
                      : statusLabel.variant === 'info' ? 'badge-info'
                      : statusLabel.variant === 'danger' ? 'badge-danger'
                      : 'badge-neutral'
                    }`}>
                      {statusLabel.text}
                    </span>
                  );
                case 'actions':
                  return (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleViewCredentials(cred)}
                        disabled={actionLoading === cred.id}
                        className="p-1.5 rounded-md hover:bg-background-tertiary transition-colors text-foreground-muted hover:text-foreground"
                        title="View credentials"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </button>
                      {cred.status === 'active' && cred.bound_mac_address && (
                        <button
                          onClick={() => setForceLogoutConfirm(cred)}
                          className="p-1.5 rounded-md hover:bg-warning/10 transition-colors text-foreground-muted hover:text-warning"
                          title="Force logout"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </button>
                      )}
                      {cred.status === 'active' ? (
                        <button
                          onClick={() => setRevokeConfirm(cred)}
                          className="p-1.5 rounded-md hover:bg-danger/10 transition-colors text-foreground-muted hover:text-danger"
                          title="Revoke"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(cred)}
                          disabled={actionLoading === cred.id}
                          className="p-1.5 rounded-md hover:bg-success/10 transition-colors text-foreground-muted hover:text-success"
                          title="Restore"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteConfirm(cred)}
                        className="p-1.5 rounded-md hover:bg-danger/10 transition-colors text-foreground-muted hover:text-danger"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  );
                default:
                  return null;
              }
            }}
            rowStyle={(_c, index) => ({ animationDelay: `${index * 0.05}s`, opacity: 0 })}
            emptyState={{
              icon: (
                <svg className="w-12 h-12 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              ),
              message: searchQuery ? 'No credentials match your search' : 'No access credentials yet',
            }}
            footer={
              <Pagination
                page={page}
                perPage={perPage}
                total={total}
                onPageChange={setPage}
                onPerPageChange={(pp) => { setPerPage(pp); setPage(1); }}
                loading={loading}
                noun="credentials"
              />
            }
          />

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {items.length === 0 ? (
              <div className="card p-8 text-center text-foreground-muted">
                <svg className="w-12 h-12 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                {searchQuery ? 'No credentials match your search' : 'No access credentials yet'}
              </div>
            ) : (
              items.map((cred) => {
                const statusLabel = computedStatusLabel(cred);
                return (
                  <MobileDataCard
                    key={cred.id}
                    id={cred.id}
                    title={cred.username}
                    subtitle={cred.label || getRouterName(cred.router_id)}
                    avatar={{
                      text: cred.username.charAt(0).toUpperCase(),
                      color: cred.status === 'revoked' ? 'danger' : cred.bound_mac_address ? 'info' : 'primary',
                    }}
                    status={{ label: statusLabel.text, variant: statusLabel.variant }}
                    value={{ text: cred.rate_limit || 'Unlimited', highlight: false }}
                    secondary={{
                      left: cred.bound_mac_address ? (
                        <span className="font-mono text-xs">{cred.bound_mac_address}</span>
                      ) : (
                        <span className="text-foreground-muted">No device</span>
                      ),
                      right: cred.data_cap_mb ? `${cred.data_cap_mb.toLocaleString()} MB cap` : 'No cap',
                    }}
                    href={`/access-credentials/${cred.id}`}
                    rightAction={
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleViewCredentials(cred); }}
                          className="p-1.5 rounded-md hover:bg-background-tertiary text-foreground-muted hover:text-foreground active:opacity-70"
                          title="Credentials"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>
                        {cred.status === 'active' && cred.bound_mac_address && (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setForceLogoutConfirm(cred); }}
                            className="p-1.5 rounded-md hover:bg-warning/10 text-warning active:opacity-70"
                            title="Force logout"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                          </button>
                        )}
                        {cred.status === 'active' ? (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRevokeConfirm(cred); }}
                            className="p-1.5 rounded-md hover:bg-danger/10 text-danger active:opacity-70"
                            title="Revoke"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRestore(cred); }}
                            className="p-1.5 rounded-md hover:bg-success/10 text-success active:opacity-70"
                            title="Restore"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                      </div>
                    }
                    layout="compact"
                    className="animate-fade-in"
                  />
                );
              })
            )}

            <Pagination
              page={page}
              perPage={perPage}
              total={total}
              onPageChange={setPage}
              onPerPageChange={(pp) => { setPerPage(pp); setPage(1); }}
              loading={loading}
              noun="credentials"
            />
          </div>
        </>
      )}

      {/* Mobile FAB */}
      <Link
        href="/access-credentials/create"
        className="md:hidden fixed right-4 bottom-24 z-[9998] w-14 h-14 rounded-full bg-accent-primary text-white flex items-center justify-center shadow-lg shadow-accent-primary/25 active:scale-95 transition-transform touch-manipulation"
        title="New credential"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </Link>

      {/* Credentials reveal modal */}
      {credentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setCredentialsModal(null)}>
          <div className="card p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Access Credentials</h3>
              <button onClick={() => setCredentialsModal(null)} className="p-1 rounded-md hover:bg-background-tertiary text-foreground-muted">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {credentialsModal.label && (
              <p className="text-sm text-foreground-muted">{credentialsModal.label}</p>
            )}
            <div className="space-y-3">
              <div className="bg-background-tertiary rounded-lg p-3">
                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Username</label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-sm text-foreground">{credentialsModal.username}</span>
                  <button onClick={() => copyToClipboard(credentialsModal.username, 'Username')} className="p-1.5 rounded-md hover:bg-background-secondary text-foreground-muted hover:text-foreground">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              {credentialsModal.password && (
                <div className="bg-background-tertiary rounded-lg p-3">
                  <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Password</label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-sm text-foreground break-all">{credentialsModal.password}</span>
                    <button onClick={() => copyToClipboard(credentialsModal.password!, 'Password')} className="p-1.5 rounded-md hover:bg-background-secondary text-foreground-muted hover:text-foreground flex-shrink-0 ml-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              {credentialsModal.live && (
                <div className="bg-background-tertiary rounded-lg p-3 space-y-1">
                  <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Live Status</label>
                  <p className="text-sm">
                    <span className={credentialsModal.live.is_online ? 'text-success' : 'text-foreground-muted'}>
                      ● {credentialsModal.live.is_online ? 'Online' : 'Offline'}
                    </span>
                  </p>
                  {credentialsModal.live.bound_mac_address && (
                    <p className="text-xs text-foreground-muted">MAC: <span className="font-mono">{credentialsModal.live.bound_mac_address}</span></p>
                  )}
                  {credentialsModal.live.bound_ip_address && (
                    <p className="text-xs text-foreground-muted">IP: <span className="font-mono">{credentialsModal.live.bound_ip_address}</span></p>
                  )}
                  {credentialsModal.live.uptime_this_session && (
                    <p className="text-xs text-foreground-muted">Uptime: {credentialsModal.live.uptime_this_session}</p>
                  )}
                </div>
              )}
              <div className="bg-background-tertiary rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-foreground-muted">Total in</p>
                  <p className="font-mono text-foreground">{formatBytes(credentialsModal.total_bytes_in)}</p>
                </div>
                <div>
                  <p className="text-foreground-muted">Total out</p>
                  <p className="font-mono text-foreground">{formatBytes(credentialsModal.total_bytes_out)}</p>
                </div>
                <div>
                  <p className="text-foreground-muted">Last login</p>
                  <p className="text-foreground">{safeFormatDate(credentialsModal.last_login_at)}</p>
                </div>
                <div>
                  <p className="text-foreground-muted">Created</p>
                  <p className="text-foreground">{safeFormatDate(credentialsModal.created_at)}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleRotatePassword(credentialsModal)}
                disabled={actionLoading === credentialsModal.id}
                className="btn-secondary flex-1 text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Rotate Password
              </button>
              <button
                onClick={() => credentialsModal.password && copyToClipboard(`Username: ${credentialsModal.username}\nPassword: ${credentialsModal.password}`, 'Credentials')}
                disabled={!credentialsModal.password}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Both
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!revokeConfirm}
        onClose={() => setRevokeConfirm(null)}
        onConfirm={handleRevoke}
        title="Revoke credential"
        message={`This will remove ${revokeConfirm?.username || ''} from the router and kick any active session. You can restore it later.`}
        confirmLabel="Revoke"
        variant="danger"
        loading={actionLoading === revokeConfirm?.id}
      />

      <ConfirmDialog
        isOpen={!!forceLogoutConfirm}
        onClose={() => setForceLogoutConfirm(null)}
        onConfirm={handleForceLogout}
        title="Force logout"
        message={`Disconnect the device currently using ${forceLogoutConfirm?.username || ''}. The credential stays active so it can be used on another device.`}
        confirmLabel="Force Logout"
        variant="warning"
        loading={actionLoading === forceLogoutConfirm?.id}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete credential"
        message={`Permanently delete ${deleteConfirm?.username || ''}? This also removes the router-side artifacts. Prefer revoke unless you really want it gone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading === deleteConfirm?.id}
      />
    </div>
  );
}
