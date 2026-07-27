'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '../../lib/api';
import {
  AdminEarnings,
  AdminEarningsAccount,
  AdminEarningsStream,
  AdminEarningsStreamKey,
  AdminReseller,
} from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import Header from '../../components/Header';
import { SkeletonCard } from '../../components/LoadingSpinner';
import { formatKES } from '../../lib/format';
import { streamSwatchStyle } from './EarningsCharts';

const EarningsChart = dynamic(() => import('./EarningsCharts'), {
  ssr: false,
  loading: () => <div className="h-[300px] rounded-xl bg-background-tertiary/60 animate-pulse" />,
});

type ViewMode = 'period' | 'cumulative';

const PERIOD_OPTIONS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
] as const;

type PeriodValue = (typeof PERIOD_OPTIONS)[number]['value'];

const formatSigned = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

const accountLabel = (account: AdminEarningsAccount): string =>
  account.organization_name?.trim() || account.email;

// ---------- Sub-components ----------

function RangeFilter({
  period,
  customDays,
  onPeriod,
  onCustomDays,
}: {
  period: PeriodValue;
  customDays: number | null;
  onPeriod: (value: PeriodValue) => void;
  onCustomDays: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setDraft('');
      onCustomDays(null);
      return;
    }
    const clamped = Math.min(parsed, 1095);
    setDraft(String(clamped));
    onCustomDays(clamped);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 bg-background-tertiary/50 rounded-xl p-1">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setDraft(''); onCustomDays(null); onPeriod(opt.value); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              !customDays && period === opt.value
                ? 'bg-accent-primary text-white shadow-sm'
                : 'text-foreground-muted hover:text-foreground hover:bg-background-tertiary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 transition-colors ${
        customDays ? 'border-accent-primary/40 bg-accent-primary/5' : 'border-border'
      }`}>
        <input
          type="number"
          min={1}
          max={1095}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
          placeholder="Custom"
          aria-label="Custom range in days"
          className="w-16 bg-transparent text-xs text-foreground placeholder:text-foreground-muted focus:outline-none"
        />
        <span className="text-[10px] text-foreground-muted">days</span>
      </div>
    </div>
  );
}

function StreamLegend({
  streams,
  hidden,
  onToggle,
}: {
  streams: AdminEarningsStream[];
  hidden: Set<AdminEarningsStreamKey>;
  onToggle: (key: AdminEarningsStreamKey) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {streams.map((stream) => {
        const off = hidden.has(stream.key);
        return (
          <button
            key={stream.key}
            onClick={() => onToggle(stream.key)}
            aria-pressed={!off}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] transition-all ${
              off
                ? 'border-border text-foreground-muted/60 opacity-60'
                : 'border-border-hover text-foreground hover:bg-background-tertiary/60'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={off ? { backgroundColor: 'var(--color-foreground-muted)', opacity: 0.35 } : streamSwatchStyle(stream.key)}
            />
            <span className="whitespace-nowrap">{stream.label}</span>
            <span className="tabular-nums font-medium">{formatKES(stream.total)}</span>
          </button>
        );
      })}
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
            <th scope="col" className="py-2 pr-3 font-medium">Stream</th>
            <th scope="col" className="py-2 px-3 font-medium text-right">This period</th>
            <th scope="col" className="py-2 px-3 font-medium text-right">Share</th>
            <th scope="col" className="py-2 pl-3 font-medium text-right">Previous period</th>
          </tr>
        </thead>
        <tbody>
          {data.streams.map((stream) => (
            <tr key={stream.key} className="border-t border-border">
              <th scope="row" className="py-2.5 pr-3 font-normal">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={streamSwatchStyle(stream.key)} />
                  <span className="text-foreground whitespace-nowrap">{stream.label}</span>
                </span>
              </th>
              <td className="py-2.5 px-3 text-right tabular-nums text-foreground font-medium whitespace-nowrap">
                {formatKES(stream.total)}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-foreground-muted whitespace-nowrap">
                {total > 0 ? `${((stream.total / total) * 100).toFixed(1)}%` : '—'}
              </td>
              <td className="py-2.5 pl-3 text-right tabular-nums text-foreground-muted whitespace-nowrap">
                {formatKES(data.previous_totals[stream.key] ?? 0)}
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

  const [period, setPeriod] = useState<PeriodValue>('30d');
  const [customDays, setCustomDays] = useState<number | null>(null);
  const [mode, setMode] = useState<ViewMode>('period');
  const [hidden, setHidden] = useState<Set<AdminEarningsStreamKey>>(new Set());

  const [data, setData] = useState<AdminEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await api.getAdminEarnings(period, customDays ?? undefined);
      if (loadSeq.current !== seq) return;
      setData(result);
    } catch (err) {
      if (loadSeq.current !== seq) return;
      setError(err instanceof Error ? err.message : 'Failed to load earnings');
    } finally {
      if (loadSeq.current === seq) setLoading(false);
    }
  }, [period, customDays]);

  useEffect(() => { load(); }, [load]);

  const toggleStream = (key: AdminEarningsStreamKey) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      // Never let the chart go completely empty.
      if (data && next.size >= data.streams.length) return prev;
      return next;
    });
  };

  const visibleStreams = useMemo(
    () => (data?.streams ?? []).filter((s) => !hidden.has(s.key)),
    [data, hidden],
  );

  const rangeLabel = customDays
    ? `Last ${customDays} days`
    : PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period;

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
              { label: 'My reseller collections', value: data.totals.reseller, change: data.change_percent.reseller },
            ]).map((tile) => (
              <div key={tile.label} className="card p-4 sm:p-5">
                <p className="text-[10px] uppercase tracking-wider text-foreground-muted">{tile.label}</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 tabular-nums">
                  {formatKES(tile.value)}
                </p>
                <p className={`text-xs mt-1 ${tile.change >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                  {formatSigned(tile.change)} <span className="text-foreground-muted">vs previous {data.days} days</span>
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
                    { value: 'period' as const, label: 'Per bucket' },
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
                <RangeFilter
                  period={period}
                  customDays={customDays}
                  onPeriod={setPeriod}
                  onCustomDays={setCustomDays}
                />
              </div>
            </div>

            <div className="mb-4">
              <StreamLegend streams={data.streams} hidden={hidden} onToggle={toggleStream} />
            </div>

            {loading ? (
              <div className="h-[300px] rounded-xl bg-background-tertiary/60 animate-pulse" />
            ) : data.totals.combined === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-foreground-muted text-xs">
                No earnings recorded in this window
              </div>
            ) : (
              <EarningsChart data={data.series} streams={visibleStreams} mode={mode} />
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
