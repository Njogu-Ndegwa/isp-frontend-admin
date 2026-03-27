'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../lib/api';
import { Customer, PPPoECredentials, ActivatePPPoERequest } from '../lib/types';
import { formatDateGMT3 } from '../lib/dateUtils';
import { useAlert } from '../context/AlertContext';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import MobileDataCard from '../components/MobileDataCard';
import SearchInput from '../components/SearchInput';
import FilterSelect from '../components/FilterSelect';
import DataTable, { DataTableColumn } from '../components/DataTable';
import Pagination from '../components/Pagination';

type FilterStatus = 'all' | 'active' | 'inactive';
type ConnectionFilter = 'all' | 'hotspot' | 'pppoe';

function getConnectionType(customer: Customer): 'hotspot' | 'pppoe' {
  return customer.connection_type ?? customer.plan?.connection_type ?? 'hotspot';
}

const CUSTOMER_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Customer' },
  { key: 'phone', label: 'Phone' },
  { key: 'type', label: 'Type' },
  { key: 'plan', label: 'Plan' },
  { key: 'router', label: 'Router' },
  { key: 'status', label: 'Status' },
  { key: 'expiry', label: 'Expiry' },
  { key: 'actions', label: '' },
];

export default function CustomersPage() {
  const routerNav = useRouter();
  const { showAlert } = useAlert();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [totalActive, setTotalActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('active');
  const [connectionFilter, setConnectionFilter] = useState<ConnectionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Modal state
  const [credentialsModal, setCredentialsModal] = useState<PPPoECredentials | null>(null);
  const [activateModal, setActivateModal] = useState<Customer | null>(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activateForm, setActivateForm] = useState<ActivatePPPoERequest>({
    payment_method: 'cash',
    payment_reference: '',
    notes: '',
  });

  const loadCustomers = useCallback(async (pageNum = page) => {
    try {
      setLoading(true);
      const mainRequest = filter === 'active'
        ? api.getActiveCustomers(1, pageNum, perPage)
        : api.getCustomers(1, pageNum, perPage);
      const [result, allResult, activeResult] = await Promise.all([
        mainRequest,
        api.getCustomers(1, 1, 1) as Promise<{ data: Customer[]; total: number }>,
        api.getActiveCustomers(1, 1, 1) as Promise<{ data: Customer[]; total: number }>,
      ]);
      setCustomers(result.data);
      setTotalItems(result.total);
      setTotalAll(allResult.total);
      setTotalActive(activeResult.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [filter, page, perPage]);

  useEffect(() => {
    loadCustomers(page);
  }, [loadCustomers, page]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePerPageChange = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  }, []);

  const filteredCustomers = customers.filter((customer) => {
    if (filter === 'inactive' && customer.status !== 'inactive') return false;
    if (connectionFilter !== 'all' && getConnectionType(customer) !== connectionFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (customer.name?.toLowerCase() || '').includes(query) ||
        (customer.phone || '').includes(query) ||
        (customer.mac_address?.toLowerCase() || '').includes(query) ||
        (customer.pppoe_username?.toLowerCase() || '').includes(query)
      );
    }
    return true;
  });

  const getStatusBadge = (status: Customer['status']) => {
    const badges = {
      active: 'badge-success',
      inactive: 'badge-neutral',
      expired: 'badge-danger',
    };
    return badges[status] || 'badge-neutral';
  };

  const formatTimeRemaining = (hours?: number) => {
    if (!hours) return '-';
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}m remaining`;
    }
    return `${hours.toFixed(1)}h remaining`;
  };

  const getTimeRemainingColor = (hours?: number) => {
    if (hours === undefined || hours === null) return 'text-foreground-muted';
    if (hours < 1) return 'text-red-400';
    if (hours < 6) return 'text-orange-400';
    if (hours < 24) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const formatCustomerExpiry = (expiry: string | undefined): string => {
    try {
      if (!expiry) return '-';
      const date = new Date(expiry);
      if (isNaN(date.getTime())) return '-';
      return formatDateGMT3(expiry, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.error('Date formatting error:', e);
      return '-';
    }
  };

  const handleViewCredentials = useCallback(async (customer: Customer) => {
    try {
      setActionLoading(true);
      const creds = await api.getPPPoECredentials(customer.id);
      setCredentialsModal(creds);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load credentials');
    } finally {
      setActionLoading(false);
    }
  }, [showAlert]);

  const handleActivate = useCallback(async () => {
    if (!activateModal) return;
    try {
      setActionLoading(true);
      await api.activatePPPoE(activateModal.id, activateForm);
      showAlert('success', `${activateModal.name} activated successfully`);
      setActivateModal(null);
      setActivateForm({ payment_method: 'cash', payment_reference: '', notes: '' });
      loadCustomers();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Activation failed');
    } finally {
      setActionLoading(false);
    }
  }, [activateModal, activateForm, showAlert]);

  const handleDeactivate = useCallback(async () => {
    if (!deactivateConfirm) return;
    try {
      setActionLoading(true);
      await api.deactivatePPPoE(deactivateConfirm.id);
      showAlert('success', `${deactivateConfirm.name} deactivated`);
      setDeactivateConfirm(null);
      loadCustomers();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Deactivation failed');
    } finally {
      setActionLoading(false);
    }
  }, [deactivateConfirm, showAlert]);

  const handleDeleteCustomer = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      setDeleteLoading(true);
      const result = await api.deleteCustomer(deleteConfirm.id);
      showAlert('success', result.message);
      if (result.pppoe_deprovisioned === 'failed') {
        showAlert('warning', 'PPPoE de-provisioning failed — manual cleanup may be needed');
      }
      setDeleteConfirm(null);
      loadCustomers();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to delete customer');
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteConfirm, showAlert]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showAlert('success', `${label} copied`);
  };

  const ConnectionBadge = ({ type }: { type?: string }) => {
    if (type === 'pppoe') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-info/10 text-info">
          PPPoE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-accent-primary/10 text-accent-primary">
        Hotspot
      </span>
    );
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
          <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Customers</h2>
          <p className="text-foreground-muted mb-4">{error}</p>
          <button onClick={() => loadCustomers(page)} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Customers"
        subtitle={`Manage your ${totalItems || customers.length} registered customers`}
        action={
          <Link
            href="/customers/register"
            className="btn-primary flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Register Customer</span>
            <span className="sm:hidden">Add</span>
          </Link>
        }
      />

      {/* Summary Stats */}
      {totalAll > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-6">
          <div className="animate-fade-in delay-1" style={{ opacity: 0 }}>
            <StatCard
              title="Total"
              value={totalAll}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              accent="primary"
            />
          </div>
          <div className="animate-fade-in delay-2" style={{ opacity: 0 }}>
            <StatCard
              title="Active"
              value={totalActive}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              accent="success"
            />
          </div>
          <div className="animate-fade-in delay-3" style={{ opacity: 0 }}>
            <StatCard
              title="Inactive"
              value={Math.max(0, totalAll - totalActive)}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              }
              accent="info"
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
              placeholder="Search by name, phone, MAC, or PPPoE username..."
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <FilterSelect
              value={filter}
              onChange={(v) => { setFilter(v as FilterStatus); setPage(1); }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <FilterSelect
              value={connectionFilter}
              onChange={(v) => setConnectionFilter(v as ConnectionFilter)}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'hotspot', label: 'Hotspot' },
                { value: 'pppoe', label: 'PPPoE' },
              ]}
            />
          </div>
        </div>

        {/* Active Filters */}
        {(filter !== 'all' || connectionFilter !== 'all') && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-foreground-muted">Filters:</span>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors capitalize"
              >
                {filter}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            {connectionFilter !== 'all' && (
              <button
                onClick={() => setConnectionFilter('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
              >
                {connectionFilter === 'pppoe' ? 'PPPoE' : 'Hotspot'}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            <button
              onClick={() => { setFilter('all'); setConnectionFilter('all'); }}
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
          {/* Desktop Table */}
          <DataTable<Customer>
            columns={CUSTOMER_COLUMNS}
            data={filteredCustomers}
            rowKey={(c) => c.id}
            onRowClick={(c) => routerNav.push(`/customers/${c.id}`)}
            renderCell={(customer, key) => {
              switch (key) {
                case 'name':
                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-medium text-sm">
                        {(customer.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{customer.name || 'Unknown'}</span>
                        {customer.pppoe_username && (
                          <p className="text-xs font-mono text-foreground-muted">{customer.pppoe_username}</p>
                        )}
                      </div>
                    </div>
                  );
                case 'phone':
                  return <span className="font-mono text-sm text-foreground-muted">{customer.phone || '-'}</span>;
                case 'type':
                  return <ConnectionBadge type={getConnectionType(customer)} />;
                case 'plan':
                  return (
                    <div>
                      <p className="font-medium text-foreground">{customer.plan?.name || 'No Plan'}</p>
                      <p className="text-xs text-foreground-muted">KES {customer.plan?.price ?? '-'}</p>
                    </div>
                  );
                case 'router':
                  return <span className="text-foreground-muted">{customer.router?.name || '-'}</span>;
                case 'status':
                  return (
                    <span className={`badge ${getStatusBadge(customer.status)} capitalize`}>
                      {customer.status}
                    </span>
                  );
                case 'expiry':
                  return customer.status === 'active' ? (
                    <div>
                      <p className="text-foreground text-sm">
                        {formatDateGMT3(customer.expiry, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {customer.hours_remaining !== undefined && (
                        <p className={`text-xs font-medium ${getTimeRemainingColor(customer.hours_remaining)}`}>
                          {formatTimeRemaining(customer.hours_remaining)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-foreground-muted">-</span>
                  );
                case 'actions':
                  return (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => routerNav.push(`/customers/${customer.id}`)}
                        className="p-1.5 rounded-md hover:bg-accent-primary/10 transition-colors text-foreground-muted hover:text-accent-primary"
                        title="Edit customer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(customer)}
                        className="p-1.5 rounded-md hover:bg-danger/10 transition-colors text-foreground-muted hover:text-danger"
                        title="Delete customer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      {getConnectionType(customer) === 'pppoe' && (
                        <>
                          <button
                            onClick={() => handleViewCredentials(customer)}
                            className="p-1.5 rounded-md hover:bg-background-tertiary transition-colors text-foreground-muted hover:text-foreground"
                            title="View Credentials"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </button>
                          {(customer.status === 'inactive' || customer.status === 'expired') && (
                            <button
                              onClick={() => setActivateModal(customer)}
                              className="p-1.5 rounded-md hover:bg-success/10 transition-colors text-success"
                              title="Activate PPPoE"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M9.172 14.828a4 4 0 010-5.656m5.656 0a4 4 0 010 5.656M12 12h.01" />
                              </svg>
                            </button>
                          )}
                          {customer.status === 'active' && (
                            <button
                              onClick={() => setDeactivateConfirm(customer)}
                              className="p-1.5 rounded-md hover:bg-danger/10 transition-colors text-danger"
                              title="Deactivate PPPoE"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          )}
                        </>
                      )}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
              message: searchQuery ? 'No customers match your search' : 'No customers found',
            }}
            footer={
              <Pagination page={page} perPage={perPage} total={totalItems} onPageChange={handlePageChange} onPerPageChange={handlePerPageChange} loading={loading} noun="customers" />
            }
          />

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredCustomers.length === 0 ? (
              <div className="card p-8 text-center text-foreground-muted">
                <svg className="w-12 h-12 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {searchQuery ? 'No customers match your search' : 'No customers found'}
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <MobileDataCard
                  key={customer.id}
                  id={customer.id}
                  title={customer.name || 'Unknown'}
                  subtitle={customer.pppoe_username || customer.phone || undefined}
                  avatar={{
                    text: (customer.name || '?').charAt(0).toUpperCase(),
                    color: getConnectionType(customer) === 'pppoe' ? 'info' : 'primary',
                  }}
                  badge={getConnectionType(customer) === 'pppoe' ? { label: 'PPPoE' } : undefined}
                  status={{
                    label: customer.status,
                    variant: customer.status === 'active' ? 'success' : customer.status === 'expired' ? 'danger' : 'neutral',
                  }}
                  value={{
                    text: customer.plan?.name || 'No Plan',
                  }}
                  secondary={{
                    left: customer.router?.name || '-',
                    right: customer.status === 'active' && customer.hours_remaining !== undefined
                      ? <span className={`font-medium ${getTimeRemainingColor(customer.hours_remaining)}`}>{formatTimeRemaining(customer.hours_remaining)}</span>
                      : formatCustomerExpiry(customer.expiry),
                  }}
                  href={`/customers/${customer.id}`}
                  rightAction={
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); routerNav.push(`/customers/${customer.id}`); }}
                        className="p-1.5 rounded-md hover:bg-accent-primary/10 transition-colors text-foreground-muted hover:text-accent-primary active:opacity-70"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {getConnectionType(customer) === 'pppoe' && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleViewCredentials(customer); }}
                          className="p-1.5 rounded-md hover:bg-background-tertiary transition-colors text-foreground-muted hover:text-foreground active:opacity-70"
                          title="Credentials"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm(customer); }}
                        className="p-1.5 rounded-md hover:bg-danger/10 transition-colors text-foreground-muted hover:text-danger active:opacity-70"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  }
                  layout="compact"
                  className="animate-fade-in"
                />
              ))
            )}

            <Pagination page={page} perPage={perPage} total={totalItems} onPageChange={handlePageChange} onPerPageChange={handlePerPageChange} loading={loading} noun="customers" />
          </div>
        </>
      )}

      {/* Credentials Modal */}
      {credentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setCredentialsModal(null)}>
          <div className="card p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">PPPoE Credentials</h3>
              <button onClick={() => setCredentialsModal(null)} className="p-1 rounded-md hover:bg-background-tertiary text-foreground-muted">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-foreground-muted">{credentialsModal.customer_name}</p>
            <div className="space-y-3">
              <div className="bg-background-tertiary rounded-lg p-3">
                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Username</label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-sm text-foreground">{credentialsModal.pppoe_username}</span>
                  <button onClick={() => copyToClipboard(credentialsModal.pppoe_username, 'Username')} className="p-1.5 rounded-md hover:bg-background-secondary transition-colors text-foreground-muted hover:text-foreground">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="bg-background-tertiary rounded-lg p-3">
                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Password</label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-sm text-foreground">{credentialsModal.pppoe_password}</span>
                  <button onClick={() => copyToClipboard(credentialsModal.pppoe_password, 'Password')} className="p-1.5 rounded-md hover:bg-background-secondary transition-colors text-foreground-muted hover:text-foreground">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                copyToClipboard(`Username: ${credentialsModal.pppoe_username}\nPassword: ${credentialsModal.pppoe_password}`, 'Credentials');
              }}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy All
            </button>
          </div>
        </div>
      )}

      {/* Activate Modal */}
      {activateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setActivateModal(null)}>
          <div className="card p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">Activate PPPoE</h3>
            <p className="text-sm text-foreground-muted">
              Activate <span className="font-medium text-foreground">{activateModal.name}</span> &mdash; records payment, sets expiry, and provisions the secret on the router.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1.5">Payment Method</label>
                <select
                  value={activateForm.payment_method}
                  onChange={(e) => setActivateForm((f) => ({ ...f, payment_method: e.target.value as ActivatePPPoERequest['payment_method'] }))}
                  className="select"
                >
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="voucher">Voucher</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1.5">Payment Reference</label>
                <input
                  type="text"
                  value={activateForm.payment_reference || ''}
                  onChange={(e) => setActivateForm((f) => ({ ...f, payment_reference: e.target.value }))}
                  className="input"
                  placeholder="Receipt number (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1.5">Notes</label>
                <input
                  type="text"
                  value={activateForm.notes || ''}
                  onChange={(e) => setActivateForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input"
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setActivateModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleActivate} disabled={actionLoading} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                ) : (
                  'Activate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirm Modal */}
      {deactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeactivateConfirm(null)}>
          <div className="card p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">Deactivate PPPoE</h3>
            <p className="text-sm text-foreground-muted">
              This will disconnect <span className="font-medium text-foreground">{deactivateConfirm.name}</span>&apos;s active session and remove the PPPoE secret from the router.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeactivateConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleDeactivate}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-danger text-white hover:bg-danger/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Deactivate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile FAB - Register Customer */}
      <Link
        href="/customers/register"
        className="md:hidden fixed right-4 bottom-24 z-[9998] w-14 h-14 rounded-full bg-accent-primary text-white flex items-center justify-center shadow-lg shadow-accent-primary/25 active:scale-95 transition-transform touch-manipulation"
        title="Register Customer"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </Link>

      {/* Delete Customer Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="card p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 mx-auto rounded-full bg-danger/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground text-center">Delete Customer</h3>
            <p className="text-sm text-foreground-muted text-center">
              Are you sure you want to delete <span className="font-medium text-foreground">{deleteConfirm.name}</span>? This action cannot be undone.
              {getConnectionType(deleteConfirm) === 'pppoe' && ' Any active PPPoE session will be de-provisioned from the router.'}
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleDeleteCustomer}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-danger text-white hover:bg-danger/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleteLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
