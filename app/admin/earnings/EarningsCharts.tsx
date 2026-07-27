'use client';

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { AdminEarningsPoint, AdminEarningsStream, AdminEarningsStreamKey } from '../../lib/types';
import { formatKES } from '../../lib/format';

/**
 * One categorical hue per revenue stream, in fixed stack order (ground up).
 * Validated for both light (#ffffff) and dark (#18181b) chart surfaces:
 * lightness band, chroma floor, CVD separation, and 3:1 contrast all pass in
 * both modes, so the same three hues serve both themes.
 *
 * `saas_other` is the unattributed residue rather than a real category, so it
 * gets a hatched neutral instead of a hue — texture reads as "unclassified"
 * and keeps the categorical slots for streams that mean something.
 */
export const STREAM_COLORS: Record<AdminEarningsStreamKey, string> = {
  saas_hotspot: '#059669',
  saas_pppoe: '#5850ec',
  saas_other: 'var(--color-foreground-muted)',
  reseller: '#d97706',
};

const HATCH_ID = 'earningsUnattributedHatch';

export const STREAM_FILLS: Record<AdminEarningsStreamKey, string> = {
  ...STREAM_COLORS,
  saas_other: `url(#${HATCH_ID})`,
};

/** CSS swatch matching the chart mark, for legend chips and table rows. */
export function streamSwatchStyle(key: AdminEarningsStreamKey): React.CSSProperties {
  if (key !== 'saas_other') return { backgroundColor: STREAM_COLORS[key] };
  return {
    backgroundImage:
      'repeating-linear-gradient(45deg, var(--color-foreground-muted) 0 2px, transparent 2px 4px)',
    border: '1px solid var(--color-foreground-muted)',
  };
}

const formatCompact = (amount: number): string => {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return String(Math.round(amount));
};

const axisTick = { fontSize: 10, fill: 'var(--color-foreground-muted)' };

function Hatch() {
  return (
    <defs>
      <pattern id={HATCH_ID} width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="var(--color-background-tertiary)" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-foreground-muted)" strokeWidth="2" />
      </pattern>
      {/* Cumulative view fades each band toward the baseline. */}
      {(['saas_hotspot', 'saas_pppoe', 'reseller'] as const).map((key) => (
        <linearGradient key={key} id={`earningsGrad-${key}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={STREAM_COLORS[key]} stopOpacity={0.55} />
          <stop offset="95%" stopColor={STREAM_COLORS[key]} stopOpacity={0.12} />
        </linearGradient>
      ))}
    </defs>
  );
}

function EarningsTooltip({
  active, payload, label, streams,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
  streams: AdminEarningsStream[];
}) {
  if (!active || !payload?.length) return null;

  const byKey = new Map(payload.map((entry) => [String(entry.dataKey), Number(entry.value) || 0]));
  const visible = streams.filter((s) => byKey.has(s.key));
  const total = visible.reduce((sum, s) => sum + (byKey.get(s.key) ?? 0), 0);

  return (
    <div className="rounded-xl border border-border bg-background-secondary px-3 py-2 shadow-lg">
      <p className="text-[10px] text-foreground-muted mb-1.5">{label}</p>
      <div className="space-y-1">
        {visible.map((stream) => (
          <div key={stream.key} className="flex items-center gap-2 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={streamSwatchStyle(stream.key)} />
            <span className="text-foreground-muted flex-1 whitespace-nowrap">{stream.label}</span>
            <span className="text-foreground font-medium tabular-nums">
              {formatKES(byKey.get(stream.key) ?? 0)}
            </span>
          </div>
        ))}
      </div>
      {visible.length > 1 && (
        <div className="mt-1.5 pt-1.5 border-t border-border flex items-center justify-between gap-4 text-[11px]">
          <span className="text-foreground-muted">Total</span>
          <span className="text-foreground font-semibold tabular-nums">{formatKES(total)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Stacked earnings over time. `streams` is already filtered to the bands the
 * user has left switched on, in stack order — the last entry sits on top and
 * is the only one that gets rounded corners.
 */
export default function EarningsChart({
  data,
  streams,
  mode,
}: {
  data: AdminEarningsPoint[];
  streams: AdminEarningsStream[];
  mode: 'period' | 'cumulative';
}) {
  const tooltip = (
    <Tooltip
      cursor={{ fill: 'var(--color-background-tertiary)', opacity: 0.45 }}
      content={<EarningsTooltip streams={streams} />}
    />
  );

  if (mode === 'cumulative') {
    // Running totals per stream, so the silhouette is "everything we've made".
    const running: Record<string, number> = {};
    const cumulative = data.map((point) => {
      const next: Record<string, number | string> = { label: point.label };
      for (const stream of streams) {
        running[stream.key] = (running[stream.key] ?? 0) + (point[stream.key] ?? 0);
        next[stream.key] = Math.round(running[stream.key] * 100) / 100;
      }
      return next;
    });

    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={cumulative} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <Hatch />
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={formatCompact} width={48} />
          {tooltip}
          {streams.map((stream) => (
            <Area
              key={stream.key}
              type="monotone"
              dataKey={stream.key}
              stackId="earnings"
              stroke={STREAM_COLORS[stream.key]}
              strokeWidth={2}
              fill={
                stream.key === 'saas_other'
                  ? STREAM_FILLS.saas_other
                  : `url(#earningsGrad-${stream.key})`
              }
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <Hatch />
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={formatCompact} width={48} />
        {tooltip}
        {streams.map((stream, i) => (
          <Bar
            key={stream.key}
            dataKey={stream.key}
            stackId="earnings"
            fill={STREAM_FILLS[stream.key]}
            // 2px surface-coloured seam so adjacent bands stay countable.
            stroke="var(--color-background-secondary)"
            strokeWidth={1}
            radius={i === streams.length - 1 ? [4, 4, 0, 0] : undefined}
            maxBarSize={44}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
