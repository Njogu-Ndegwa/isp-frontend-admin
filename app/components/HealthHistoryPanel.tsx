'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import type { HealthHistoryRange, RouterHealthHistory, RouterHealthSummary } from '../lib/types';
import { formatDateGMT3, formatTimeSinceUTC } from '../lib/dateUtils';
import { useT } from '../lib/i18n';
import {
  hasData, pct, slotLabel, tickLabel, ticksFor, toRows,
  type HealthMetric, type HealthRow,
} from '../lib/healthHistory';

/**
 * CPU and memory over time for one router, next to the dials that show "now".
 *
 * Two small charts (one per metric, same 0-100% scale, never one chart with two
 * axes): the line is the average per slot, the light band reaches up to that
 * slot's peak so a short spike stays visible. Gaps are slots the router sent
 * nothing (offline, or no health reports then). Reboots are thin vertical rules.
 *
 * Each chart's heading reads Avg · p95 · p99 · Peak. p95/p99 come from the
 * slot averages (5-minute for 24h, hourly for 7d), so "p95 60%" means the
 * router averaged over 60% for 5% of the range (72 minutes of a day): sustained
 * load, which a single spike cannot fake. Peak is the highest single reading.
 *
 * Never blind while looking sighted: a router that sends no health reports says
 * so instead of "no history yet", a router that stopped says since when, and
 * WAN link drops read "not reported" (not "none") where the agent does not
 * send the counter.
 *
 * Fetches on open, on range change and every 5 minutes while the tab is visible.
 * The backend keeps this history small by design (5-min buckets for a day,
 * hourly for a week), so the request is cheap.
 */

const REFRESH_MS = 5 * 60 * 1000;
const RANGES: HealthHistoryRange[] = ['24h', '7d'];
const COLOR = 'var(--chart-health)';

type T = ReturnType<typeof useT>;

export default function HealthHistoryPanel({ routerId, className = '' }: { routerId: number; className?: string }) {
  const t = useT();
  const [range, setRange] = useState<HealthHistoryRange>('24h');
  const [data, setData] = useState<RouterHealthHistory | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const requestKey = `${routerId}:${range}`;

  const load = useCallback(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    api.getRouterHealthHistory(routerId, range)
      .then((h) => { setData(h); setError(null); })
      .catch((e: Error) => setError({ key: `${routerId}:${range}`, message: e.message || '' }));
  }, [routerId, range]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const current = data && `${data.router_id}:${data.range}` === requestKey ? data : null;
  const failed = !current && error?.key === requestKey;

  return (
    <div className={`@container rounded-2xl bg-background-tertiary/40 p-3 sm:p-4 min-w-0 ${className}`} data-testid="health-history">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs sm:text-sm font-medium text-foreground">{t('Over time')}</p>
        <div role="group" aria-label={t('Time range')} className="inline-flex rounded-lg bg-background-secondary p-0.5 border border-border">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={`min-h-[32px] px-3 rounded-md text-[11px] sm:text-xs font-medium transition-colors ${
                range === r ? 'bg-background-tertiary text-foreground' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              {r === '24h' ? t('24 hours') : t('7 days')}
            </button>
          ))}
        </div>
      </div>

      {failed ? (
        <div className="flex items-center justify-between gap-3 text-xs text-foreground-muted py-6">
          <span>{t('Could not load history')}</span>
          <button type="button" onClick={load} className="btn-secondary text-xs min-h-[32px] px-3">{t('Retry')}</button>
        </div>
      ) : !current ? (
        <div className="grid gap-4 @lg:grid-cols-2" aria-busy="true">
          {[0, 1].map((i) => <div key={i} className="h-[136px] rounded-xl skeleton" />)}
        </div>
      ) : current.summary.buckets_with_data === 0 ? (
        <p className="text-xs text-foreground-muted py-6 text-center max-w-md mx-auto">
          {emptyMessage(t, current.summary)}
        </p>
      ) : (
        <>
          {!current.summary.reporting && <StaleNotice t={t} summary={current.summary} />}
          <div className="grid gap-4 @lg:grid-cols-2">
            <MetricChart t={t} history={current} metric="cpu" title={t('CPU Load')} />
            <MetricChart t={t} history={current} metric="mem" title={t('Memory')} />
          </div>
          <EventsLine t={t} history={current} />
          <p className="mt-1 text-[10px] leading-snug text-foreground-muted">
            {current.range === '24h'
              ? t('p95 / p99: the 5-minute average was above this for 5% / 1% of the time. Peak: highest single reading (one per report).')
              : t('p95 / p99: the hourly average was above this for 5% / 1% of the time. Peak: highest single reading (one per report).')}
          </p>
        </>
      )}
    </div>
  );
}

function emptyMessage(t: T, s: RouterHealthSummary): string {
  if (!s.last_report_at) {
    return t('This router does not send health reports (no reporting agent on it), so there is no graph.');
  }
  if (!s.reporting) {
    return t('No health report since {when}. The graph resumes when the router reports again.', { when: lastSeen(s.last_report_at) });
  }
  return t('No history yet. The graph fills in as the router reports its health, every few minutes.');
}

function lastSeen(iso: string): string {
  const ago = formatTimeSinceUTC(iso);
  const at = formatDateGMT3(iso, { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  return ago ? `${at} (${ago})` : at;
}

function StaleNotice({ t, summary }: { t: T; summary: RouterHealthSummary }) {
  return (
    <p role="status" className="mb-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] text-foreground">
      {summary.last_report_at
        ? t('No health report since {when}. The graph after that is empty, not quiet.', { when: lastSeen(summary.last_report_at) })
        : t('This router does not send health reports.')}
    </p>
  );
}

function MetricChart({ t, history, metric, title }: {
  t: T; history: RouterHealthHistory; metric: HealthMetric; title: string;
}) {
  const s = history.summary;
  const [avg, p95, p99, peak] = metric === 'cpu'
    ? [s.cpu_avg, s.cpu_p95, s.cpu_p99, s.cpu_max]
    : [s.mem_avg, s.mem_p95, s.mem_p99, s.mem_max];
  const rows = toRows(history, metric);
  const ticks = ticksFor(rows, history.range);
  const reboots = rows.filter((r) => r.reboots > 0).map((r) => r.t);
  const gradientId = `health-band-${metric}`;

  return (
    <figure className="min-w-0 m-0">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 mb-1">
        <span className="text-[11px] sm:text-xs font-medium text-foreground">{title}</span>
        <span className="text-[11px] text-foreground-muted tabular-nums" data-testid={`health-stats-${metric}`}>
          {t('Avg {avg} · p95 {p95} · p99 {p99} · Peak {peak}', {
            avg: pct(avg), p95: pct(p95), p99: pct(p99), peak: pct(peak),
          })}
        </span>
      </figcaption>
      <div className="h-28 w-full">
        {hasData(history, metric) ? (
          // A real first size (the slot is h-28): no "width(-1)" warning before layout.
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 112 }}>
            <ComposedChart data={rows} margin={{ top: 6, right: 6, left: 0, bottom: 0 }} accessibilityLayer>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={COLOR} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']}
                ticks={ticks} tickFormatter={(v: number) => tickLabel(v, history.range)}
                axisLine={false} tickLine={false} interval={0} minTickGap={8}
                tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
              />
              <YAxis
                domain={[0, 100]} ticks={[0, 50, 100]} width={34}
                tickFormatter={(v: number) => `${v}%`}
                axisLine={false} tickLine={false}
                tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
              />
              <Tooltip
                content={<SlotTooltip t={t} title={title} history={history} />}
                cursor={{ stroke: 'var(--border-hover)', strokeWidth: 1 }}
                isAnimationActive={false}
              />
              {reboots.map((x) => (
                <ReferenceLine key={x} x={x} stroke="var(--foreground-muted)" strokeOpacity={0.7} strokeWidth={1} />
              ))}
              <Area
                dataKey="band" type="linear" stroke="none" fill={`url(#${gradientId})`}
                connectNulls={false} isAnimationActive={false} activeDot={false}
              />
              <Line
                dataKey="avg" type="linear" stroke={COLOR} strokeWidth={2}
                connectNulls={false} isAnimationActive={false}
                dot={(p: { cx?: number; cy?: number; index?: number }) => <IsolatedDot {...p} rows={rows} />}
                activeDot={{ r: 4, fill: COLOR, stroke: 'var(--background-secondary)', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[11px] text-foreground-muted rounded-xl border border-border">
            {t('No data in this period')}
          </div>
        )}
      </div>
    </figure>
  );
}

/** A slot with no neighbours on either side draws no line segment; mark it. */
function IsolatedDot({ cx, cy, index, rows }: { cx?: number; cy?: number; index?: number; rows: HealthRow[] }) {
  const key = `dot-${index}`;
  if (index === undefined || cx === undefined || cy === undefined || rows[index]?.avg === null) return <g key={key} />;
  const alone = (rows[index - 1]?.avg ?? null) === null && (rows[index + 1]?.avg ?? null) === null;
  return alone ? <circle key={key} cx={cx} cy={cy} r={2.5} fill={COLOR} /> : <g key={key} />;
}

function SlotTooltip({ t, title, history, active, payload }: {
  t: T; title: string; history: RouterHealthHistory;
  active?: boolean; payload?: Array<{ payload: HealthRow }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-background-secondary border border-border rounded-lg px-3 py-2 text-xs shadow-xl min-w-[150px]">
      <p className="text-foreground-muted mb-1 tabular-nums">{slotLabel(row.t, history.step_seconds, history.range)}</p>
      {row.avg === null ? (
        <p className="text-foreground-muted">{t('No report from the router')}</p>
      ) : (
        <>
          <p className="text-foreground font-medium">{title}</p>
          <p className="text-foreground tabular-nums">{t('Average')} {pct(row.avg)} · {t('Peak')} {pct(row.max)}</p>
        </>
      )}
      {row.reboots > 0 && <p className="text-foreground mt-1">{t('Rebooted')}</p>}
      {row.linkDrops > 0 && (
        <p className="text-foreground-muted">
          {row.linkDrops === 1 ? t('1 WAN link drop') : t('{n} WAN link drops', { n: row.linkDrops })}
        </p>
      )}
    </div>
  );
}

function EventsLine({ t, history }: { t: T; history: RouterHealthHistory }) {
  const { reboots, link_drops: drops, link_drops_reported: dropsKnown } = history.summary;
  const period = history.range === '24h' ? t('Last 24 hours') : t('Last 7 days');
  const parts: string[] = [
    reboots === 0 ? t('No reboots') : reboots === 1 ? t('1 reboot') : t('{n} reboots', { n: reboots }),
  ];
  if (!dropsKnown && !drops) parts.push(t('WAN link drops not reported by this router'));
  else parts.push(drops === 0 ? t('No WAN link drops') : drops === 1 ? t('1 WAN link drop') : t('{n} WAN link drops', { n: drops }));
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-foreground-muted">
      <span>{period}: {parts.join(' · ')}</span>
      {reboots > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block w-px h-3 bg-foreground-muted" />
          {t('Reboot')}
        </span>
      )}
    </p>
  );
}
