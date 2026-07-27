'use client';

import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatKES } from '../../lib/format';
import {
  EarningsChartPoint, EarningsSourceKey, SOURCE_COLORS, SOURCE_LABELS,
  TOTAL_COLOR, sourceSwatchStyle,
} from './earningsChartData';

const formatCompact = (amount: number): string => {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return String(Math.round(amount));
};

const axisTick = { fontSize: 10, fill: 'var(--color-foreground-muted)' };

function EarningsTooltip({
  active, payload, label, showTotal,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
  showTotal: boolean;
}) {
  if (!active || !payload?.length) return null;

  const value = (key: string) => {
    const hit = payload.find((entry) => String(entry.dataKey) === key);
    return hit ? Number(hit.value) || 0 : null;
  };
  const rows: { key: EarningsSourceKey; value: number }[] = [];
  for (const key of ['system', 'reseller'] as const) {
    const v = value(key);
    if (v !== null) rows.push({ key, value: v });
  }
  const total = value('total');

  return (
    <div className="rounded-xl border border-border bg-background-secondary px-3 py-2 shadow-lg">
      <p className="text-[10px] text-foreground-muted mb-1.5">{label}</p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-2 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={sourceSwatchStyle(row.key)} />
            <span className="text-foreground-muted flex-1 whitespace-nowrap">{SOURCE_LABELS[row.key]}</span>
            <span className="text-foreground font-medium tabular-nums">{formatKES(row.value)}</span>
          </div>
        ))}
      </div>
      {showTotal && total !== null && (
        <div className="mt-1.5 pt-1.5 border-t border-border flex items-center justify-between gap-4 text-[11px]">
          <span className="text-foreground-muted">Total</span>
          <span className="text-foreground font-semibold tabular-nums">{formatKES(total)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * System sales against our own reseller business over time, with the combined
 * total on top. `hidden` drops a line without repainting the survivors — a
 * business keeps its colour however the chart is filtered.
 */
export default function EarningsChart({
  data,
  hidden,
  showTotal = true,
  height = 300,
  compact = false,
}: {
  data: EarningsChartPoint[];
  hidden?: Set<EarningsSourceKey | 'total'>;
  showTotal?: boolean;
  height?: number;
  compact?: boolean;
}) {
  const off = hidden ?? new Set<EarningsSourceKey | 'total'>();
  const totalVisible = showTotal && !off.has('total');

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={compact ? false : axisTick}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
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
          cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
          content={<EarningsTooltip showTotal={totalVisible} />}
        />
        {/* Total sits underneath the two sources so the comparison stays on top. */}
        {totalVisible && (
          <Line
            type="monotone"
            dataKey="total"
            stroke={TOTAL_COLOR}
            strokeWidth={2.5}
            strokeOpacity={0.35}
            dot={false}
            activeDot={{ r: 4 }}
          />
        )}
        {(['system', 'reseller'] as const).map((key) => (
          off.has(key) ? null : (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={SOURCE_COLORS[key]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--color-background-secondary)' }}
            />
          )
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
