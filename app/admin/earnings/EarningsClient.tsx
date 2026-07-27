'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '../../lib/api';
import {
  AdminEarnings,
  AdminEarningsAccount,
  AdminReseller,
} from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import Header from '../../components/Header';
import { SkeletonCard } from '../../components/LoadingSpinner';
import { formatKES } from '../../lib/format';
import {
  EarningsPeriod, EarningsSourceKey, PERIOD_NOUN, SOURCE_LABELS,
  sourceSwatchStyle, toChartPoints,
} from './earningsChartData';
import PeriodSelector, { type PeriodFilter } from '../PeriodSelector';

const EarningsChart = dynamic(() => import('./EarningsCharts'), {
  ssr: false,
  loading: () => <div className="h-[300px] rounded-xl bg-background-tertiary/60 animate-pulse" />,
});

type LegendKey = EarningsSourceKey;

/** The shared chips speak '7d'|'30d'|…; the earnings API speaks calendar periods. */
const PERIOD_FOR_CHIP: Record<PeriodFilter, EarningsPeriod> = {
  '7d': 'week', '30d': 'month', '90d': 'quarter', '1y': 'year',
};

const formatSigned = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

const accountLabel = (account: AdminEarningsAccount): string =>
  account.organization_name?.trim() || account.email;

// ---------- Sub-components ----------

function SourceLegend({
  entries,
  runningTotal,
}: {
  entries: { key: LegendKey; label: string; total: number }[];
  runningTotal: number | null;
}) {
  return (
    <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-[11px]">
      {entries.map((entry) => (
        <span key={entry.key} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={sourceSwatchStyle(entry.key)} />
          <span className="text-foreground-muted">{entry.label}</span>
          <span className="text-foreground font-medium tabular-nums">{formatKES(entry.total)}</span>
        </span>
      ))}
      {runningTotal !== null && (
        <span className="flex items-center gap-1.5">
          <span className="text-foreground-muted">Total so far</span>
          <span className="text-foreground font-medium tabular-nums">{formatKES(runningTotal)}</span>
        </span>
      )}
    </div>
  );
}


function BreakdownTable({ data }: { data: AdminEarnings }) {
  const total = data.totals.combined;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <caption className="sr-only">
          Earnings by stream for the selected period
        </caption>
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-foreground-muted">
            <th scope="col" className="py-2 pr-3 font-medium">Source</th>
            <th scope="col" className="py-2 px-3 font-medium text-right">This period</th>
            <th scope="col" className="py-2 px-3 font-medium text-right">Share</th>
            <th scope="col" className="py-2 pl-3 font-medium text-right">Previous period</th>
          </tr>
        </thead>
        <tbody>
          {/* The chart compares two businesses; the table keeps the detail,
              indenting the system sub-lines under their parent. */}
          {[
            { key: 'system' as const, label: SOURCE_LABELS.system, total: data.totals.system, prev: data.previous_totals.system, sub: false },
            ...data.streams
              .filter((s) => s.group === 'system')
              .map((s) => ({ key: s.key, label: s.label, total: s.total, prev: data.previous_totals[s.key] ?? 0, sub: true })),
            { key: 'reseller' as const, label: SOURCE_LABELS.reseller, total: data.totals.reseller, prev: data.previous_totals.reseller, sub: false },
          ].map((row) => (
            <tr key={row.key} className="border-t border-border">
              <th scope="row" className={`py-2.5 pr-3 font-normal ${row.sub ? 'pl-5' : ''}`}>
                <span className="flex items-center gap-2">
                  {row.sub ? (
                    <span className="w-2.5 shrink-0 text-foreground-muted/50 text-[10px] leading-none">└</span>
                  ) : (
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={sourceSwatchStyle(row.key === 'reseller' ? 'reseller' : 'system')}
                    />
                  )}
                  <span className={`whitespace-nowrap ${row.sub ? 'text-foreground-muted' : 'text-foreground'}`}>
                    {row.label}
                  </span>
                </span>
              </th>
              <td className={`py-2.5 px-3 text-right tabular-nums whitespace-nowrap ${
                row.sub ? 'text-foreground-muted' : 'text-foreground font-medium'
              }`}>
                {formatKES(row.total)}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-foreground-muted whitespace-nowrap">
                {total > 0 ? `${((row.total / total) * 100).toFixed(1)}%` : '—'}
              </td>
              <td className="py-2.5 pl-3 text-right tabular-nums text-foreground-muted whitespace-nowrap">
                {formatKES(row.prev)}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-border">
            <th scope="row" className="py-2.5 pr-3 text-foreground font-semibold">Total</th>
            <td className="py-2.5 px-3 text-right tabular-nums text-foreground font-semibold whitespace-nowrap">
              {formatKES(total)}
            </td>
            <td className="py-2.5 px-3 text-right tabular-nums text-foreground-muted whitespace-nowrap">100%</td>
            <td className="py-2.5 pl-3 text-right tabular-nums text-foreground-muted whitespace-nowrap">
              {formatKES(data.previous_totals.combined)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function OwnAccountsCard({
  accounts,
  onSaved,
}: {
  accounts: AdminEarningsAccount[];
  onSaved: () => void;
}) {
  const { showAlert } = useAlert();
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AdminReseller[]>([]);
  const [selected, setSelected] = useState<AdminEarningsAccount[]>(accounts);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchSeq = useRef(0);

  useEffect(() => { setSelected(accounts); }, [accounts]);

  useEffect(() => {
    if (!editing) return;
    const term = search.trim();
    if (term.length < 2) { setResults([]); return; }

    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = window.setTimeout(() => {
      api.getAdminResellers({ search: term })
        .then((res) => { if (searchSeq.current === seq) setResults(res.resellers.slice(0, 8)); })
        .catch(() => { if (searchSeq.current === seq) setResults([]); })
        .finally(() => { if (searchSeq.current === seq) setSearching(false); });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, editing]);

  const add = (reseller: AdminReseller) => {
    if (selected.some((a) => a.id === reseller.id)) return;
    setSelected([...selected, {
      id: reseller.id,
      organization_name: reseller.organization_name,
      email: reseller.email,
    }]);
    setSearch('');
    setResults([]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.setAdminOwnResellerAccounts(selected.map((a) => a.id));
      showAlert('success', 'Saved. Earnings now include these accounts.');
      setEditing(false);
      onSaved();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Could not save accounts');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">My reseller accounts</h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            Collections from these accounts count as ours. Their own subscription
            payments are left out — paying yourself isn&apos;t income.
          </p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-accent-primary hover:underline shrink-0">
            {accounts.length ? 'Edit' : 'Choose'}
          </button>
        )}
      </div>

      {!editing ? (
        accounts.length ? (
          <div className="flex flex-wrap gap-2">
            {accounts.map((account) => (
              <span key={account.id} className="inline-flex items-center gap-2 rounded-lg bg-background-tertiary/60 px-2.5 py-1.5 text-xs">
                <span className="text-foreground">{accountLabel(account)}</span>
                <span className="text-foreground-muted">{account.email}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-foreground-muted">
            None selected yet — the reseller band stays at zero until you pick one.
          </p>
        )
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {selected.map((account) => (
              <button
                key={account.id}
                onClick={() => setSelected(selected.filter((a) => a.id !== account.id))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary/10 border border-accent-primary/20 px-2.5 py-1.5 text-xs text-foreground hover:bg-accent-primary/20 transition-colors"
              >
                {accountLabel(account)}
                <svg className="w-3 h-3 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ))}
            {selected.length === 0 && (
              <span className="text-xs text-foreground-muted">No accounts selected</span>
            )}
          </div>

          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resellers by name or email…"
              className="input w-full text-sm"
            />
            {(results.length > 0 || searching) && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-background-secondary shadow-lg overflow-hidden">
                {searching && results.length === 0 ? (
                  <p className="px-3 py-2.5 text-xs text-foreground-muted">Searching…</p>
                ) : (
                  results.map((reseller) => (
                    <button
                      key={reseller.id}
                      onClick={() => add(reseller)}
                      className="w-full text-left px-3 py-2.5 hover:bg-background-tertiary transition-colors"
                    >
                      <p className="text-xs font-medium text-foreground">{reseller.organization_name || reseller.email}</p>
                      <p className="text-[10px] text-foreground-muted">{reseller.email}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setSelected(accounts); setSearch(''); }}
              className="text-xs text-foreground-muted hover:text-foreground px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Main ----------

export default function EarningsClient() {
  const { user } = useAuth();

  const [chip, setChip] = useState<PeriodFilter>('30d');
  const [mode, setMode] = useState<'bucket' | 'cumulative'>('bucket');
  const period = PERIOD_FOR_CHIP[chip];

  const [data, setData] = useState<AdminEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await api.getAdminEarnings(period);
      if (loadSeq.current !== seq) return;
      setData(result);
    } catch (err) {
      if (loadSeq.current !== seq) return;
      setError(err instanceof Error ? err.message : 'Failed to load earnings');
    } finally {
      if (loadSeq.current === seq) setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const chartPoints = useMemo(
    () => toChartPoints(data?.series ?? [], mode === 'cumulative'),
    [data, mode],
  );

  const legendEntries = useMemo(() => {
    if (!data) return [];
    return [
      { key: 'system' as const, label: SOURCE_LABELS.system, total: data.totals.system },
      { key: 'reseller' as const, label: SOURCE_LABELS.reseller, total: data.totals.reseller },
    ];
  }, [data]);

  const rangeLabel = PERIOD_NOUN[period];

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-danger mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
          <p className="text-foreground-muted text-sm">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Header
        title="Earnings"
        subtitle="Everything we make, by where it comes from"
        backHref="/admin"
      />

      {loading && !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="card p-4 h-[380px] animate-pulse bg-background-secondary" />
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-danger mb-4">{error}</p>
          <button onClick={load} className="btn-primary px-4 py-2 text-sm">Retry</button>
        </div>
      ) : data ? (
        <>
          {/* Hero — lifetime total, the number the whole page is about */}
          <div className="card p-5 sm:p-6">
            <p className="text-[10px] uppercase tracking-wider text-foreground-muted">Total earned, all time</p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground mt-1 tabular-nums">
              {formatKES(data.all_time.combined)}
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-xs text-foreground-muted">
              <span>
                Selling the system{' '}
                <strong className="text-foreground tabular-nums">{formatKES(data.all_time.system)}</strong>
              </span>
              <span>
                Own reseller{' '}
                <strong className="text-foreground tabular-nums">{formatKES(data.all_time.reseller)}</strong>
              </span>
            </div>
          </div>

          {/* Period headlines */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {([
              { label: `Combined · ${rangeLabel}`, value: data.totals.combined, change: data.change_percent.combined },
              { label: 'System sales', value: data.totals.system, change: data.change_percent.system },
              { label: SOURCE_LABELS.reseller, value: data.totals.reseller, change: data.change_percent.reseller },
            ]).map((tile) => (
              <div key={tile.label} className="card p-4 sm:p-5">
                <p className="text-[10px] uppercase tracking-wider text-foreground-muted">{tile.label}</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 tabular-nums">
                  {formatKES(tile.value)}
                </p>
                <p className={`text-xs mt-1 ${tile.change >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                  {formatSigned(tile.change)}{' '}
                  <span className="text-foreground-muted">{data.comparison_label}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Earnings over time</h2>
                <p className="text-[11px] text-foreground-muted mt-0.5">
                  {data.granularity === 'month' ? 'Monthly' : data.granularity === 'week' ? 'Weekly' : 'Daily'} buckets
                  {' · '}avg {formatKES(data.average_per_bucket)} per bucket
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-background-tertiary/50 rounded-xl p-1">
                  {([
                    { value: 'bucket' as const, label: 'Per day' },
                    { value: 'cumulative' as const, label: 'Running total' },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setMode(opt.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        mode === opt.value
                          ? 'bg-accent-primary text-white shadow-sm'
                          : 'text-foreground-muted hover:text-foreground hover:bg-background-tertiary'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <PeriodSelector value={chip} onChange={setChip} />
              </div>
            </div>

            <div className="mb-4">
              <SourceLegend entries={legendEntries} runningTotal={mode === 'bucket' ? data.totals.combined : null} />
            </div>

            {loading ? (
              <div className="h-[300px] rounded-xl bg-background-tertiary/60 animate-pulse" />
            ) : data.totals.combined === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-foreground-muted text-xs">
                Nothing recorded {rangeLabel} yet
              </div>
            ) : (
              <EarningsChart data={chartPoints} mode={mode} />
            )}
          </div>

          {/* Breakdown + account picker */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <div className="card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Breakdown · {rangeLabel}</h3>
              <BreakdownTable data={data} />
            </div>
            <OwnAccountsCard accounts={data.own_reseller_accounts} onSaved={load} />
          </div>
        </>
      ) : null}
    </div>
  );
}
