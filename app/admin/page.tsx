'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { AdminDashboard } from '../lib/types';
import { formatDateGMT3 } from '../lib/dateUtils';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import MobileDataCard from '../components/MobileDataCard';
import { SkeletonCard } from '../components/LoadingSpinner';

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

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getAdminDashboard();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

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

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Header
        title="Admin Dashboard"
        subtitle="Platform overview across all resellers"
        action={
          <Link href="/admin/resellers" className="btn-primary text-sm px-4 py-2">
            View Resellers
          </Link>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-danger mb-4">{error}</p>
          <button onClick={fetchDashboard} className="btn-primary px-4 py-2 text-sm">Retry</button>
        </div>
      ) : data ? (
        <>
          {/* Primary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Resellers"
              value={data.resellers.total}
              subtitle={`${data.resellers.active_last_30_days} active (30d)`}
              accent="primary"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
            />
            <StatCard
              title="Total Revenue"
              value={formatKES(data.revenue.all_time)}
              subtitle={`M-Pesa: ${formatKES(data.revenue.all_time_mpesa)}`}
              accent="success"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              title="Customers"
              value={data.customers.total.toLocaleString()}
              subtitle={`${data.customers.active.toLocaleString()} active`}
              accent="info"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
            <StatCard
              title="Routers"
              value={data.routers.total}
              subtitle={`${data.routers.online} online, ${data.routers.offline} offline`}
              accent={data.routers.offline > 0 ? 'warning' : 'success'}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>}
            />
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'Today', value: data.revenue.today, mpesa: data.revenue.today_mpesa },
              { label: 'This Week', value: data.revenue.this_week, mpesa: data.revenue.this_week_mpesa },
              { label: 'This Month', value: data.revenue.this_month, mpesa: data.revenue.this_month_mpesa },
              { label: 'All Time', value: data.revenue.all_time, mpesa: data.revenue.all_time_mpesa },
            ].map((item) => (
              <div key={item.label} className="card p-4">
                <p className="text-[10px] sm:text-xs text-foreground-muted uppercase tracking-wider mb-1">{item.label}</p>
                <p className="text-lg sm:text-xl font-bold text-foreground">{formatKES(item.value)}</p>
                <p className="text-xs text-emerald-500 mt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
                    M-Pesa: {formatKES(item.mpesa)}
                  </span>
                </p>
              </div>
            ))}
          </div>

          {/* Payouts Overview */}
          <div className="card p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Payouts Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-foreground-muted mb-1">Total Paid Out</p>
                <p className="text-lg font-bold text-emerald-500">{formatKES(data.payouts.total_paid)}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted mb-1">Unpaid Balance</p>
                <p className="text-lg font-bold text-amber-500">{formatKES(data.payouts.total_unpaid)}</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3">
              <div className="w-full h-2 bg-background-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${data.payouts.total_paid + data.payouts.total_unpaid > 0 ? (data.payouts.total_paid / (data.payouts.total_paid + data.payouts.total_unpaid)) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-foreground-muted mt-1">
                {Math.round((data.payouts.total_paid / (data.payouts.total_paid + data.payouts.total_unpaid || 1)) * 100)}% paid out
              </p>
            </div>
          </div>

          {/* Top Resellers This Month */}
          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Top Resellers This Month</h3>
              <Link href="/admin/resellers" className="text-xs text-accent-primary hover:underline">View all</Link>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block">
              <DataTable
                columns={[
                  { key: 'rank', label: '#', className: 'w-[50px]' },
                  { key: 'organization', label: 'Organization' },
                  { key: 'email', label: 'Email' },
                  { key: 'revenue', label: 'Revenue', className: 'text-right' },
                ]}
                data={data.top_resellers_this_month}
                rowKey={(item) => item.id}
                renderCell={(item, col) => {
                  const idx = data.top_resellers_this_month.indexOf(item);
                  switch (col) {
                    case 'rank': return <span className="text-foreground-muted">{idx + 1}</span>;
                    case 'organization': return <span className="font-medium">{item.organization_name}</span>;
                    case 'email': return <span className="text-foreground-muted text-sm">{item.email}</span>;
                    case 'revenue': return <span className="font-semibold text-emerald-500">{formatKES(item.month_revenue)}</span>;
                    default: return null;
                  }
                }}
                onRowClick={(item) => { window.location.href = `/admin/resellers/${item.id}`; }}
                emptyState={{ message: 'No reseller data for this month' }}
              />
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
              {data.top_resellers_this_month.map((r, idx) => (
                <MobileDataCard
                  key={r.id}
                  id={r.id}
                  title={r.organization_name}
                  subtitle={r.email}
                  avatar={{ text: `#${idx + 1}`, color: idx === 0 ? 'primary' : idx === 1 ? 'secondary' : 'info' }}
                  value={{ text: formatKES(r.month_revenue) }}
                  layout="compact"
                  href={`/admin/resellers/${r.id}`}
                />
              ))}
              {data.top_resellers_this_month.length === 0 && (
                <p className="text-sm text-foreground-muted text-center py-4">No reseller data for this month</p>
              )}
            </div>
          </div>

          {/* Recent Signups */}
          <div className="card p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Recent Signups</h3>
            {data.recent_signups.length > 0 ? (
              <div className="space-y-3">
                {data.recent_signups.map((s) => (
                  <Link
                    key={s.id}
                    href={`/admin/resellers/${s.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-background-tertiary/50 hover:bg-background-tertiary transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-accent-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-accent-primary">
                        {s.organization_name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.organization_name}</p>
                      <p className="text-xs text-foreground-muted truncate">{s.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-foreground-muted">{formatSafeDate(s.created_at)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-muted text-center py-4">No recent signups</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
