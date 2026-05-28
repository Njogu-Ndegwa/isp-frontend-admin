'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../lib/api';
import { RevenueOverTimePeriod, RevenueOverTimeResponse } from '../lib/types';

// ─── Period options ────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { value: RevenueOverTimePeriod; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
];

// ─── Formatters ────────────────────────────────────────────────────────────────

const formatKES = (amount: number): string => {
  if (amount >= 1_000_000) return `KES ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `KES ${(amount / 1_000).toFixed(0)}K`;
  return `KES ${amount.toLocaleString('en-KE')}`;
};

const formatKESFull = (amount: number): string =>
  `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ─── Tooltip ───────────────────────────────────────────────────────────────────

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const rev = payload.find((p) => p.dataKey === 'revenue');
  const tx = payload.find((p) => p.dataKey === 'transactions');
  if (!rev) return null;
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-sm min-w-[140px]">
      <p className="text-foreground-muted text-xs mb-2">{label}</p>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-foreground-muted text-xs">Revenue:</span>
        <span className="font-semibold text-foreground text-xs ml-auto">{formatKESFull(rev.value)}</span>
      </div>
      {tx && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-foreground-muted text-xs">Transactions:</span>
          <span className="font-semibold text-foreground text-xs ml-auto">{tx.value}</span>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 bg-background-tertiary rounded" />
        <div className="h-6 w-56 bg-background-tertiary rounded" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-background-tertiary/50 rounded-xl" />
        ))}
      </div>
      <div className="h-56 bg-background-tertiary/50 rounded-lg" />
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  routerId?: number | null;
  enabled?: boolean;
}

export default function RevenueOverTimeChart({ routerId, enabled = true }: Props) {
  const [data, setData] = useState<RevenueOverTimeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState<RevenueOverTimePeriod>('30d');
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isCustomActive, setIsCustomActive] = useState(false);

  const fetchData = useCallback(
    async (opts: { period?: RevenueOverTimePeriod; startDate?: string; endDate?: string }) => {
      try {
        setLoading(true);
        setError(null);
        const result = await api.getRevenueOverTime({
          ...opts,
          routerId: routerId ?? undefined,
        });
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load revenue data');
      } finally {
        setLoading(false);
      }
    },
    [routerId]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(true);
      setError(null);
      setData(null);
      return;
    }

    if (!isCustomActive) {
      fetchData({ period });
    }
  }, [enabled, fetchData, period, isCustomActive]);

  const handlePeriodClick = (p: RevenueOverTimePeriod) => {
    setPeriod(p);
    setIsCustomActive(false);
    setShowCustom(false);
  };

  const applyCustomRange = () => {
    if (!customStart || !customEnd) return;
    setIsCustomActive(true);
    setShowCustom(false);
    fetchData({ startDate: customStart, endDate: customEnd });
  };

  const groupLabel = data
    ? { daily: 'daily', weekly: 'weekly', monthly: 'monthly' }[data.group_by]
    : '';

  return (
    <div className="card p-4 sm:p-5 animate-fade-in" style={{ animationDelay: '0.22s', opacity: 0 }}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap sm:flex-nowrap">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
            <span className="w-1.5 h-5 rounded-full bg-emerald-500 flex-shrink-0" />
            Revenue Over Time
          </h3>
          {data && (
            <p className="text-[10px] text-foreground-muted mt-0.5 ml-3.5">
              {data.start_date} → {data.end_date} &middot; grouped {groupLabel}
            </p>
          )}
        </div>

        {/* Period selector */}
        <div className="flex gap-1 p-1 bg-background-tertiary rounded-lg overflow-x-auto no-scrollbar flex-shrink-0">
          {PERIOD_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handlePeriodClick(value)}
              className={`period-pill whitespace-nowrap flex-shrink-0 ${
                period === value && !isCustomActive && !showCustom
                  ? 'period-pill-active'
                  : 'period-pill-inactive'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => {
              setShowCustom((v) => !v);
              if (!showCustom) setIsCustomActive(false);
            }}
            className={`period-pill whitespace-nowrap flex-shrink-0 ${
              isCustomActive || showCustom ? 'period-pill-active' : 'period-pill-inactive'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {/* Custom date range picker */}
      {showCustom && (
        <div className="flex items-center gap-2 p-2 bg-background-tertiary rounded-lg animate-fade-in flex-wrap sm:flex-nowrap mb-3">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2 py-1.5 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 flex-1 min-w-0"
          />
          <span className="text-foreground-muted text-sm flex-shrink-0">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2 py-1.5 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 flex-1 min-w-0"
          />
          <button
            onClick={applyCustomRange}
            disabled={!customStart || !customEnd}
            className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            Apply
          </button>
        </div>
      )}

      {/* Body */}
      {error ? (
        <div className="py-8 text-center">
          <p className="text-danger text-sm mb-3">{error}</p>
          <button
            onClick={() =>
              isCustomActive
                ? fetchData({ startDate: customStart, endDate: customEnd })
                : fetchData({ period })
            }
            className="btn-primary text-xs px-3 py-1.5"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <ChartSkeleton />
      ) : data ? (
        <>
          {/* Summary stat chips */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/15 p-2.5 sm:p-3">
              <p className="text-[10px] text-foreground-muted uppercase tracking-wider mb-0.5">Total Revenue</p>
              <p className="text-sm sm:text-base font-bold text-emerald-500">{formatKES(data.totals.revenue)}</p>
            </div>
            <div className="rounded-xl bg-amber-500/8 border border-amber-500/15 p-2.5 sm:p-3">
              <p className="text-[10px] text-foreground-muted uppercase tracking-wider mb-0.5">
                Avg / {groupLabel === 'daily' ? 'Day' : groupLabel === 'weekly' ? 'Week' : 'Month'}
              </p>
              <p className="text-sm sm:text-base font-bold text-amber-500">
                {formatKES(data.totals.avg_per_period)}
              </p>
            </div>
            <div className="rounded-xl bg-indigo-500/8 border border-indigo-500/15 p-2.5 sm:p-3">
              <p className="text-[10px] text-foreground-muted uppercase tracking-wider mb-0.5">Transactions</p>
              <p className="text-sm sm:text-base font-bold text-indigo-400">{data.totals.transactions.toLocaleString()}</p>
            </div>
          </div>

          {/* Chart */}
          <div className="h-56 sm:h-64 w-full">
            {data.data.length === 0 || data.totals.revenue === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <svg className="w-8 h-8 text-foreground-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-foreground-muted text-sm">No revenue data for this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rotRevGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                    width={58}
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
                    fill="url(#rotRevGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  />
                  {/* Invisible — only here so the tooltip can read the transaction count */}
                  <Area
                    type="monotone"
                    dataKey="transactions"
                    stroke="transparent"
                    fill="transparent"
                    dot={false}
                    activeDot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-foreground-muted">Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-[10px] text-foreground-muted">Transactions (hover)</span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
