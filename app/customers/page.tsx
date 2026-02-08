'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Customer } from '../lib/types';
import { formatDateGMT3 } from '../lib/dateUtils';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import SwipeableCard from '../components/SwipeableCard';
import PullToRefresh from '../components/PullToRefresh';

type FilterStatus = 'all' | 'active' | 'inactive';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6 animate-fade-in">
        {/* Search */}
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, phone, or MAC address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['all', 'active', 'inactive'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                filter === status
                  ? 'bg-accent-primary text-background'
                  : 'bg-background-secondary text-foreground-muted hover:text-foreground'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Refresh Button */}
        <button onClick={loadCustomers} className="btn-secondary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent-primary/10 text-accent-primary">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-foreground-muted text-sm">Total</p>
                <p className="text-2xl font-bold text-foreground">{customers.length}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10 text-success">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-foreground-muted text-sm">Active</p>
                <p className="text-2xl font-bold text-success">
                  {customers.filter((c) => c.status === 'active').length}
                </p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-foreground-muted/10 text-foreground-muted">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <p className="text-foreground-muted text-sm">Inactive</p>
                <p className="text-2xl font-bold text-foreground">
                  {customers.filter((c) => c.status === 'inactive').length}
                </p>
              </div>
            </div>
          </div>

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
                                <p className="text-xs text-accent-primary">
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

          {/* Mobile Cards - Pull to Refresh */}
          <div className="md:hidden">
            <PullToRefresh onRefresh={loadCustomers} className="min-h-[400px]">
              {filteredCustomers.length === 0 ? (
                <div className="card p-8 text-center text-foreground-muted">
                  <svg className="w-12 h-12 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {searchQuery ? 'No customers match your search' : 'No customers found'}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCustomers.map((customer, index) => (
                    <SwipeableCard
                      key={customer.id}
                      onEdit={() => console.log('Edit customer', customer.id)}
                      onDelete={() => console.log('Delete customer', customer.id)}
                      className="animate-fade-in"
                    >
                      <div 
                        className="p-4"
                        style={{ animationDelay: `${index * 0.05}s`, opacity: 0 }}
                      >
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-medium flex-shrink-0">
                            {(customer.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate">{customer.name || 'Unknown'}</h3>
                            <span className={`badge ${getStatusBadge(customer.status)} text-xs capitalize`}>
                              {customer.status}
                            </span>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-border mb-3" />

                        {/* Details */}
                        <div className="space-y-2 text-sm">
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-foreground-muted">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span className="font-mono">{customer.phone}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-foreground-muted">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>{customer.plan?.name || 'No Plan'}</span>
                          </div>

                          <div className="flex items-center gap-2 text-foreground-muted">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                            </svg>
                            <span>{customer.router?.name || '-'}</span>
                          </div>

                          {customer.status === 'active' && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 flex-shrink-0 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-accent-primary">
                                {formatTimeRemaining(customer.hours_remaining)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </SwipeableCard>
                  ))}
                </div>
              )}
            </PullToRefresh>
          </div>
        </>
      )}
    </div>
  );
}






