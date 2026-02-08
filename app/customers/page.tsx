'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Customer } from '../lib/types';
import { formatDateGMT3 } from '../lib/dateUtils';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import MobileDataCard from '../components/MobileDataCard';
import SearchInput from '../components/SearchInput';

type FilterStatus = 'all' | 'active' | 'inactive';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('active');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCustomers();
  }, [filter]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      let data: Customer[];
      if (filter === 'active') {
        data = await api.getActiveCustomers();
      } else {
        data = await api.getCustomers();
      }
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    // Apply status filter for inactive
    if (filter === 'inactive' && customer.status !== 'inactive') return false;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (customer.name?.toLowerCase() || '').includes(query) ||
        (customer.phone || '').includes(query) ||
        (customer.mac_address?.toLowerCase() || '').includes(query)
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
    if (hours < 1) return 'text-red-400';       // Critical: less than 1 hour
    if (hours < 6) return 'text-orange-400';     // Warning: less than 6 hours
    if (hours < 24) return 'text-amber-400';     // Caution: less than 24 hours
    return 'text-emerald-400';                   // Good: 24+ hours remaining
  };

  // Safe date formatting for customer expiry
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
          <button onClick={loadCustomers} className="btn-primary">
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
        subtitle={`Manage your ${customers.length} registered customers`} 
      />

      {/* Summary Stats */}
      {customers.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-6">
          <div className="animate-fade-in delay-1" style={{ opacity: 0 }}>
            <StatCard
              title="Total"
              value={customers.length}
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
              value={customers.filter((c) => c.status === 'active').length}
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
              value={customers.filter((c) => c.status === 'inactive').length}
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
      <div className="space-y-3 mb-6 animate-fade-in">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, phone, or MAC address..."
        />

        {/* Status Filter */}
        <div className="flex rounded-lg border border-border overflow-x-auto flex-shrink-0 no-scrollbar">
          {(['all', 'active', 'inactive'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-2 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                filter === status
                  ? 'bg-accent-primary text-background'
                  : 'bg-background-secondary text-foreground-muted hover:text-foreground'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <>

          {/* Desktop Table - Hidden on Mobile */}
          <div className="hidden md:block card animate-fade-in">
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>MAC Address</th>
                    <th>Plan</th>
                    <th>Router</th>
                    <th>Status</th>
                    <th>Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-foreground-muted py-12">
                        <svg className="w-12 h-12 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {searchQuery ? 'No customers match your search' : 'No customers found'}
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer, index) => (
                      <tr 
                        key={customer.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s`, opacity: 0 }}
                      >
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-medium text-sm">
                              {(customer.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-foreground">{customer.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="font-mono text-sm text-foreground-muted">{customer.phone || '-'}</td>
                        <td className="font-mono text-xs text-foreground-muted">{customer.mac_address || '-'}</td>
                        <td>
                          <div>
                            <p className="font-medium text-foreground">{customer.plan?.name || 'No Plan'}</p>
                            <p className="text-xs text-foreground-muted">KES {customer.plan?.price ?? '-'}</p>
                          </div>
                        </td>
                        <td className="text-foreground-muted">{customer.router?.name || '-'}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(customer.status)} capitalize`}>
                            {customer.status}
                          </span>
                        </td>
                        <td>
                          {customer.status === 'active' ? (
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
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

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
                  subtitle={customer.phone || undefined}
                  avatar={{
                    text: (customer.name || '?').charAt(0).toUpperCase(),
                    color: 'primary'
                  }}
                  status={{
                    label: customer.status,
                    variant: customer.status === 'active' ? 'success' : customer.status === 'expired' ? 'danger' : 'neutral'
                  }}
                  value={{
                    text: customer.plan?.name || 'No Plan'
                  }}
                  secondary={{
                    left: customer.router?.name || '-',
                    right: customer.status === 'active' && customer.hours_remaining !== undefined 
                      ? <span className={`font-medium ${getTimeRemainingColor(customer.hours_remaining)}`}>{formatTimeRemaining(customer.hours_remaining)}</span>
                      : formatCustomerExpiry(customer.expiry)
                  }}
                  layout="compact"
                  className="animate-fade-in"
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}






