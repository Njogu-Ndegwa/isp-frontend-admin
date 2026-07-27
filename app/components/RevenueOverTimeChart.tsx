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
import {
  DailyTransactionsResponse,
  RevenueOverTimePeriod,
  RevenueOverTimeResponse,
} from '../lib/types';
import { formatKES, formatKESCompact } from '../lib/format';
import { portColor, PortRevenueTooltip } from './DailyTransactionsChart';

// ─── Period options ────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { value: RevenueOverTimePeriod; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
];

// ─── Formatters ────────────────────────────────────────────────────────────────



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
        <span className="font-semibold text-foreground text-xs ml-auto">{formatKES(rev.value)}</span>
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
  const [portData, setPortData] = useState<DailyTransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState<RevenueOverTimePeriod>('30d');
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isCustomActive, setIsCustomActive] = useState(false);
  const [byPort, setByPort] = useState(false);

  // Per-port revenue comes from the transactions-daily endpoint (always daily
  // buckets); the plain view keeps the adaptive daily/weekly/monthly grouping.
  const showByPort = byPort && routerId != null;

  const fetchData = useCallback(
    async (opts: { period?: RevenueOverTimePeriod; startDate?: string; endDate?: string }) => {
      try {
        setLoading(true);
        setError(null);
        if (byPort && routerId != null) {
          const result = await api.getTransactionsDaily({
            ...opts,
            routerId,
            byPort: true,
          });
          setPortData(result);
        } else {
          const result = await api.getRevenueOverTime({
            ...opts,
            routerId: routerId ?? undefined,
          });
          setData(result);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load revenue data');
      } finally {
        setLoading(false);
      }
    },
    [routerId, byPort]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(true);
      setError(null);
      setData(null);
      setPortData(null);
      return;
    }
    if (isCustomActive) {
      if (customStart && customEnd) {
        fetchData({ startDate: customStart, endDate: customEnd });
      }
    } else {
      fetchData({ period });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, period, isCustomActive, routerId, byPort]);

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
    <div className="card p-4 sm:p-5 animate-fade-in h-full" style={{ animationDelay: '0.22s', opacity: 0 }}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap sm:flex-nowrap">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
            <span className="w-1.5 h-5 rounded-full bg-emerald-500 flex-shrink-0" />
            Revenue Over Time
          </h3>
          {showByPort && portData ? (
            <p className="text-[10px] text-foreground-muted mt-0.5 ml-3.5">
              {portData.start_date} → {portData.end_date} &middot; by port &middot; daily
            </p>
          ) : data ? (
            <p className="text-[10px] text-foreground-muted mt-0.5 ml-3.5">
              {data.start_date} → {data.end_date} &middot; grouped {groupLabel}
            </p>
          ) : null}
        </div>

        {/* min-w-0 (not flex-shrink-0) so the period pills scroll on narrow phones
            instead of the added By-port pill pushing the row past the card edge */}
        <div className="flex items-center gap-2 min-w-0 max-w-full">
          {routerId != null && (
            <button
              onClick={() => setByPort((v) => !v)}
              className={`period-pill whitespace-nowrap flex-shrink-0 ${
                byPort ? 'period-pill-active' : 'period-pill-inactive'
              }`}
              title="Split revenue by the router port it was earned on"
            >
              By port
            </button>
          )}

          {/* Period selector */}
          <div className="flex gap-1 p-1 bg-background-tertiary rounded-lg overflow-x-auto no-scrollbar min-w-0">
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
      ) : showByPort && portData ? (
        <>
          {/* Summary stat chips (per-port mode) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/15 p-2.5 sm:p-3">
              <p className="text-[10px] text-foreground-muted uppercase tracking-wider mb-0.5">Total Revenue</p>
              <p className="text-sm sm:text-base font-bold text-emerald-500">{formatKESCompact(portData.totals.revenue)}</p>
            </div>
            <div className="rounded-xl bg-amber-500/8 border border-amber-500/15 p-2.5 sm:p-3">
              <p className="text-[10px] text-foreground-muted uppercase tracking-wider mb-0.5">Avg / Day</p>
              <p className="text-sm sm:text-base font-bold text-amber-500">
                {formatKESCompact(portData.totals.revenue / (portData.data.length || 1))}
              </p>
            </div>
            <div className="rounded-xl bg-indigo-500/8 border border-indigo-500/15 p-2.5 sm:p-3">
              <p className="text-[10px] text-foreground-muted uppercase tracking-wider mb-0.5">Transactions</p>
              <p className="text-sm sm:text-base font-bold text-indigo-400">{portData.totals.transactions.toLocaleString()}</p>
            </div>
          </div>

          {/* Stacked per-port revenue bars — each day's stack sums to that day's total */}
          <div className="h-56 sm:h-64 w-full">
            {portData.data.length === 0 || portData.totals.revenue === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <svg className="w-8 h-8 text-foreground-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-foreground-muted text-sm">No revenue data for this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={portData.data.map((d) => ({ label: d.label, ...(d.by_port ?? {}) }))}
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
                    tickFormatter={(v: number) => formatKESCompact(v)}
                    width={58}
                  />
                  <Tooltip
                    content={<PortRevenueTooltip portKeys={portData.port_keys ?? []} />}
                    cursor={{ fill: 'var(--background-tertiary)', opacity: 0.4 }}
                  />
                  {(portData.port_keys ?? []).map((port, i) => (
                    <Bar
                      key={port}
                      dataKey={port}
                      stackId="revenue"
                      fill={portColor(port, i)}
                      radius={i === (portData.port_keys?.length ?? 0) - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Port legend */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-foreground-muted flex-wrap">
            {(portData.port_keys ?? []).map((port, i) => (
              <span key={port} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: portColor(port, i) }} />
                <span className={port === 'unattributed' ? '' : 'font-mono'}>{port}</span>
              </span>
            ))}
          </div>
        </>
      ) : data ? (
        <>
          {/* Summary stat chips */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/15 p-2.5 sm:p-3">
              <p className="text-[10px] text-foreground-muted uppercase tracking-wider mb-0.5">Total Revenue</p>
              <p className="text-sm sm:text-base font-bold text-emerald-500">{formatKESCompact(data.totals.revenue)}</p>
            </div>
            <div className="rounded-xl bg-amber-500/8 border border-amber-500/15 p-2.5 sm:p-3">
              <p className="text-[10px] text-foreground-muted uppercase tracking-wider mb-0.5">
                Avg / {groupLabel === 'daily' ? 'Day' : groupLabel === 'weekly' ? 'Week' : 'Month'}
              </p>
              <p className="text-sm sm:text-base font-bold text-amber-500">
                {formatKESCompact(data.totals.avg_per_period)}
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
                    tickFormatter={(v) => formatKESCompact(v)}
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
