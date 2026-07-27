'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { api } from '../lib/api';
import { AdminEarnings } from '../lib/types';
import { formatKES } from '../lib/format';
import {
  SOURCE_LABELS, sourceSwatchStyle, toChartPoints,
} from './earnings/earningsChartData';
import PeriodSelector, { type PeriodFilter } from './PeriodSelector';

// recharts stays out of the dashboard bundle until this card renders.
const EarningsChart = dynamic(() => import('./earnings/EarningsCharts'), {
  ssr: false,
  loading: () => <div className="h-[180px] rounded-xl bg-background-tertiary/60 animate-pulse" />,
});

/**
 * Dashboard-sized version of the Earnings page: the two businesses compared,
 * with the combined total and its trend leading. Links through for the range
 * filters and the full breakdown.
 */
export default function EarningsSummaryCard({
  period = '30d',
  onPeriodChange,
}: {
  period?: PeriodFilter;
  onPeriodChange?: (p: PeriodFilter) => void;
}) {
  // One state object written only from the fetch callbacks. Loading is derived
  // from "what we hold isn't for the period being asked for", which avoids a
  // synchronous setState in the effect body and the cascading render it causes.
  const [loaded, setLoaded] = useState<
    { period: string; data: AdminEarnings | null; failed: boolean } | null
  >(null);

  // The dashboard stages its own loads so the first paint isn't competing with
  // the slower analytics. Join that second wave instead of firing on mount and
  // adding five queries to the critical path. A period change the user just
  // clicked still goes out immediately — `armed` only gates the first load.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setArmed(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!armed) return;
    let live = true;
    api.getAdminEarnings(period)
      .then((result) => { if (live) setLoaded({ period, data: result, failed: false }); })
      .catch(() => { if (live) setLoaded({ period, data: null, failed: true }); });
    return () => { live = false; };
  }, [armed, period]);

  const current = loaded?.period === period ? loaded : null;
  const loading = current === null;
  const data = current?.data ?? null;
  const failed = current?.failed ?? false;

  const points = useMemo(() => toChartPoints(data?.series ?? []), [data]);

  const rows = data
    ? [
        { key: 'system' as const, label: SOURCE_LABELS.system, value: data.totals.system, change: data.change_percent.system },
        { key: 'reseller' as const, label: SOURCE_LABELS.reseller, value: data.totals.reseller, change: data.change_percent.reseller },
      ]
    : [];

  const change = data?.change_percent.combined ?? 0;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Earnings</h3>
          <p className="text-[11px] text-foreground-muted mt-0.5">System sales vs my reseller business</p>
        </div>
        <div className="flex items-center gap-2">
          {onPeriodChange && <PeriodSelector value={period} onChange={onPeriodChange} />}
          <Link href="/admin/earnings" className="text-xs text-accent-primary hover:underline shrink-0">
            Details
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="h-[248px] rounded-xl bg-background-tertiary/60 animate-pulse" />
      ) : failed || !data ? (
        <div className="flex items-center justify-center h-[248px] text-foreground-muted text-xs">
          Earnings unavailable
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {formatKES(data.totals.combined)}
            </span>
            <span className={`text-xs font-medium ${change >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
            <span className="text-[11px] text-foreground-muted">
              total, last {data.days} days
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap mt-2 mb-1">
            {rows.map((row) => (
              <div key={row.key} className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={sourceSwatchStyle(row.key)} />
                <span className="text-foreground-muted">{row.label}</span>
                <span className="text-foreground font-medium tabular-nums">{formatKES(row.value)}</span>
                <span className={row.change >= 0 ? 'text-emerald-500' : 'text-red-400'}>
                  {row.change >= 0 ? '+' : ''}{row.change.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>

          {data.totals.combined === 0 ? (
            <div className="flex flex-col items-center justify-center h-[180px] text-center gap-1">
              <p className="text-xs text-foreground-muted">Nothing recorded in this window</p>
              {data.own_reseller_accounts.length === 0 && (
                <Link href="/admin/earnings" className="text-[11px] text-accent-primary hover:underline">
                  Pick your reseller accounts to include their collections
                </Link>
              )}
            </div>
          ) : (
            <EarningsChart data={points} height={180} />
          )}
        </>
      )}
    </div>
  );
}
