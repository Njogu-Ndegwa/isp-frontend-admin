'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../lib/api';
import { AdminResellerStats, AdminResellerStatsPeriod } from '../lib/types';

const PERIOD_OPTIONS: { value: AdminResellerStatsPeriod; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
];

const formatKES = (amount: number): string => {
  if (amount >= 1_000_000) return `KES ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `KES ${(amount / 1_000).toFixed(0)}K`;
  return `KES ${amount.toLocaleString('en-KE')}`;
};

const formatKESFull = (amount: number): string => {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

function RevenueTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="text-foreground-muted text-xs mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-foreground-muted text-xs">
            {entry.dataKey === 'revenue' ? 'Revenue' : 'M-Pesa'}:
          </span>
          <span className="font-semibold text-foreground text-xs">{formatKESFull(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

function SignupsTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="text-foreground-muted text-xs mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-violet-500" />
        <span className="text-foreground-muted text-xs">New Resellers:</span>
        <span className="font-semibold text-foreground text-xs">{payload[0]?.value ?? 0}</span>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-background-tertiary rounded" />
        <div className="h-6 w-48 bg-background-tertiary rounded" />
      </div>
      <div className="h-48 sm:h-56 bg-background-tertiary/50 rounded-lg" />
    </div>
  );
}

export default function ResellerCharts() {
  const [stats, setStats] = useState<AdminResellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<AdminResellerStatsPeriod>('30d');

  const fetchStats = useCallback(async (p: AdminResellerStatsPeriod) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getAdminResellerStats(p);
      setStats(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(period);
  }, [fetchStats, period]);

  const handlePeriodChange = (p: AdminResellerStatsPeriod) => {
    setPeriod(p);
  };

  return (
    <div className="space-y-4 mb-6 animate-fade-in">
      {/* Period Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Analytics</h3>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handlePeriodChange(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                period === opt.value
                  ? 'bg-accent-primary text-background'
                  : 'bg-background-secondary text-foreground-muted hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="card p-6 text-center">
          <p className="text-danger text-sm mb-3">{error}</p>
          <button onClick={() => fetchStats(period)} className="btn-primary text-xs px-3 py-1.5">
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-4 sm:p-5"><ChartSkeleton /></div>
          <div className="card p-4 sm:p-5"><ChartSkeleton /></div>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue Over Time */}
          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-foreground">Revenue Over Time</h4>
              <div className="text-right">
                <p className="text-xs text-foreground-muted">Period Total</p>
                <p className="text-sm font-bold text-emerald-500">{formatKES(stats.totals.revenue)}</p>
              </div>
            </div>
            <p className="text-[10px] text-foreground-muted mb-3">
              M-Pesa: {formatKES(stats.totals.mpesa_revenue)} ({stats.totals.revenue > 0 ? Math.round((stats.totals.mpesa_revenue / stats.totals.revenue) * 100) : 0}%)
            </p>

            <div className="h-48 sm:h-56 w-full">
              {stats.revenue_over_time.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.revenue_over_time}
                    margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="mpesaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
                      interval="preserveStartEnd"
                      minTickGap={40}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
                      tickFormatter={(v) => formatKES(v)}
                      width={55}
                    />
                    <Tooltip
                      content={<RevenueTooltip />}
                      cursor={{ stroke: 'var(--border-hover)', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="mpesa_revenue"
                      stroke="#06b6d4"
                      strokeWidth={1.5}
                      fill="url(#mpesaGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-foreground-muted text-sm">
                  No revenue data for this period
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-foreground-muted">Total Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span className="text-[10px] text-foreground-muted">M-Pesa Revenue</span>
              </div>
            </div>
          </div>

          {/* New Resellers Sign-ups */}
          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-foreground">New Reseller Sign-ups</h4>
              <div className="text-right">
                <p className="text-xs text-foreground-muted">Period Total</p>
                <p className="text-sm font-bold text-violet-500">{stats.totals.new_resellers}</p>
              </div>
            </div>
            <p className="text-[10px] text-foreground-muted mb-3">
              New resellers registered during this period
            </p>

            <div className="h-48 sm:h-56 w-full">
              {stats.signups_over_time.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.signups_over_time}
                    margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
                      interval="preserveStartEnd"
                      minTickGap={40}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
                      allowDecimals={false}
                      width={30}
                    />
                    <Tooltip
                      content={<SignupsTooltip />}
                      cursor={{ fill: 'var(--border)', opacity: 0.3 }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-foreground-muted text-sm">
                  No sign-up data for this period
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                <span className="text-[10px] text-foreground-muted">New Resellers</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
