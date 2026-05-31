'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  DbPoolPattern,
  DbPoolPressureLevel,
  DbPoolResponse,
  DbLongRunningConnection,
} from '../lib/types';

const POLL_INTERVAL_MS = 45_000;

const LEVEL_STYLE: Record<DbPoolPressureLevel, { pill: string; bar: string; text: string; dot: string; ring: string }> = {
  healthy: {
    pill: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    bar: 'bg-emerald-500',
    text: 'text-emerald-500',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-500/30',
  },
  watch: {
    pill: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    bar: 'bg-sky-400',
    text: 'text-sky-400',
    dot: 'bg-sky-400',
    ring: 'ring-sky-500/30',
  },
  warning: {
    pill: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    bar: 'bg-amber-500',
    text: 'text-amber-500',
    dot: 'bg-amber-500',
    ring: 'ring-amber-500/30',
  },
  critical: {
    pill: 'bg-red-500/10 text-red-500 border-red-500/30',
    bar: 'bg-red-500',
    text: 'text-red-500',
    dot: 'bg-red-500',
    ring: 'ring-red-500/30',
  },
};

const PATTERN_LABEL: Record<string, string> = {
  normal_pool_pressure: 'normal',
  moderate_pool_checkout: 'moderate checkout',
  high_pool_checkout: 'high checkout',
  very_high_pool_checkout: 'very high checkout',
  low_checkout_headroom: 'low headroom',
  very_low_checkout_headroom: 'very low headroom',
  overflow_connections_in_use: 'using overflow',
  pool_exhausted: 'pool exhausted',
};

function patternLabel(p: DbPoolPattern): string {
  return PATTERN_LABEL[p] || p.replace(/_/g, ' ');
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 5_000) return 'just now';
    if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
    return `${Math.round(ms / 3_600_000)}h ago`;
  } catch {
    return '—';
  }
}

function formatDuration(secs?: number): string {
  if (!secs && secs !== 0) return '—';
  if (secs < 60) return `${Math.round(secs)}s`;
  if (secs < 3600) return `${Math.round(secs / 60)}m`;
  return `${(secs / 3600).toFixed(1)}h`;
}

export default function DbPoolMonitor() {
  const [data, setData] = useState<DbPoolResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const lastDetailLevelRef = useRef<DbPoolPressureLevel | null>(null);
  const inFlightRef = useRef(false);

  const fetchPool = useCallback(async (withActivity = false, silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      if (!silent) {
        if (withActivity) setDetailLoading(true);
        else setLoading((prev) => prev && true);
      }
      const result = await api.getDbPool(withActivity);
      setData(result);
      setError(null);
      if (withActivity) lastDetailLevelRef.current = result.pool.pressure.level;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load DB pool status');
    } finally {
      setLoading(false);
      setDetailLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  // Initial fetch + polling (pause when tab hidden)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchPool(false, true);
        }
      }, POLL_INTERVAL_MS);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        fetchPool(false, true);
        start();
      } else {
        stop();
      }
    };

    // Initial fetch
    fetchPool(false, false);

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVis);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fetchPool]);

  // Auto-fetch detail once when pressure escalates to warning/critical
  useEffect(() => {
    if (!data) return;
    const level = data.pool.pressure.level;
    if ((level === 'warning' || level === 'critical') && lastDetailLevelRef.current !== level) {
      fetchPool(true, true);
    }
  }, [data, fetchPool]);

  const handleManualRefresh = () => {
    fetchPool(expanded, false);
  };

  const handleToggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && data && data.postgres_activity?.skipped) {
      // Load detail on demand the first time
      fetchPool(true, false);
    }
  };

  if (loading && !data) {
    return (
      <div className="card p-4 sm:p-5 animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-background-tertiary" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 bg-background-tertiary rounded" />
            <div className="h-2.5 w-44 bg-background-tertiary rounded" />
          </div>
          <div className="h-6 w-20 bg-background-tertiary rounded-full" />
        </div>
        <div className="h-2 w-full bg-background-tertiary rounded-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card p-4 sm:p-5 border-danger/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Database Pool</p>
            <p className="text-xs text-danger break-words">{error}</p>
          </div>
          <button onClick={handleManualRefresh} className="btn-secondary text-xs px-3 py-1.5">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { pool } = data;
  const level = pool.pressure.level;
  const style = LEVEL_STYLE[level];
  const pct = Math.min(100, Math.max(0, pool.checked_out_percent));
  const showActivity = !data.postgres_activity?.skipped;

  return (
    <div className={`card p-4 sm:p-5 transition-colors ${level === 'critical' ? 'border-red-500/40' : level === 'warning' ? 'border-amber-500/40' : ''}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-background-tertiary ring-1 ${style.ring}`}>
          <svg className={`w-5 h-5 ${style.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-semibold text-foreground">Database Pool</h3>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium uppercase tracking-wider ${style.pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${level === 'critical' ? 'animate-pulse' : ''}`} />
              {level}
            </span>
          </div>
          <p className="text-xs text-foreground-muted mt-0.5 break-words">{pool.pressure.read}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleManualRefresh}
            disabled={loading || detailLoading}
            className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted transition-colors disabled:opacity-50"
            title="Refresh"
            aria-label="Refresh DB pool"
          >
            <svg className={`w-4 h-4 ${loading || detailLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Gauge */}
      <div className="mb-3">
        <div className="flex items-end justify-between mb-1.5">
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${style.text}`}>{pct.toFixed(1)}%</span>
            <span className="text-[11px] text-foreground-muted">
              {pool.checked_out} / {pool.configured_max_app_connections} in use
            </span>
          </div>
          <span className="text-[11px] text-foreground-muted">
            {pool.checkout_headroom} headroom
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-background-tertiary overflow-hidden">
          <div
            className={`h-full ${style.bar} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[10px] text-foreground-muted">
            base {pool.configured_pool_size} &middot; overflow {pool.configured_max_overflow}
          </p>
          <p className="text-[10px] text-foreground-muted">
            updated {formatRelative(data.generated_at)}
          </p>
        </div>
      </div>

      {/* Patterns */}
      {pool.pressure.patterns.length > 0 && pool.pressure.patterns[0] !== 'normal_pool_pressure' && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {pool.pressure.patterns.map((p) => (
            <span
              key={p}
              className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                p === 'pool_exhausted'
                  ? 'bg-red-500/10 text-red-500 border-red-500/30'
                  : p.startsWith('very_') || p === 'overflow_connections_in_use'
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                  : 'bg-background-tertiary text-foreground-muted border-border'
              }`}
            >
              {patternLabel(p)}
            </span>
          ))}
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={handleToggleExpand}
        className="w-full flex items-center justify-between text-xs text-foreground-muted hover:text-foreground transition-colors py-2 border-t border-border"
      >
        <span className="flex items-center gap-1.5">
          <svg
            className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {expanded ? 'Hide details' : 'Show details'}
        </span>
        {detailLoading && (
          <span className="block w-3 h-3 border-2 border-foreground-muted/30 border-t-foreground-muted rounded-full animate-spin" />
        )}
      </button>

      {expanded && (
        <div className="pt-3 space-y-3 animate-fade-in">
          {/* Activity grids */}
          {showActivity ? (
            <>
              <ActivityGrid title="Connection states" entries={data.postgres_activity.states} />
              <ActivityGrid title="Wait events" entries={data.postgres_activity.wait_events} />
              {typeof data.postgres_activity.total_connections === 'number' && (
                <div className="text-[11px] text-foreground-muted">
                  Total Postgres connections (current DB):{' '}
                  <span className="font-mono text-foreground">{data.postgres_activity.total_connections}</span>
                </div>
              )}

              {/* Long-running connections */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-2 font-semibold">
                  Long-running / idle-in-tx
                </p>
                {data.long_running_connections.length === 0 ? (
                  <p className="text-xs text-foreground-muted py-2">None reported.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-background-tertiary/60">
                        <tr className="text-left text-[10px] uppercase tracking-wider text-foreground-muted">
                          <th className="px-2.5 py-1.5 font-medium">PID</th>
                          <th className="px-2.5 py-1.5 font-medium">State</th>
                          <th className="px-2.5 py-1.5 font-medium">Wait</th>
                          <th className="px-2.5 py-1.5 font-medium">Age</th>
                          <th className="px-2.5 py-1.5 font-medium">Query</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.long_running_connections.map((c: DbLongRunningConnection, i) => (
                          <tr key={`${c.pid ?? i}`} className="border-t border-border align-top">
                            <td className="px-2.5 py-1.5 font-mono text-foreground">{c.pid ?? '—'}</td>
                            <td className="px-2.5 py-1.5 text-foreground-muted">{c.state ?? '—'}</td>
                            <td className="px-2.5 py-1.5 text-foreground-muted">
                              {c.wait_event ? `${c.wait_event_type ?? ''}/${c.wait_event}` : '—'}
                            </td>
                            <td className="px-2.5 py-1.5 text-foreground-muted">{formatDuration(c.query_age_seconds)}</td>
                            <td className="px-2.5 py-1.5 text-foreground-muted">
                              <span className="line-clamp-2 break-words font-mono" title={c.query}>{c.query ?? '—'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-foreground-muted">
              {data.postgres_activity?.reason || 'Loading activity details…'}
            </div>
          )}

          {error && (
            <p className="text-[11px] text-danger break-words">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityGrid({
  title,
  entries,
}: {
  title: string;
  entries?: Record<string, number>;
}) {
  const items = entries ? Object.entries(entries).sort((a, b) => b[1] - a[1]) : [];
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-2 font-semibold">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-foreground-muted">No data.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map(([k, v]) => (
            <div
              key={k}
              className="rounded-lg bg-background-tertiary/50 border border-border p-2 flex items-center justify-between gap-2"
            >
              <span className="text-[11px] text-foreground-muted truncate" title={k}>{k}</span>
              <span className="text-sm font-mono text-foreground tabular-nums">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
