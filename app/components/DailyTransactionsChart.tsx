'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { api } from '../lib/api';
import { formatKES, formatKESCompact } from '../lib/format';
import {
  DailyTransactionsPeriod,
  DailyTransactionsResponse,
  TransactionPaymentMethod,
  TransactionStatusFilter,
} from '../lib/types';

const PERIOD_OPTIONS: { value: DailyTransactionsPeriod; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
];

const PAYMENT_METHOD_OPTIONS: { value: '' | TransactionPaymentMethod; label: string }[] = [
  { value: '', label: 'All methods' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS: { value: TransactionStatusFilter; label: string }[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'all', label: 'All' },
];



function TxTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: { transactions: number; revenue: number } }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-sm min-w-[160px]">
      <p className="text-foreground-muted text-xs mb-2">{label}</p>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-indigo-400" />
        <span className="text-foreground-muted text-xs">Transactions:</span>
        <span className="font-semibold text-foreground text-xs ml-auto">{row.transactions}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-foreground-muted text-xs">Revenue:</span>
        <span className="font-semibold text-foreground text-xs ml-auto">{formatKES(row.revenue)}</span>
      </div>
    </div>
  );
}

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

interface Props {
  routerId?: number | null;
  enabled?: boolean;
}

export default function DailyTransactionsChart({ routerId, enabled = true }: Props) {
  const [data, setData] = useState<DailyTransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState<DailyTransactionsPeriod>('30d');
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isCustomActive, setIsCustomActive] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'' | TransactionPaymentMethod>('');
  const [status, setStatus] = useState<TransactionStatusFilter>('completed');
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(
    async (opts: { period?: DailyTransactionsPeriod; startDate?: string; endDate?: string }) => {
      try {
        setLoading(true);
        setError(null);
        const result = await api.getTransactionsDaily({
          ...opts,
          routerId: routerId ?? undefined,
          paymentMethod: paymentMethod || undefined,
          status,
        });
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load daily transactions');
      } finally {
        setLoading(false);
      }
    },
    [routerId, paymentMethod, status]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(true);
      setError(null);
      setData(null);
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
  }, [enabled, period, isCustomActive, paymentMethod, status, routerId]);

  const handlePeriodClick = (p: DailyTransactionsPeriod) => {
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

  return (
    <div className="card p-4 sm:p-5 animate-fade-in" style={{ animationDelay: '0.24s', opacity: 0 }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap sm:flex-nowrap">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
            <span className="w-1.5 h-5 rounded-full bg-indigo-400 flex-shrink-0" />
            Daily Transactions
          </h3>
          {data && (
            <p className="text-[10px] text-foreground-muted mt-0.5 ml-3.5 truncate">
              {data.start_date} → {data.end_date} &middot; {data.status}
              {data.payment_method ? ` &middot; ${data.payment_method.replace('_', ' ')}` : ''}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`p-1.5 rounded-lg transition-colors ${
              showFilters || paymentMethod || status !== 'completed'
                ? 'bg-indigo-400/10 text-indigo-400'
                : 'text-foreground-muted hover:bg-background-tertiary'
            }`}
            title="Filters"
            aria-label="Toggle filters"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>

          {/* Period pills */}
          <div className="flex gap-1 p-1 bg-background-tertiary rounded-lg overflow-x-auto no-scrollbar">
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

      {/* Custom range */}
      {showCustom && (
        <div className="flex items-center gap-2 p-2 bg-background-tertiary rounded-lg animate-fade-in flex-wrap sm:flex-nowrap mb-3">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2 py-1.5 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400 flex-1 min-w-0"
          />
          <span className="text-foreground-muted text-sm flex-shrink-0">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2 py-1.5 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400 flex-1 min-w-0"
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

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-2 p-2 bg-background-tertiary rounded-lg animate-fade-in flex-wrap mb-3">
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as '' | TransactionPaymentMethod)}
            className="px-2 py-1.5 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400 flex-1 min-w-[140px]"
          >
            {PAYMENT_METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TransactionStatusFilter)}
            className="px-2 py-1.5 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400 flex-1 min-w-[120px]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {(paymentMethod || status !== 'completed') && (
            <button
              onClick={() => { setPaymentMethod(''); setStatus('completed'); }}
              className="text-xs text-foreground-muted hover:text-foreground transition-colors px-2 py-1.5 flex-shrink-0"
            >
              Reset
            </button>
          )}
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
          {/* Totals chips */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="rounded-xl bg-indigo-400/8 border border-indigo-400/15 p-2.5 sm:p-3">
              <p className="text-[10px] text-foreground-muted uppercase tracking-wider mb-0.5">Total</p>
              <p className="text-sm sm:text-base font-bold text-indigo-400">
                {data.totals.transactions.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/15 p-2.5 sm:p-3">
              <p className="text-[10px] text-foreground-muted uppercase tracking-wider mb-0.5">Revenue</p>
              <p className="text-sm sm:text-base font-bold text-emerald-500">{formatKESCompact(data.totals.revenue)}</p>
            </div>
            <div className="rounded-xl bg-amber-500/8 border border-amber-500/15 p-2.5 sm:p-3">
              <p className="text-[10px] text-foreground-muted uppercase tracking-wider mb-0.5">Avg / Active Day</p>
              <p className="text-sm sm:text-base font-bold text-amber-500">
                {data.totals.avg_transactions_per_active_day.toFixed(1)}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="h-56 sm:h-64 w-full">
            {data.data.length === 0 || data.totals.transactions === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <svg className="w-8 h-8 text-foreground-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-foreground-muted text-sm">No transactions in this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
                    width={32}
                  />
                  <Tooltip
                    content={<TxTooltip />}
                    cursor={{ fill: 'var(--background-tertiary)', opacity: 0.4 }}
                  />
                  <Bar dataKey="transactions" radius={[4, 4, 0, 0]}>
                    {data.data.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.transactions === 0 ? 'var(--border)' : '#818cf8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Footer line */}
          <div className="flex items-center justify-between mt-2 gap-3 flex-wrap">
            <div className="flex items-center gap-3 text-[10px] text-foreground-muted">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-400" /> Transactions
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-border" /> Zero days
              </span>
            </div>
            <p className="text-[10px] text-foreground-muted">
              {data.totals.active_days} active / {data.data.length} days &middot; avg {data.totals.avg_transactions_per_day.toFixed(1)}/day
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
