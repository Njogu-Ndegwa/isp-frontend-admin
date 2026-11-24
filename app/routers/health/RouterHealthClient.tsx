'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../lib/i18n';
import { formatTimeSinceUTC } from '../../lib/dateUtils';
import { loadTone, pct, sortRanking, type RankSortKey } from '../../lib/healthHistory';
import type { HealthHistoryRange, RouterHealthRank, RouterHealthRanking } from '../../lib/types';

/**
 * Router load: every router's CPU and memory over the last day or week, the
 * most affected first. Sorted by CPU p95 by default: the load a router carries
 * for at least 5% of the time, which one stray spike cannot fake. Peak and
 * p99 sit beside it for the short, sharp cases.
 *
 * Routers that send no health readings are listed apart, by name, so a short
 * table is never mistaken for a healthy fleet.
 */

type T = ReturnType<typeof useT>;
const RANGES: HealthHistoryRange[] = ['24h', '7d'];

const TONE_CLASS: Record<ReturnType<typeof loadTone>, string> = {
  high: 'text-danger font-semibold',
  elevated: 'text-warning font-medium',
  normal: 'text-foreground',
  none: 'text-foreground-muted',
};

const TONE_BAR: Record<ReturnType<typeof loadTone>, string> = {
  high: 'bg-danger',
  elevated: 'bg-warning',
  normal: 'bg-[var(--chart-health)]',
  none: 'bg-transparent',
};

export default function RouterHealthClient() {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [range, setRange] = useState<HealthHistoryRange>('24h');
  const [data, setData] = useState<RouterHealthRanking | null>(null);
  // Keyed by range, so an old range's failure never shows over the new one.
  const [error, setError] = useState<{ range: HealthHistoryRange; message: string } | null>(null);
  const [sortKey, setSortKey] = useState<RankSortKey>('cpu_p95');
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    api.getRouterHealthRanking(range)
      .then((r) => { setData(r); setError(null); })
      .catch((e: Error) => setError({ range, message: e.message || t('Could not load router load') }));
  }, [range, t]);

  useEffect(() => { load(); }, [load]);

  const current = data && data.range === range ? data : null;
  const failed = !current && error?.range === range ? error.message : null;
  const rows = useMemo(() => {
    if (!current) return [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? current.routers.filter((r) => `${r.name} ${r.owner_name ?? ''} ${r.board ?? ''}`.toLowerCase().includes(q))
      : current.routers;
    return sortRanking(filtered, sortKey);
  }, [current, query, sortKey]);

  const high = current?.routers.filter((r) => loadTone(r.cpu_p95) === 'high').length ?? 0;
  const stale = current?.routers.filter((r) => !r.reporting).length ?? 0;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Header
        title={t('Router load')}
        subtitle={t('CPU and memory per router, the most affected first')}
        backHref="/routers"
      />

      <div className="card p-3 sm:p-4 space-y-3 @container">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div role="group" aria-label={t('Time range')} className="inline-flex rounded-lg bg-background-secondary p-0.5 border border-border">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={`min-h-[36px] px-3 rounded-md text-xs font-medium transition-colors ${
                  range === r ? 'bg-background-tertiary text-foreground' : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {r === '24h' ? t('24 hours') : t('7 days')}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAdmin ? t('Search router, reseller or model') : t('Search router or model')}
            aria-label={t('Search routers')}
            className="input min-h-[36px] text-sm w-full sm:w-72"
          />
        </div>

        {current && (
          <p className="text-xs text-foreground-muted" data-testid="router-load-summary">
            {t('{n} routers with readings', { n: current.routers.length })}
            {' · '}
            <span className={high ? 'text-danger font-medium' : ''}>{t('{n} with CPU p95 of 80% or more', { n: high })}</span>
            {stale > 0 && <>{' · '}{t('{n} stopped reporting', { n: stale })}</>}
            {current.not_reporting.length > 0 && <>{' · '}{t('{n} online without readings', { n: current.not_reporting.length })}</>}
          </p>
        )}

        {failed ? (
          <div className="flex items-center justify-between gap-3 text-sm text-foreground-muted py-6">
            <span>{failed}</span>
            <button type="button" onClick={load} className="btn-secondary text-xs min-h-[36px] px-3">{t('Retry')}</button>
          </div>
        ) : !current ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-12 rounded-lg skeleton" />)}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-foreground-muted py-6 text-center">
            {query ? t('No router matches that search.') : t('No router has sent health readings in this period.')}
          </p>
        ) : (
          <>
            <RankTable t={t} rows={rows} sortKey={sortKey} onSort={setSortKey} isAdmin={isAdmin} />
            <RankCards t={t} rows={rows} isAdmin={isAdmin} />
          </>
        )}

        {current && (
          <p className="text-[11px] leading-snug text-foreground-muted">
            {range === '24h'
              ? t('p95 / p99: the 5-minute average was above this for 5% / 1% of the time. Peak: highest single reading (one per report).')
              : t('p95 / p99: the hourly average was above this for 5% / 1% of the time. Peak: highest single reading (one per report).')}
            {' '}
            {t('WAN drops show "—" where the router does not report its link-down counter.')}
          </p>
        )}
      </div>

      {current && current.not_reporting.length > 0 && <NotReporting t={t} rows={current.not_reporting} isAdmin={isAdmin} />}
    </div>
  );
}

function routerHref(r: RouterHealthRank) {
  return `/routers/${r.router_id}/live`;
}

function Pct({ v, toned = false }: { v: number | null; toned?: boolean }) {
  const tone = toned ? loadTone(v) : v === null ? 'none' : 'normal';
  return <span className={`tabular-nums ${TONE_CLASS[tone]}`}>{pct(v)}</span>;
}

function Drops({ t, r }: { t: T; r: RouterHealthRank }) {
  if (!r.link_drops_reported && !r.link_drops) {
    return <span className="text-foreground-muted" title={t('This router does not report its WAN link-down counter')}>—</span>;
  }
  return <span className="tabular-nums">{r.link_drops}</span>;
}

function RouterCell({ t, r, isAdmin }: { t: T; r: RouterHealthRank; isAdmin: boolean }) {
  const sub = [r.board, isAdmin ? r.owner_name : null].filter(Boolean).join(' · ');
  return (
    <div className="min-w-0">
      <Link href={routerHref(r)} className="font-medium text-foreground hover:text-accent-primary truncate block">
        {r.name}
      </Link>
      <p className="text-[11px] text-foreground-muted truncate">
        {sub}
        {!r.reporting && r.last_report_at && (
          <span className="text-warning">{sub ? ' · ' : ''}{t('last report {ago}', { ago: formatTimeSinceUTC(r.last_report_at) ?? '' })}</span>
        )}
      </p>
    </div>
  );
}

function P95Bar({ v }: { v: number | null }) {
  const tone = loadTone(v);
  return (
    <div className="h-1 w-full rounded-full bg-background-tertiary mt-1" aria-hidden="true">
      <div className={`h-1 rounded-full ${TONE_BAR[tone]}`} style={{ width: `${Math.max(0, Math.min(100, v ?? 0))}%` }} />
    </div>
  );
}

const COLUMNS: { key: RankSortKey; label: string; group?: 'cpu' | 'mem' }[] = [
  { key: 'cpu_p95', label: 'p95', group: 'cpu' },
  { key: 'cpu_p99', label: 'p99', group: 'cpu' },
  { key: 'cpu_max', label: 'Peak', group: 'cpu' },
  { key: 'cpu_avg', label: 'Avg', group: 'cpu' },
  { key: 'mem_p95', label: 'p95', group: 'mem' },
  { key: 'mem_max', label: 'Peak', group: 'mem' },
  { key: 'reboots', label: 'Reboots' },
  { key: 'link_drops', label: 'WAN drops' },
];

function RankTable({ t, rows, sortKey, onSort, isAdmin }: {
  t: T; rows: RouterHealthRank[]; sortKey: RankSortKey; onSort: (k: RankSortKey) => void; isAdmin: boolean;
}) {
  const head = (key: RankSortKey, label: string, align = 'text-right') => (
    <th scope="col" className={`px-2 py-2 font-medium ${align}`} aria-sort={sortKey === key ? (key === 'name' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(key)}
        className={`inline-flex items-center gap-1 min-h-[28px] hover:text-foreground ${sortKey === key ? 'text-foreground' : ''}`}
      >
        {label}
        {sortKey === key && <span aria-hidden="true">{key === 'name' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
  return (
    <div className="hidden @3xl:block overflow-x-auto -mx-1">
      <table className="w-full text-sm" data-testid="router-load-table">
        <thead className="text-[11px] uppercase tracking-wide text-foreground-muted">
          <tr className="border-b border-border">
            <th scope="col" className="px-2 py-1" />
            <th scope="colgroup" colSpan={4} className="px-2 pt-1 text-center font-medium">{t('CPU Load')}</th>
            <th scope="colgroup" colSpan={2} className="px-2 pt-1 text-center font-medium">{t('Memory')}</th>
            <th scope="col" colSpan={2} />
          </tr>
          <tr className="border-b border-border">
            {head('name', t('Router'), 'text-left')}
            {COLUMNS.map((c) => <React.Fragment key={c.key}>{head(c.key, t(c.label))}</React.Fragment>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.router_id} className="border-b border-border/60 last:border-0 hover:bg-background-tertiary/40">
              <td className="px-2 py-2 max-w-[260px]"><RouterCell t={t} r={r} isAdmin={isAdmin} /></td>
              <td className="px-2 py-2 text-right w-24"><Pct v={r.cpu_p95} toned /><P95Bar v={r.cpu_p95} /></td>
              <td className="px-2 py-2 text-right"><Pct v={r.cpu_p99} toned /></td>
              <td className="px-2 py-2 text-right"><Pct v={r.cpu_max} /></td>
              <td className="px-2 py-2 text-right"><Pct v={r.cpu_avg} /></td>
              <td className="px-2 py-2 text-right"><Pct v={r.mem_p95} toned /></td>
              <td className="px-2 py-2 text-right"><Pct v={r.mem_max} /></td>
              <td className="px-2 py-2 text-right tabular-nums">{r.reboots}</td>
              <td className="px-2 py-2 text-right"><Drops t={t} r={r} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankCards({ t, rows, isAdmin }: { t: T; rows: RouterHealthRank[]; isAdmin: boolean }) {
  return (
    <ul className="@3xl:hidden space-y-2" data-testid="router-load-cards">
      {rows.map((r) => (
        <li key={r.router_id} className="rounded-xl border border-border p-3">
          <RouterCell t={t} r={r} isAdmin={isAdmin} />
          <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
            <Stat label={t('CPU p95')}><Pct v={r.cpu_p95} toned /><P95Bar v={r.cpu_p95} /></Stat>
            <Stat label={t('CPU p99')}><Pct v={r.cpu_p99} toned /></Stat>
            <Stat label={t('CPU peak')}><Pct v={r.cpu_max} /></Stat>
            <Stat label={t('Mem p95')}><Pct v={r.mem_p95} toned /></Stat>
          </div>
          <p className="mt-2 text-[11px] text-foreground-muted">
            {t('Reboots')}: <span className="text-foreground tabular-nums">{r.reboots}</span>
            {' · '}
            {t('WAN drops')}: <Drops t={t} r={r} />
          </p>
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-foreground-muted">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function NotReporting({ t, rows, isAdmin }: { t: T; rows: RouterHealthRank[]; isAdmin: boolean }) {
  return (
    <details className="card p-3 sm:p-4" data-testid="router-load-not-reporting">
      <summary className="cursor-pointer text-sm font-medium text-foreground min-h-[32px] flex items-center">
        {t('Online but no health readings ({n})', { n: rows.length })}
      </summary>
      <p className="mt-2 text-xs text-foreground-muted">
        {t('These routers are online but sent no CPU or memory readings in this period, so they have no graph and are not ranked. Usually the reporting agent is not installed on them.')}
      </p>
      <ul className="mt-2 divide-y divide-border/60">
        {rows.map((r) => (
          <li key={r.router_id} className="py-2 flex items-center justify-between gap-3">
            <RouterCell t={t} r={r} isAdmin={isAdmin} />
            <span className="text-[11px] text-foreground-muted shrink-0">
              {r.last_report_at
                ? t('last report {ago}', { ago: formatTimeSinceUTC(r.last_report_at) ?? '' })
                : t('never reported')}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
