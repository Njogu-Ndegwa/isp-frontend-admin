'use client';

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { OvesHistoryPoint } from '../lib/types';

// Same tooltip chrome as OpsHealthCharts / AdminCharts so the dashboard reads as one product.
const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--color-background-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    fontSize: '11px',
    padding: '8px 12px',
  },
  labelStyle: { color: 'var(--color-foreground-muted)', fontSize: '10px', marginBottom: '4px' },
};

export const OVES_SERIES = {
  good: '#10b981',
  serious: '#ef4444',
  primary: 'var(--chart-1)',
  info: 'var(--chart-2)',
  violet: 'var(--chart-4)',
};

const axisTick = { fontSize: 10, fill: 'var(--color-foreground-muted)' };

function tickLabel(iso: string, bucketMinutes: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (bucketMinutes >= 60) {
    return `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit' })}`;
  }
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Empty({ text = 'Building history — check back in a few minutes' }: { text?: string }) {
  return (
    <div className="h-[140px] flex items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-foreground-muted text-center px-4">
      {text}
    </div>
  );
}

/** Codes per bucket: successes and failures stacked, so volume and failure share read together. */
export function CodesBars({ points, bucketMinutes }: { points: OvesHistoryPoint[]; bucketMinutes: number }) {
  const data = points.map((p) => ({ t: p.t, ok: p.codes_ok ?? 0, failed: p.codes_failed ?? 0 }));
  const any = data.some((d) => d.ok || d.failed);
  return (
    <div className="min-w-0" data-testid="oves-chart-codes">
      <p className="text-xs font-medium text-foreground mb-1">Codes generated</p>
      {!any ? <Empty text="No codes in this window yet" /> : (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap={1}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="t" tick={axisTick} tickFormatter={(v) => tickLabel(v, bucketMinutes)} minTickGap={40} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} width={36} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} labelFormatter={(v) => tickLabel(String(v), bucketMinutes)} cursor={{ fill: 'var(--color-background-tertiary)' }} />
            <Bar dataKey="ok" name="Succeeded" stackId="c" fill={OVES_SERIES.good} isAnimationActive={false} />
            <Bar dataKey="failed" name="Failed" stackId="c" fill={OVES_SERIES.serious} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/** One measure, one axis, one hue. Stack several rather than mixing scales on one chart. */
export function MetricArea({
  points, dataKey, label, bucketMinutes, color = OVES_SERIES.primary, unit = '', scale = 1,
  digits = 0, threshold, domainMax,
}: {
  points: OvesHistoryPoint[];
  dataKey: string;
  label: string;
  bucketMinutes: number;
  color?: string;
  unit?: string;
  scale?: number;
  digits?: number;
  threshold?: number;
  domainMax?: number;
}) {
  const data = points.map((p) => {
    const raw = p[dataKey];
    return { t: p.t, v: typeof raw === 'number' ? Number((raw * scale).toFixed(digits)) : null };
  });
  const numeric = data.filter((d) => d.v !== null);
  const latest = numeric.length ? numeric[numeric.length - 1].v : null;
  const gradId = `oves-grad-${dataKey}`;
  return (
    <div className="min-w-0" data-testid={`oves-chart-${dataKey}`}>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <p className="text-xs font-medium text-foreground truncate">{label}</p>
        <p className="text-xs tabular-nums text-foreground-muted">{latest === null ? 'no data yet' : `latest ${latest}${unit}`}</p>
      </div>
      {numeric.length < 2 ? <Empty /> : (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="t" tick={axisTick} tickFormatter={(v) => tickLabel(v, bucketMinutes)} minTickGap={40} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} width={36} axisLine={false} tickLine={false} domain={[0, domainMax ?? 'auto']} />
            <Tooltip {...tooltipStyle} labelFormatter={(v) => tickLabel(String(v), bucketMinutes)} formatter={(v) => [`${v}${unit}`, label]} />
            {threshold !== undefined && <ReferenceLine y={threshold} stroke={OVES_SERIES.serious} strokeDasharray="4 4" strokeOpacity={0.6} />}
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} connectNulls isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

type GqlPoint = { t: string; requests: number; errors: number; error_rate: number | null };

/** Requests per bucket split into succeeded / failed (Studio's request-rate chart). */
export function GqlRequestBars({ series, bucketMinutes }: { series: GqlPoint[]; bucketMinutes: number }) {
  const data = series.map((p) => ({ t: p.t, ok: Math.max(0, p.requests - p.errors), failed: p.errors }));
  const any = data.some((d) => d.ok || d.failed);
  return (
    <div className="min-w-0" data-testid="oves-gql-requests">
      <p className="text-xs font-medium text-foreground mb-1">Requests</p>
      {!any ? <Empty text="No requests in this window" /> : (
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap={1}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="t" tick={axisTick} tickFormatter={(v) => tickLabel(v, bucketMinutes)} minTickGap={40} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} width={40} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} labelFormatter={(v) => tickLabel(String(v), bucketMinutes)} cursor={{ fill: 'var(--color-background-tertiary)' }} />
            <Bar dataKey="ok" name="Succeeded" stackId="r" fill={OVES_SERIES.good} isAnimationActive={false} />
            <Bar dataKey="failed" name="With errors" stackId="r" fill={OVES_SERIES.serious} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/** Error rate per bucket, as a percentage of requests. */
export function GqlErrorRate({ series, bucketMinutes }: { series: GqlPoint[]; bucketMinutes: number }) {
  const data = series.map((p) => ({ t: p.t, v: p.error_rate === null ? null : Number((p.error_rate * 100).toFixed(2)) }));
  const numeric = data.filter((d) => d.v !== null);
  return (
    <div className="min-w-0" data-testid="oves-gql-error-rate">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <p className="text-xs font-medium text-foreground">Error rate</p>
        <p className="text-xs tabular-nums text-foreground-muted">{numeric.length ? `latest ${numeric[numeric.length - 1].v}%` : 'no data'}</p>
      </div>
      {numeric.length < 2 ? <Empty text="Not enough requests to chart" /> : (
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="oves-gql-rate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={OVES_SERIES.serious} stopOpacity={0.3} />
                <stop offset="95%" stopColor={OVES_SERIES.serious} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="t" tick={axisTick} tickFormatter={(v) => tickLabel(v, bucketMinutes)} minTickGap={40} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} width={40} axisLine={false} tickLine={false} unit="%" domain={[0, 'auto']} />
            <Tooltip {...tooltipStyle} labelFormatter={(v) => tickLabel(String(v), bucketMinutes)} formatter={(v) => [`${v}%`, 'Error rate']} />
            <Area type="monotone" dataKey="v" stroke={OVES_SERIES.serious} strokeWidth={2} fill="url(#oves-gql-rate)" connectNulls isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
