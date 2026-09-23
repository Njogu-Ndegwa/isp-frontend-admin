'use client';

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { OpsHealthHistoryPoint } from '../lib/types';

// Same tooltip chrome as app/admin/AdminCharts.tsx so the panel reads as one product.
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

// One hue per series, fixed. Status colours (good/serious) are reserved for
// status and never reused for an unrelated series.
const SERIES = {
  primary: 'var(--chart-1)',   // amber  - payments / provisioning
  good: '#10b981',             // emerald - delivered / online / removed
  serious: '#ef4444',          // red     - not delivered / offline / still active
  muted: '#a1a1aa',            // zinc    - stale / unknown
  secondary: 'var(--chart-2)', // cyan    - expiry
};

const axisTick = { fontSize: 10, fill: 'var(--color-foreground-muted)' };

function hhmm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dayHour(iso: string, bucketSeconds: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (bucketSeconds >= 86400) return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
  if (bucketSeconds >= 3600) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * One measure over the last 24 h. Small multiple: one axis, one hue, an area
 * under a 2px line, and a crosshair tooltip. Callers stack several of these
 * rather than putting two scales on one chart.
 */
export function TrendArea({ points, dataKey, label, color = SERIES.primary, unit = '' }: {
  points: OpsHealthHistoryPoint[];
  dataKey: keyof OpsHealthHistoryPoint;
  label: string;
  color?: string;
  unit?: string;
}) {
  const data = points.map((p) => ({ t: p.t, v: typeof p[dataKey] === 'number' ? (p[dataKey] as number) : null }));
  const numeric = data.filter((d) => d.v !== null);
  const latest = numeric.length ? numeric[numeric.length - 1].v : null;
  const gradId = `grad-${String(dataKey)}`;
  return (
    <div className="min-w-0" data-testid={`ops-trend-${String(dataKey)}`}>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <p className="text-xs font-medium text-foreground truncate">{label}</p>
        <p className="text-xs tabular-nums text-foreground-muted">{latest === null ? 'no data yet' : `now ${latest}${unit}`}</p>
      </div>
      {numeric.length < 2 ? (
        <div className="h-[120px] flex items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-foreground-muted">
          Building history — check back in a few minutes
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="t" tickFormatter={hhmm} tick={axisTick} axisLine={false} tickLine={false} minTickGap={40} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={48} />
            <Tooltip {...tooltipStyle} labelFormatter={(v) => hhmm(String(v))} formatter={(v) => [`${v}${unit}`, label]} />
            <Area type="monotone" dataKey="v" stroke={color} fill={`url(#${gradId})`} strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/** Routers per tunnel as horizontal stacked bars: online / offline / not reached. */
export function TunnelBars({ byTunnel, labels }: {
  byTunnel: Partial<Record<string, { online: number; offline: number; stale: number; total: number }>>;
  labels: Record<string, string>;
}) {
  const data = Object.entries(byTunnel)
    .filter(([, v]) => v && v.total > 0)
    .map(([k, v]) => ({ name: labels[k] ?? k, Online: v!.online, Offline: v!.offline, 'Not reached': v!.stale }));
  if (data.length === 0) return <p className="text-xs text-foreground-muted">No routers.</p>;
  return (
    <div data-testid="ops-tunnel-bars">
      <ResponsiveContainer width="100%" height={Math.max(90, data.length * 34 + 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barSize={16}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={{ ...axisTick, fill: 'var(--color-foreground)' }} axisLine={false} tickLine={false} width={72} />
          <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--color-background-tertiary)' }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="Online" stackId="a" fill={SERIES.good} stroke="var(--color-background-secondary)" strokeWidth={2} />
          <Bar dataKey="Offline" stackId="a" fill={SERIES.serious} stroke="var(--color-background-secondary)" strokeWidth={2} />
          <Bar dataKey="Not reached" stackId="a" fill={SERIES.muted} stroke="var(--color-background-secondary)" strokeWidth={2} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface TimelinePoint {
  t: string;
  delivered: number;
  not_delivered: number;
  pending: number;
  expired: number;
  removed: number;
  e2e_p95: number | null;
}

/** Payments per bucket, delivered vs not delivered, stacked. */
export function DeliveryTimeline({ points, bucketSeconds }: { points: TimelinePoint[]; bucketSeconds: number }) {
  const data = points.map((p) => ({ t: p.t, Delivered: p.delivered, 'Not delivered': p.not_delivered, 'Still trying': p.pending }));
  const any = data.some((d) => d.Delivered + d['Not delivered'] + d['Still trying'] > 0);
  if (!any) return <p className="text-xs text-foreground-muted py-4 text-center">No payments in this window.</p>;
  return (
    <div data-testid="ops-lookback-timeline">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -4, bottom: 0 }} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="t" tickFormatter={(v) => dayHour(String(v), bucketSeconds)} tick={axisTick} axisLine={false} tickLine={false} minTickGap={36} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={48} />
          <Tooltip {...tooltipStyle} labelFormatter={(v) => dayHour(String(v), bucketSeconds)} cursor={{ fill: 'var(--color-background-tertiary)' }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="Delivered" stackId="a" fill={SERIES.good} stroke="var(--color-background-secondary)" strokeWidth={1} />
          <Bar dataKey="Still trying" stackId="a" fill={SERIES.primary} stroke="var(--color-background-secondary)" strokeWidth={1} />
          <Bar dataKey="Not delivered" stackId="a" fill={SERIES.serious} stroke="var(--color-background-secondary)" strokeWidth={1} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Expired customers per bucket: removed vs still active, stacked. */
export function ExpiryTimeline({ points, bucketSeconds }: { points: TimelinePoint[]; bucketSeconds: number }) {
  const data = points.map((p) => ({ t: p.t, Removed: p.removed, 'Still active': Math.max(0, p.expired - p.removed) }));
  const any = data.some((d) => d.Removed + d['Still active'] > 0);
  if (!any) return <p className="text-xs text-foreground-muted py-4 text-center">No plans expired in this window.</p>;
  return (
    <div data-testid="ops-lookback-expiry-timeline">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -4, bottom: 0 }} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="t" tickFormatter={(v) => dayHour(String(v), bucketSeconds)} tick={axisTick} axisLine={false} tickLine={false} minTickGap={36} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={48} />
          <Tooltip {...tooltipStyle} labelFormatter={(v) => dayHour(String(v), bucketSeconds)} cursor={{ fill: 'var(--color-background-tertiary)' }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="Removed" stackId="a" fill={SERIES.secondary} stroke="var(--color-background-secondary)" strokeWidth={1} />
          <Bar dataKey="Still active" stackId="a" fill={SERIES.serious} stroke="var(--color-background-secondary)" strokeWidth={1} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** "How long until connected" per bucket (p95), one line. */
export function LatencyTimeline({ points, bucketSeconds }: { points: TimelinePoint[]; bucketSeconds: number }) {
  const data = points.map((p) => ({ t: p.t, v: p.e2e_p95 }));
  const any = data.some((d) => d.v !== null);
  if (!any) return null;
  return (
    <div data-testid="ops-lookback-latency-timeline">
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-e2e-p95" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={SERIES.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={SERIES.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="t" tickFormatter={(v) => dayHour(String(v), bucketSeconds)} tick={axisTick} axisLine={false} tickLine={false} minTickGap={36} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `${v}s`} />
          <Tooltip {...tooltipStyle} labelFormatter={(v) => dayHour(String(v), bucketSeconds)} formatter={(v) => [`${v}s`, 'Slowest 5% connected within']} />
          <Area type="monotone" dataKey="v" stroke={SERIES.primary} fill="url(#grad-e2e-p95)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
