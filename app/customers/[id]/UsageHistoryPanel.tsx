'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '../../lib/api';
import { CustomerUsagePeriod, CustomerUsageTimeline, UsageTimelineGranularity } from '../../lib/types';
import FilterPills from '../../components/FilterPills';
import { formatUsageMb, shortDate, slotLabel } from './usageFormat';

// recharts is heavy; only pull it in once there is something to draw.
const UsageTimelineChart = dynamic(() => import('./UsageTimelineChart'), {
  ssr: false,
  loading: () => <div className="h-56 sm:h-64 w-full rounded-lg bg-background-tertiary animate-pulse" />,
});

type RangeKey = '24h' | '7d' | '30d';

const RANGES: Record<RangeKey, { days: number; granularity: UsageTimelineGranularity; label: string }> = {
  '24h': { days: 1, granularity: 'hour', label: 'Last 24 hours' },
  '7d': { days: 7, granularity: 'day', label: 'Last 7 days' },
  '30d': { days: 30, granularity: 'day', label: 'Last 30 days' },
};

const RANGE_OPTIONS = (Object.keys(RANGES) as RangeKey[]).map((value) => ({ value, label: value }));

/**
 * How much data one customer used over time: a 24h / 7d / 30d chart from the
 * hourly usage ledger (35 days kept), plus past billing-period totals, which
 * reach further back.
 */
export default function UsageHistoryPanel({ customerId }: { customerId: number }) {
  const [range, setRange] = useState<RangeKey>('7d');
  // Keyed by request so a range switch keeps the old chart (dimmed) until the
  // new one lands, without resetting state inside the effect.
  const [result, setResult] = useState<{ key: string; timeline?: CustomerUsageTimeline; error?: string } | null>(null);
  const [timeline, setTimeline] = useState<CustomerUsageTimeline | null>(null);
  const [periods, setPeriods] = useState<CustomerUsagePeriod[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { days, granularity } = RANGES[range];
    const key = `${customerId}:${range}`;
    api.getCustomerUsageTimeline(customerId, days, granularity)
      .then((data) => {
        if (cancelled) return;
        setTimeline(data);
        setResult({ key, timeline: data });
      })
      .catch((err) => {
        if (!cancelled) setResult({ key, error: err instanceof Error ? err.message : 'Failed to load usage history' });
      });
    return () => { cancelled = true; };
  }, [customerId, range]);

  const loading = result?.key !== `${customerId}:${range}`;
  const error = loading ? null : result?.error ?? null;

  useEffect(() => {
    let cancelled = false;
    api.getCustomerUsageHistory(customerId, 6)
      .then((data) => { if (!cancelled) setPeriods(data); })
      .catch(() => { if (!cancelled) setPeriods([]); });
    return () => { cancelled = true; };
  }, [customerId]);

  const hourly = timeline?.granularity === 'hour';
  const slotCount = timeline?.points.length ?? 0;
  const average = timeline && slotCount > 0 ? timeline.total_mb / slotCount : 0;
  const hasUsage = !!timeline && timeline.total_mb > 0;
  // Ledger began 2026-09-26; say so when the window reaches back before it.
  const trackedSince = timeline?.history_since && timeline.history_since > timeline.window_start
    ? timeline.history_since
    : null;

  return (
    <div className="card p-4 space-y-4" data-testid="usage-history-panel">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Usage History</h3>
          <p className="text-xs text-foreground-muted mt-0.5">{RANGES[range].label}</p>
        </div>
        <FilterPills value={range} onChange={setRange} options={RANGE_OPTIONS} ariaLabel="Usage history range" />
      </div>

      {error ? (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">{error}</div>
      ) : !timeline ? (
        <div className="h-56 sm:h-64 w-full rounded-lg bg-background-tertiary animate-pulse" />
      ) : (
        <div className={`space-y-4 transition-opacity ${loading ? 'opacity-50' : ''}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Total" value={formatUsageMb(timeline.total_mb)} strong />
            <Stat label="Download" value={formatUsageMb(timeline.download_mb)} />
            <Stat label="Upload" value={formatUsageMb(timeline.upload_mb)} />
            <Stat label={hourly ? 'Avg / hour' : 'Avg / day'} value={formatUsageMb(average)} />
          </div>

          {hasUsage ? (
            <>
              <UsageTimelineChart timeline={timeline} />
              {timeline.peak && (
                <p className="text-xs text-foreground-muted">
                  Busiest {hourly ? 'hour' : 'day'}:{' '}
                  <span className="text-foreground font-medium">{slotLabel(timeline.peak.start, timeline.granularity)}</span>
                  {' · '}
                  <span className="text-foreground font-medium tabular-nums">{formatUsageMb(timeline.peak.total_mb)}</span>
                </p>
              )}
            </>
          ) : (
            <div className="h-40 w-full flex flex-col items-center justify-center gap-1 rounded-lg bg-background-tertiary text-sm text-foreground-muted text-center px-4">
              <p>No data used in this period.</p>
              {!timeline.history_since && (
                <p className="text-xs">Usage appears here once this customer goes online.</p>
              )}
            </div>
          )}

          {trackedSince && hasUsage && (
            <p className="text-[11px] text-foreground-muted">
              Hourly tracking for this customer started {shortDate(trackedSince)}; earlier {hourly ? 'hours' : 'days'} show no data.
            </p>
          )}
        </div>
      )}

      {periods && periods.length > 0 && <PastPeriods periods={periods} />}
    </div>
  );
}

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-background-tertiary/50 p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-foreground-muted">{label}</p>
      <p className={`tabular-nums ${strong ? 'text-base font-semibold text-foreground' : 'text-sm font-medium text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}

function PastPeriods({ periods }: { periods: CustomerUsagePeriod[] }) {
  const max = Math.max(...periods.map((p) => p.total_mb), 1);
  return (
    <div className="pt-3 border-t border-border">
      <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-2">By billing period</h4>
      <ul className="space-y-2">
        {periods.map((p) => {
          const current = !p.closed_at;
          const end = current ? 'now' : shortDate(p.closed_at ?? p.period_end);
          return (
            <li key={p.id} className="text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-foreground-muted">
                  {shortDate(p.period_start)} – {end}
                  {current && <span className="ml-1.5 text-accent-primary font-medium">Current</span>}
                  {p.fup_triggered_at && <span className="ml-1.5 text-danger">FUP hit</span>}
                </span>
                <span className="tabular-nums text-foreground font-medium">
                  {formatUsageMb(p.total_mb)}
                  {p.cap_mb != null && <span className="text-foreground-muted font-normal"> / {formatUsageMb(p.cap_mb)}</span>}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-background-tertiary overflow-hidden">
                <div
                  className={`h-full rounded-full ${current ? 'bg-accent-primary' : 'bg-foreground-muted/40'}`}
                  style={{ width: `${Math.max(2, (p.total_mb / max) * 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
