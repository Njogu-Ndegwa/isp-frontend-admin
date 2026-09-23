'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import {
  OpsHealthAlert,
  OpsHealthHistoryPoint,
  OpsHealthLatency,
  OpsHealthResponse,
  OpsHealthStatus,
  OpsHealthTunnelBacklog,
  OpsHealthTunnelLatency,
} from '../lib/types';

// Backend order: primary planes, then insurance planes, then unclassified.
const TUNNEL_ORDER = ['wireguard', 'l2tp', 'wg2_insurance', 'aws_insurance', 'other'];
const TUNNEL_LABEL: Record<string, string> = {
  wireguard: 'WireGuard',
  l2tp: 'L2TP',
  wg2_insurance: 'wg2 ins.',
  aws_insurance: 'AWS ins.',
  other: 'other',
};

function tunnelLabel(t: string | null | undefined): string {
  return t ? (TUNNEL_LABEL[t] ?? t) : '—';
}

function orderedTunnels(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ia = TUNNEL_ORDER.indexOf(a);
    const ib = TUNNEL_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

const POLL_INTERVAL_MS = 60_000;
const CLOCK_TICK_MS = 15_000;
const STALE_AFTER_SECONDS = 180;

type StatusStyle = { pill: string; dot: string; text: string; ring: string; border: string };

const STATUS_STYLE: Record<OpsHealthStatus, StatusStyle> = {
  healthy: {
    pill: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    dot: 'bg-emerald-500',
    text: 'text-emerald-500',
    ring: 'ring-emerald-500/30',
    border: '',
  },
  watch: {
    pill: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    dot: 'bg-sky-400',
    text: 'text-sky-400',
    ring: 'ring-sky-500/30',
    border: '',
  },
  warning: {
    pill: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    dot: 'bg-amber-500',
    text: 'text-amber-500',
    ring: 'ring-amber-500/30',
    border: 'border-amber-500/40',
  },
  critical: {
    pill: 'bg-red-500/10 text-red-500 border-red-500/30',
    dot: 'bg-red-500',
    text: 'text-red-500',
    ring: 'ring-red-500/30',
    border: 'border-red-500/40',
  },
  unknown: {
    pill: 'bg-background-tertiary text-foreground-muted border-border',
    dot: 'bg-foreground-muted',
    text: 'text-foreground-muted',
    ring: 'ring-border',
    border: '',
  },
};

const SEVERITY_RANK: Record<string, number> = { critical: 0, warning: 1 };

function styleFor(status: string | null | undefined): StatusStyle {
  return status && status in STATUS_STYLE ? STATUS_STYLE[status as OpsHealthStatus] : STATUS_STYLE.unknown;
}

function formatRelative(iso: string | null | undefined, now: number): string {
  if (!iso) return '—';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '—';
  const ms = now - ts;
  if (ms < 5_000) return 'just now';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function formatSeconds(secs: number | null | undefined): string {
  if (secs === null || secs === undefined || Number.isNaN(secs)) return '—';
  if (secs < 10) return `${secs.toFixed(1)}s`;
  if (secs < 60) return `${Math.round(secs)}s`;
  if (secs < 3600) return `${(secs / 60).toFixed(1)}m`;
  return `${(secs / 3600).toFixed(1)}h`;
}

function formatMinutes(mins: number | null | undefined): string {
  if (mins === null || mins === undefined || Number.isNaN(mins)) return '—';
  if (mins < 1) return '<1m';
  if (mins < 60) return `${Math.round(mins)}m`;
  if (mins < 1440) return `${(mins / 60).toFixed(1)}h`;
  return `${(mins / 1440).toFixed(1)}d`;
}

function formatPercent(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return '—';
  return `${Math.round(ratio * 100)}%`;
}

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toLocaleString();
}

/** "61s ×9.8" — p95 with its ratio against the 7-day baseline when one exists. */
function latencyLabel(l: OpsHealthLatency | null | undefined): { value: string; ratio: string | null; ratioValue: number | null } {
  if (!l) return { value: '—', ratio: null, ratioValue: null };
  const ratio = typeof l.ratio === 'number' && Number.isFinite(l.ratio) ? l.ratio : null;
  return {
    value: formatSeconds(l.p95),
    ratio: ratio === null ? null : `×${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}`,
    ratioValue: ratio,
  };
}

function ratioTone(ratio: number | null): string {
  if (ratio === null) return 'text-foreground-muted';
  if (ratio >= 4) return 'text-red-500';
  if (ratio >= 2) return 'text-amber-500';
  return 'text-foreground-muted';
}

function series(points: OpsHealthHistoryPoint[] | undefined, key: keyof OpsHealthHistoryPoint): Array<number | null> {
  if (!points) return [];
  return points.map((p) => {
    const v = p[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  });
}

// ---------------------------------------------------------------------------
// Sparkline — tiny inline SVG, no chart library. Gaps (null) break the line.
// ---------------------------------------------------------------------------

function Sparkline({ values, label, className = '' }: { values: Array<number | null>; label: string; className?: string }) {
  const numeric = values.filter((v): v is number => v !== null);
  if (numeric.length < 2) {
    return (
      <div className={`h-6 flex items-center ${className}`} aria-label={`${label}: no history`}>
        <span className="text-[10px] text-foreground-muted/70">no history yet</span>
      </div>
    );
  }
  const W = 100;
  const H = 24;
  const PAD = 2;
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const span = max - min || 1;
  const stepX = values.length > 1 ? (W - PAD * 2) / (values.length - 1) : 0;
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);

  // Build one path per contiguous run so nulls leave a visible gap.
  // A plain loop (not forEach) so TypeScript's control-flow analysis sees the
  // assignment to lastPoint; inside a callback it narrows the variable to null.
  const segments: string[] = [];
  let current: string[] = [];
  let lastPoint: { x: number; y: number } | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
      continue;
    }
    const px = PAD + i * stepX;
    const py = y(v);
    current.push(`${current.length === 0 ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)}`);
    lastPoint = { x: px, y: py };
  }
  if (current.length > 1) segments.push(current.join(' '));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`w-full h-6 overflow-visible ${className}`}
      role="img"
      aria-label={`${label}, last ${numeric.length} samples, min ${min}, max ${max}`}
    >
      {segments.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={1.25} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {segments.length === 0 && (
        <path d={`M${PAD},${H / 2} L${W - PAD},${H / 2}`} fill="none" stroke="currentColor" strokeWidth={1} strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
      )}
      {lastPoint && <circle cx={lastPoint.x} cy={lastPoint.y} r={1.6} fill="currentColor" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function StatusPill({ status, pulse = false }: { status: string | null | undefined; pulse?: boolean }) {
  const s = styleFor(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium uppercase tracking-wider ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${pulse && status === 'critical' ? 'animate-pulse' : ''}`} />
      {status || 'unknown'}
    </span>
  );
}

function Metric({ label, value, tone = 'text-foreground', suffix, suffixTone = 'text-foreground-muted' }: {
  label: string;
  value: string;
  tone?: string;
  suffix?: string | null;
  suffixTone?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-foreground-muted truncate" title={label}>{label}</p>
      <p className={`text-sm font-semibold tabular-nums leading-tight truncate ${tone}`}>
        {value}
        {suffix ? <span className={`ml-1 text-[11px] font-medium ${suffixTone}`}>{suffix}</span> : null}
      </p>
    </div>
  );
}

function Tile({ title, status, children, footer }: {
  title: string;
  status: string | null | undefined;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const s = styleFor(status);
  return (
    <div className={`rounded-xl border bg-background-tertiary/40 p-2.5 sm:p-3 flex flex-col gap-2 min-w-0 ${s.border || 'border-border'}`} data-ops-tile={title}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} title={`${title}: ${status || 'unknown'}`} aria-label={`${title} status ${status || 'unknown'}`} />
        <p className="text-xs font-semibold text-foreground truncate">{title}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">{children}</div>
      {footer ? <div className="mt-auto pt-1 space-y-1">{footer}</div> : null}
    </div>
  );
}

function TunnelBadge({ tunnel }: { tunnel: string | null | undefined }) {
  if (!tunnel) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-background-tertiary text-[10px] uppercase tracking-wider text-foreground-muted flex-shrink-0" data-tunnel={tunnel}>
      {tunnelLabel(tunnel)}
    </span>
  );
}

/**
 * Per-tunnel rows inside a tile: "WireGuard  call 1.9s ×1.0  e2e 4.1s  backlog 0".
 * The point is to see one plane drift while the other stays flat.
 */
function TunnelRows({ latency, backlog, hot, removal }: {
  latency?: Partial<Record<string, OpsHealthTunnelLatency>>;
  backlog?: Partial<Record<string, OpsHealthTunnelBacklog>>;
  hot?: Partial<Record<string, { routers: number; customers: number }>>;
  removal?: Partial<Record<string, OpsHealthLatency>>;
}) {
  const keys = orderedTunnels(Array.from(new Set([
    ...Object.keys(latency ?? {}),
    ...Object.keys(backlog ?? {}),
    ...Object.keys(hot ?? {}),
    ...Object.keys(removal ?? {}),
  ])));
  if (keys.length === 0) return null;
  return (
    <ul className="space-y-0.5" data-testid="ops-health-tunnel-rows">
      {keys.map((t) => {
        const lat = latency?.[t];
        const call = latencyLabel(lat?.router_call);
        const e2e = latencyLabel(lat?.end_to_end);
        const rm = latencyLabel(removal?.[t]);
        const b = backlog?.[t];
        const h = hot?.[t];
        const worstRatio = Math.max(call.ratioValue ?? 0, e2e.ratioValue ?? 0, rm.ratioValue ?? 0);
        return (
          <li key={t} className="flex items-center gap-1.5 text-[11px] leading-tight min-w-0" data-tunnel={t}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${worstRatio >= 4 ? 'bg-red-500' : worstRatio >= 2 ? 'bg-amber-500' : 'bg-foreground-muted/40'}`} />
            <span className="font-medium text-foreground w-16 truncate flex-shrink-0" title={t}>{tunnelLabel(t)}</span>
            {lat ? (
              <>
                <span className="text-foreground-muted tabular-nums whitespace-nowrap">
                  call <span className={`font-semibold ${ratioTone(call.ratioValue)}`}>{call.value}</span>{call.ratio ? <span className={ratioTone(call.ratioValue)}> {call.ratio}</span> : null}
                </span>
                <span className="text-foreground-muted tabular-nums whitespace-nowrap hidden sm:inline">
                  e2e <span className="font-semibold text-foreground">{e2e.value}</span>
                </span>
              </>
            ) : null}
            {removal?.[t] ? (
              <span className="text-foreground-muted tabular-nums whitespace-nowrap">
                p95 <span className={`font-semibold ${ratioTone(rm.ratioValue)}`}>{rm.value}</span>{rm.ratio ? <span className={ratioTone(rm.ratioValue)}> {rm.ratio}</span> : null}
              </span>
            ) : null}
            {b ? (
              <span className={`ml-auto tabular-nums whitespace-nowrap ${b.routers_with_backlog > 0 ? 'text-amber-500' : 'text-foreground-muted'}`} title={`${b.pending} pending on ${b.routers} routers`}>
                {formatNumber(b.pending)} pend · {formatNumber(b.routers_with_backlog)} rtr
              </span>
            ) : null}
            {h ? (
              <span className="ml-auto tabular-nums whitespace-nowrap text-foreground-muted" title={`${h.customers} expired-but-active on ${h.routers} routers`}>
                {formatNumber(h.customers)} on {formatNumber(h.routers)} rtr
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function DetailToggle({ label, open, onClick, count }: { label: string; open: boolean; onClick: () => void; count?: number | null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="w-full flex items-center justify-between text-[11px] text-foreground-muted hover:text-foreground transition-colors"
    >
      <span className="truncate">{label}{typeof count === 'number' ? ` (${count})` : ''}</span>
      <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

function HeartbeatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h4l2-5 4 10 2-5h6" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

type Detail = 'routers' | 'jobs' | 'instances' | null;

export default function OpsHealthPanel() {
  const [data, setData] = useState<OpsHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchFailed, setLastFetchFailed] = useState(false);
  const [detail, setDetail] = useState<Detail>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const inFlightRef = useRef(false);

  const fetchHealth = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent) setLoading(true);
    try {
      const result = await api.getOpsHealth();
      if (result) {
        setData(result);
        setLastFetchFailed(false);
      } else {
        setLastFetchFailed(true);
      }
      setNow(Date.now());
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  // Poll every 60 s; pause while the tab is hidden.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (!document.hidden) fetchHealth(true);
      }, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVis = () => {
      if (document.hidden) {
        stop();
      } else {
        fetchHealth(true);
        start();
      }
    };
    fetchHealth(false);
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fetchHealth]);

  // Keep the "updated Xs ago" labels moving between polls.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(t);
  }, []);

  const toggleDetail = (d: Exclude<Detail, null>) => setDetail((prev) => (prev === d ? null : d));

  if (loading && !data) {
    return (
      <div className="card p-4 sm:p-5 animate-pulse" data-testid="ops-health-panel">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-background-tertiary" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-36 bg-background-tertiary rounded" />
            <div className="h-2.5 w-48 bg-background-tertiary rounded" />
          </div>
          <div className="h-6 w-20 bg-background-tertiary rounded-full" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-background-tertiary" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card p-4 sm:p-5" data-testid="ops-health-panel">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-background-tertiary flex items-center justify-center ring-1 ring-border flex-shrink-0">
            <HeartbeatIcon className="w-5 h-5 text-foreground-muted" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-semibold text-foreground">Operations health</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium uppercase tracking-wider bg-background-tertiary text-foreground-muted border-border">unavailable</span>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">
              {lastFetchFailed ? 'The ops-health endpoint did not respond. It may not be deployed yet.' : 'No snapshot loaded.'}
            </p>
          </div>
          <button onClick={() => fetchHealth(false)} className="btn-secondary text-xs px-3 py-1.5" disabled={loading}>Retry</button>
        </div>
      </div>
    );
  }

  const overall = data.overall_status;
  const overallStyle = styleFor(overall);
  const ageSeconds = typeof data.snapshot_age_seconds === 'number'
    ? data.snapshot_age_seconds
    : Math.max(0, Math.round((now - new Date(data.generated_at).getTime()) / 1000));
  const stale = ageSeconds > STALE_AFTER_SECONDS;
  const alerts: OpsHealthAlert[] = [...(data.alerts ?? [])].sort(
    (a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9),
  );
  const sec = data.sections;
  const points = data.history?.points ?? [];

  const prov = sec?.provisioning;
  const pay = sec?.payments;
  const exp = sec?.expiry;
  const tun = sec?.tunnels;
  const cp = sec?.control_plane;
  const sn = sec?.safety_net;
  const jobs = sec?.jobs;
  const pool = sec?.db_pool;

  const provE2E = latencyLabel(prov?.latency?.end_to_end);
  const payCb = latencyLabel(pay?.callback_latency);
  const expRm = latencyLabel(exp?.removal_latency);
  const staleJobs = (jobs?.items ?? []).filter((j) => j.stale).length;
  const multiWriter = (cp?.active_writers ?? 0) > 1;

  return (
    <div className={`card p-4 sm:p-5 transition-colors ${overallStyle.border}`} data-testid="ops-health-panel">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-background-tertiary ring-1 ${overallStyle.ring}`}>
          <HeartbeatIcon className={`w-5 h-5 ${overallStyle.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-semibold text-foreground">Operations health</h3>
            <StatusPill status={overall} pulse />
            {stale && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium uppercase tracking-wider bg-background-tertiary text-foreground-muted border-border" title={`Snapshot is ${formatSeconds(ageSeconds)} old`}>
                stale snapshot
              </span>
            )}
          </div>
          <p className="text-xs text-foreground-muted mt-0.5">
            updated {formatRelative(data.generated_at, now)}
            {lastFetchFailed ? <span className="text-amber-500"> · last refresh failed</span> : null}
          </p>
        </div>
        <button
          onClick={() => fetchHealth(false)}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted transition-colors disabled:opacity-50 flex-shrink-0"
          title="Refresh"
          aria-label="Refresh operations health"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Alerts */}
      <div className="mb-3" data-testid="ops-health-alerts">
        {alerts.length === 0 ? (
          <p className="text-xs text-foreground-muted py-1">No active alerts</p>
        ) : (
          <ul className="space-y-1.5">
            {alerts.map((a) => {
              const s = styleFor(a.severity);
              return (
                <li key={a.key} className={`rounded-lg border px-2.5 py-2 bg-background-tertiary/40 ${s.border || 'border-border'}`} data-alert-key={a.key}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 ${s.pill}`}>{a.severity}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground break-words">{a.title}</p>
                      <p className="text-[11px] text-foreground-muted break-words">{a.message}</p>
                    </div>
                    <span className="text-[10px] text-foreground-muted whitespace-nowrap flex-shrink-0" title={a.since ?? undefined}>
                      since {formatRelative(a.since, now)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Section tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Provisioning */}
        <Tile
          title="Provisioning"
          status={prov?.status}
          footer={
            <>
              <TunnelRows latency={prov?.latency?.by_tunnel} backlog={prov?.backlog_by_tunnel} />
              <div className="text-foreground-muted/80"><Sparkline values={series(points, 'provisioning_retry_pending')} label="Retry pending, 24h" /></div>
              <div className="text-foreground-muted/80"><Sparkline values={series(points, 'provisioning_p95_end_to_end')} label="End-to-end p95, 24h" /></div>
              <DetailToggle
                label="Top routers with backlog"
                count={prov?.routers_with_backlog ?? prov?.top_routers?.length ?? 0}
                open={detail === 'routers'}
                onClick={() => toggleDetail('routers')}
              />
            </>
          }
        >
          <Metric label="Retry pending" value={formatNumber(prov?.counts?.retry_pending)} />
          <Metric label="Success" value={formatPercent(prov?.success_ratio)} />
          <Metric label="E2E p95" value={provE2E.value} suffix={provE2E.ratio} suffixTone={ratioTone(provE2E.ratioValue)} />
          <Metric label="In progress" value={formatNumber(prov?.counts?.in_progress)} />
        </Tile>

        {/* Payments */}
        <Tile
          title="Payments"
          status={pay?.status}
          footer={<div className="text-foreground-muted/80"><Sparkline values={series(points, 'payments_p95_callback')} label="Callback p95, 24h" /></div>}
        >
          <Metric label="Pending >5m" value={formatNumber(pay?.counts?.pending_over_5m)} />
          <Metric label="Callback p95" value={payCb.value} suffix={payCb.ratio} suffixTone={ratioTone(payCb.ratioValue)} />
          <Metric label="Last completed" value={pay?.minutes_since_last_completed == null ? '—' : `${formatMinutes(pay.minutes_since_last_completed)} ago`} />
          <Metric label={`Done / ${pay?.window_minutes ?? 60}m`} value={`${formatNumber(pay?.counts?.completed)} / ${formatNumber(pay?.counts?.created)}`} />
        </Tile>

        {/* Expiry */}
        <Tile
          title="Expiry"
          status={exp?.status}
          footer={
            <>
              <TunnelRows removal={exp?.removal_latency_by_tunnel} hot={exp?.hot_by_tunnel} />
              <div className="text-foreground-muted/80"><Sparkline values={series(points, 'expiry_active_hot')} label="Hot backlog, 24h" /></div>
              <div className="text-foreground-muted/80"><Sparkline values={series(points, 'expiry_p95_removal')} label="Removal p95, 24h" /></div>
            </>
          }
        >
          <Metric label="Hot backlog" value={formatNumber(exp?.expired_active_hot)} />
          <Metric label="Oldest hot" value={formatMinutes(exp?.oldest_hot_expired_minutes)} />
          <Metric label="Removal p95" value={expRm.value} suffix={expRm.ratio} suffixTone={ratioTone(expRm.ratioValue)} />
          <Metric label="Quarantined" value={formatNumber(exp?.expired_active_quarantined)} />
        </Tile>

        {/* Tunnels */}
        <Tile
          title="Tunnels"
          status={tun?.status}
          footer={<div className="text-foreground-muted/80"><Sparkline values={series(points, 'tunnels_offline')} label="Offline routers, 24h" /></div>}
        >
          <Metric label="On / off / stale" value={`${formatNumber(tun?.counts?.online)} / ${formatNumber(tun?.counts?.offline)} / ${formatNumber(tun?.counts?.stale)}`} />
          <Metric label="Drops 10m" value={formatNumber(tun?.recent_drops_10m)} suffix={tun?.platform_event ? 'fleet-wide' : null} suffixTone="text-red-500" />
          {tun?.control_path?.available ? (
            <>
              <Metric label="Native path" value={formatNumber(tun.control_path.native)} />
              <Metric label="Transit / unrouted" value={`${formatNumber(tun.control_path.transit_fallback)} / ${formatNumber(tun.control_path.unrouted)}`} />
            </>
          ) : (
            <Metric label="Control path" value="n/a" tone="text-foreground-muted" />
          )}
        </Tile>

        {/* Control plane */}
        <Tile
          title="Control plane"
          status={cp?.status}
          footer={
            <DetailToggle
              label="Instances"
              count={cp?.instances?.length ?? 0}
              open={detail === 'instances'}
              onClick={() => toggleDetail('instances')}
            />
          }
        >
          <Metric label="Active writers" value={formatNumber(cp?.active_writers)} tone={multiWriter ? 'text-red-500' : 'text-foreground'} />
          <Metric label="DB identity" value={cp?.db_identity_mismatch ? 'mismatch' : 'consistent'} tone={cp?.db_identity_mismatch ? 'text-red-500' : 'text-foreground'} />
        </Tile>

        {/* Safety net */}
        <Tile
          title="Safety net"
          status={sn?.status}
          footer={<div className="text-foreground-muted/80"><Sparkline values={series(points, 'safety_net_removals')} label="Safety-net removals, 24h" /></div>}
        >
          <Metric label="Removals / h" value={formatNumber(sn?.removals_last_hour)} />
          <Metric label="Baseline / h" value={sn?.baseline_per_hour == null ? '—' : sn.baseline_per_hour.toFixed(1)} />
          <Metric label="Last removal" value={sn?.last_removal_at ? formatRelative(sn.last_removal_at, now) : 'none'} />
        </Tile>

        {/* Jobs */}
        <Tile
          title="Jobs"
          status={jobs?.status}
          footer={
            <DetailToggle
              label="Job list"
              count={jobs?.items?.length ?? 0}
              open={detail === 'jobs'}
              onClick={() => toggleDetail('jobs')}
            />
          }
        >
          <Metric label="Stale" value={formatNumber(staleJobs)} tone={staleJobs > 0 ? 'text-amber-500' : 'text-foreground'} />
          <Metric label="Registered" value={formatNumber(jobs?.items?.length ?? 0)} />
        </Tile>

        {/* DB pool */}
        <Tile title="DB pool" status={pool?.status}>
          <Metric label="Pressure" value={pool?.pressure_level ?? '—'} tone={styleFor(pool?.pressure_level).text} />
          <Metric label="Checked out" value={`${formatNumber(pool?.checked_out)} / ${formatNumber(pool?.pool_size)}`} suffix={pool?.max_overflow != null ? `+${pool.max_overflow}` : null} />
        </Tile>
      </div>

      {/* Expandable details — full width so the 2-column grid stays tidy on phones */}
      {detail === 'routers' && (
        <div className="mt-3 pt-3 border-t border-border animate-fade-in" data-testid="ops-health-top-routers">
          <div className="flex items-center justify-between mb-2 gap-2">
            <p className="text-[11px] uppercase tracking-wider text-foreground-muted font-semibold">Top routers with backlog</p>
            <Link href="/routers" className="text-[11px] text-foreground-muted hover:text-foreground underline underline-offset-2">Open routers</Link>
          </div>
          {(prov?.top_routers ?? []).length === 0 ? (
            <p className="text-xs text-foreground-muted">No routers with retry backlog.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {(prov?.top_routers ?? []).map((r) => (
                <li key={r.router_id} className="px-2.5 py-1.5 flex items-start gap-2 text-xs">
                  <Link href="/routers" className="font-medium text-foreground hover:underline truncate min-w-0 flex-1" title={`Router #${r.router_id}`}>
                    {r.router_name || `Router #${r.router_id}`}
                  </Link>
                  <TunnelBadge tunnel={r.tunnel} />
                  <span className="font-mono tabular-nums text-foreground flex-shrink-0">{formatNumber(r.pending)} pending</span>
                  {r.last_error ? (
                    <span className="text-[11px] text-foreground-muted truncate max-w-[40%] hidden sm:inline" title={r.last_error}>{r.last_error}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {detail === 'instances' && (
        <div className="mt-3 pt-3 border-t border-border animate-fade-in" data-testid="ops-health-instances">
          <p className="text-[11px] uppercase tracking-wider text-foreground-muted font-semibold mb-2">App instances (last 3 min)</p>
          {(cp?.instances ?? []).length === 0 ? (
            <p className="text-xs text-foreground-muted">No heartbeats.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {(cp?.instances ?? []).map((inst) => (
                <li key={inst.instance_id} className="px-2.5 py-1.5 text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-mono text-foreground truncate max-w-full" title={inst.instance_id}>{inst.hostname || inst.instance_id}</span>
                  <span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wider ${inst.runtime_mode === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-background-tertiary text-foreground-muted border-border'}`}>{inst.runtime_mode ?? 'unknown'}</span>
                  <span className="text-[11px] text-foreground-muted">scheduler {inst.scheduler_enabled ? 'on' : 'off'}</span>
                  {inst.app_version ? <span className="text-[11px] text-foreground-muted font-mono">{inst.app_version.slice(0, 8)}</span> : null}
                  {inst.db_identity ? <span className="text-[11px] text-foreground-muted font-mono" title={inst.db_identity}>db {inst.db_identity.slice(0, 6)}</span> : null}
                  <span className="text-[11px] text-foreground-muted ml-auto">seen {formatRelative(inst.last_seen_at, now)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {detail === 'jobs' && (
        <div className="mt-3 pt-3 border-t border-border animate-fade-in" data-testid="ops-health-jobs">
          <p className="text-[11px] uppercase tracking-wider text-foreground-muted font-semibold mb-2">Scheduler jobs</p>
          {(jobs?.items ?? []).length === 0 ? (
            <p className="text-xs text-foreground-muted">No jobs registered.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 px-2.5 py-1.5 bg-background-tertiary/60 text-[10px] uppercase tracking-wider text-foreground-muted">
                <span>Job</span><span>Interval</span><span>Finished</span><span>Duration</span><span>Skipped/h</span>
              </div>
              <ul className="divide-y divide-border">
                {(jobs?.items ?? []).map((j) => (
                  <li key={j.id} className="px-2.5 py-1.5 text-xs grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 gap-y-0.5 items-center">
                    <span className="col-span-2 sm:col-span-1 flex items-center gap-1.5 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${j.stale ? 'bg-amber-500' : j.last_error ? 'bg-red-500' : 'bg-emerald-500'}`} />
                      <span className="font-mono text-foreground truncate" title={j.id}>{j.id}</span>
                      {j.stale ? <span className="text-[10px] uppercase tracking-wider text-amber-500">stale</span> : null}
                    </span>
                    <span className="text-foreground-muted tabular-nums"><span className="sm:hidden">every </span>{formatSeconds(j.interval_seconds)}</span>
                    <span className="text-foreground-muted tabular-nums"><span className="sm:hidden">finished </span>{formatRelative(j.last_finished_at, now)}</span>
                    <span className="text-foreground-muted tabular-nums"><span className="sm:hidden">took </span>{formatSeconds(j.last_duration_seconds)}</span>
                    <span className="text-foreground-muted tabular-nums"><span className="sm:hidden">skipped/h </span>{formatNumber(j.missed_or_skipped_last_hour)}</span>
                    {j.last_error ? (
                      <span className="col-span-2 sm:col-span-5 text-[11px] text-red-500 break-words" title={j.last_error}>{j.last_error}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
