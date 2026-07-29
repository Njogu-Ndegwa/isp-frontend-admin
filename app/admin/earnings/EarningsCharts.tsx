'use client';

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatKES } from '../../lib/format';
import {
  EarningsChartPoint, SOURCE_COLORS, SOURCE_LABELS, TOTAL_COLOR, sourceSwatchStyle,
} from './earningsChartData';

const formatCompact = (amount: number): string => {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return String(Math.round(amount));
};

const axisTick = { fontSize: 10, fill: 'var(--color-foreground-muted)' };

function EarningsTooltip({
  active, payload, label, cumulative,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
  cumulative?: boolean;
}) {
  if (!active || !payload?.length) return null;

  // Read the bucket off the datum, not the plotted series. The bar view plots
  // no `runningTotal` series, so a dataKey lookup silently returned 0 and the
  // tooltip claimed a running total of zero halfway through the month.
  const point = (payload[0]?.payload ?? {}) as Partial<EarningsChartPoint>;
  const system = Number(point.system) || 0;
  const reseller = Number(point.reseller) || 0;
  const runningTotal = Number(point.runningTotal) || 0;

  return (
    <div className="rounded-lg border border-border bg-background-secondary px-2.5 py-2 shadow-lg text-[11px]">
      <p className="text-[10px] text-foreground-muted mb-1">{label}</p>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm shrink-0" style={sourceSwatchStyle('system')} />
          <span className="text-foreground-muted flex-1">{SOURCE_LABELS.system}</span>
          <span className="text-foreground tabular-nums">{formatKES(system)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm shrink-0" style={sourceSwatchStyle('reseller')} />
          <span className="text-foreground-muted flex-1">{SOURCE_LABELS.reseller}</span>
          <span className="text-foreground tabular-nums">{formatKES(reseller)}</span>
        </div>
      </div>
      <div className="mt-1 pt-1 border-t border-border space-y-0.5">
        {/* The headline figure of the hover: both businesses combined. */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-foreground-muted">{cumulative ? 'Total' : 'Both, this day'}</span>
          <span className="text-foreground font-semibold tabular-nums">
            {formatKES(system + reseller)}
          </span>
        </div>
        {!cumulative && (
          <div className="flex items-center justify-between gap-3">
            {/* Period-agnostic: this tooltip also serves week/quarter/year. */}
            <span className="text-foreground-muted">Running total</span>
            <span className="text-foreground-muted tabular-nums">{formatKES(runningTotal)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Earnings over the period, split by which business brought the money in.
 *
 * Bars rather than lines because the income is lumpy — subscription payments
 * arrive as discrete lumps, so most days are zero and a line plunges to the
 * axis and back, producing a sawtooth that reads as noise. A quiet day should
 * be an absent bar, not a spike.
 *
 * Per-bucket and running-total are separate views rather than a bar/area
 * combination on one plot: over a month the running total reaches ~20x any
 * single day, so sharing an axis squashes the bars to a few pixels. Two
 * measures of that different a scale get their own axis, not a shared one.
 */
export default function EarningsChart({
  data,
  mode = 'bucket',
  height = 300,
  compact = false,
}: {
  data: EarningsChartPoint[];
  mode?: 'bucket' | 'cumulative';
  height?: number;
  compact?: boolean;
}) {
  const cumulative = mode === 'cumulative';

  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
      <XAxis
        dataKey="label"
        tick={compact ? false : axisTick}
        tickLine={false}
        axisLine={false}
        minTickGap={compact ? 40 : 24}
        height={compact ? 4 : undefined}
      />
      <YAxis
        tick={compact ? false : axisTick}
        tickLine={false}
        axisLine={false}
        tickFormatter={formatCompact}
        width={compact ? 0 : 48}
      />
      <Tooltip
        cursor={cumulative
          ? { stroke: 'var(--color-border)', strokeWidth: 1 }
          : { fill: 'var(--color-background-tertiary)', opacity: 0.4 }}
        content={<EarningsTooltip cumulative={cumulative} />}
      />
    </>
  );

  if (cumulative) {
    // Stacked running totals — the top edge is everything earned so far.
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {(['system', 'reseller'] as const).map((key) => (
              <linearGradient key={key} id={`earningsGrad-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={SOURCE_COLORS[key]} stopOpacity={0.5} />
                <stop offset="95%" stopColor={SOURCE_COLORS[key]} stopOpacity={0.12} />
              </linearGradient>
            ))}
          </defs>
          {axes}
          {(['system', 'reseller'] as const).map((key) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId="earnings"
              stroke={SOURCE_COLORS[key]}
              strokeWidth={2}
              fill={`url(#earningsGrad-${key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        {axes}
        {/* No seam stroke: bars are ~8px wide on a phone, and a 1px stroke on
            each edge eats the fill entirely. The two hues sit ~30 CVD-ΔE apart,
            so the boundary reads without one. */}
        <Bar
          dataKey="system"
          stackId="earnings"
          fill={SOURCE_COLORS.system}
          maxBarSize={compact ? 18 : 28}
        />
        <Bar
          dataKey="reseller"
          stackId="earnings"
          fill={SOURCE_COLORS.reseller}
          radius={[3, 3, 0, 0]}
          maxBarSize={compact ? 18 : 28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
