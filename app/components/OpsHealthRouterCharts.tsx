'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { OpsHealthHistoryPoint } from '../lib/types';
import {
  BreakdownKey, OTHERS_COLOR, StackRow, TotalKey, buildStackRows, rankRouters, tooltipLines,
} from '../lib/routerBreakdown';

// Network health graphs that say WHO is behind the number: each of the top
// routers gets its own band (same colour on every graph), the rest are "others",
// and the tooltip names everyone at that moment. Click a router to isolate it.

const MAX_BANDS = 5;
const axisTick = { fontSize: 10, fill: 'var(--color-foreground-muted)' };
const boxStyle = {
  backgroundColor: 'var(--color-background-secondary)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  fontSize: '11px',
  padding: '8px 12px',
};

function hhmm(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Swatch({ color }: { color: string }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />;
}

export function StackedByRouter({ points, breakdownKey, totalKey, label, noun, names, colors, onOpen }: {
  points: OpsHealthHistoryPoint[];
  breakdownKey: BreakdownKey;
  totalKey: TotalKey;
  label: string;
  /** What the count is, for the tooltip: "waiting", "still connected". */
  noun: string;
  names: Record<string, string>;
  colors: Record<string, string>;
  onOpen: (routerId: number) => void;
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const ranked = useMemo(() => rankRouters(points, breakdownKey), [points, breakdownKey]);
  const top = ranked.slice(0, MAX_BANDS).map((r) => r.id);
  const rows = useMemo(() => buildStackRows(points, breakdownKey, totalKey, top),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- top derives from ranked
    [points, breakdownKey, totalKey, ranked]);
  const numeric = rows.filter((r) => r.total !== null);
  const latest = numeric.length ? numeric[numeric.length - 1].total : null;
  const color = (id: string) => colors[id] ?? OTHERS_COLOR;
  const nameOf = (id: string) => names[id] ?? `Router #${id}`;
  const dim = (id: string) => focus !== null && focus !== id;

  return (
    <div className="min-w-0" data-testid={`ops-stack-${breakdownKey}`}>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <p className="text-xs font-medium text-foreground truncate">{label}</p>
        <p className="text-xs tabular-nums text-foreground-muted">{latest === null ? 'no data yet' : `now ${latest}`}</p>
      </div>
      {ranked.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5" role="group" aria-label={`Routers behind ${label}`}>
          {ranked.slice(0, MAX_BANDS).map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={focus === r.id}
              onClick={() => setFocus((f) => (f === r.id ? null : r.id))}
              title={`${nameOf(r.id)}: ${r.share}% of the ${noun} time in this window. Click to isolate.`}
              className={`inline-flex items-center gap-1 max-w-full px-1.5 py-0.5 rounded border border-border text-[10px] text-foreground transition-opacity ${dim(r.id) ? 'opacity-40' : ''}`}
            >
              <Swatch color={color(r.id)} />
              <span className="truncate max-w-[9rem]">{nameOf(r.id)}</span>
              <span className="text-foreground-muted tabular-nums">{r.share}%</span>
            </button>
          ))}
        </div>
      )}
      {numeric.length < 2 ? (
        <div className="h-[120px] flex items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-foreground-muted">
          Building history — check back in a few minutes
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={rows} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="t" tickFormatter={hhmm} tick={axisTick} axisLine={false} tickLine={false} minTickGap={40} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={48} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as StackRow;
                const lines = tooltipLines(row, top, names, colors).filter((l) => focus === null || l.id === focus);
                return (
                  <div style={boxStyle}>
                    <p className="text-[10px] text-foreground-muted mb-1">{hhmm(row.t)} · {row.total ?? 0} {noun}</p>
                    {lines.length === 0 ? <p className="text-foreground-muted">none</p> : lines.slice(0, 8).map((l) => (
                      <p key={`${l.id}-${l.name}`} className="flex items-center gap-1.5 text-foreground">
                        <Swatch color={l.color} /><span className="truncate max-w-[12rem]">{l.name}</span>
                        <span className="ml-auto pl-2 tabular-nums">{l.count}</span>
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            {top.map((id) => (
              <Area key={id} type="monotone" dataKey={id} stackId="routers" stroke={color(id)} fill={color(id)}
                strokeOpacity={dim(id) ? 0.15 : 1} fillOpacity={dim(id) ? 0.05 : 0.45} strokeWidth={1.5}
                dot={false} activeDot={false} isAnimationActive={false} connectNulls={false} />
            ))}
            <Area type="monotone" dataKey="others" stackId="routers" stroke={OTHERS_COLOR} fill={OTHERS_COLOR}
              strokeOpacity={focus ? 0.15 : 1} fillOpacity={focus ? 0.05 : 0.3} strokeWidth={1}
              dot={false} activeDot={false} isAnimationActive={false} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
      {focus && (
        <button type="button" onClick={() => onOpen(Number(focus))}
          className="mt-1 text-[11px] text-foreground-muted hover:text-foreground underline underline-offset-2">
          Open {nameOf(focus)} report →
        </button>
      )}
    </div>
  );
}

/** Routers offline over 24h; the tooltip names which routers were offline then. */
export function OfflineTrend({ points, names, color = '#ef4444', onOpen }: {
  points: OpsHealthHistoryPoint[];
  names: Record<string, string>;
  color?: string;
  onOpen: (routerId: number) => void;
}) {
  const data = points.map((p) => ({ t: p.t, v: typeof p.tunnels_offline === 'number' ? p.tunnels_offline : null, ids: p.offline_router_ids ?? [] }));
  const numeric = data.filter((d) => d.v !== null);
  const latest = numeric.length ? numeric[numeric.length - 1] : null;
  const nameOf = (id: number) => names[String(id)] ?? `Router #${id}`;
  return (
    <div className="min-w-0" data-testid="ops-trend-offline-routers">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <p className="text-xs font-medium text-foreground truncate">Routers offline</p>
        <p className="text-xs tabular-nums text-foreground-muted">{latest ? `now ${latest.v}` : 'no data yet'}</p>
      </div>
      {numeric.length < 2 ? (
        <div className="h-[120px] flex items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-foreground-muted">
          Building history — check back in a few minutes
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="t" tickFormatter={hhmm} tick={axisTick} axisLine={false} tickLine={false} minTickGap={40} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={48} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as { t: string; v: number | null; ids: number[] };
                return (
                  <div style={boxStyle}>
                    <p className="text-[10px] text-foreground-muted mb-1">{hhmm(row.t)} · {row.v ?? 0} offline</p>
                    {row.ids.slice(0, 8).map((id) => <p key={id} className="text-foreground truncate max-w-[14rem]">{nameOf(id)}</p>)}
                    {row.ids.length > 8 && <p className="text-foreground-muted">+{row.ids.length - 8} more</p>}
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
      {latest && latest.ids.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {latest.ids.slice(0, 6).map((id) => (
            <button key={id} type="button" onClick={() => onOpen(id)}
              className="px-1.5 py-0.5 rounded border border-border text-[10px] text-foreground hover:bg-background-tertiary truncate max-w-[10rem]">
              {nameOf(id)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
