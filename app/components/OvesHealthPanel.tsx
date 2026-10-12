'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '../lib/api';
import OvesClusterCard from './OvesClusterCard';
import {
  OvesAlert,
  OvesCodeWindow,
  OvesHealthResponse,
  OvesHistoryResponse,
  OvesProbe,
  OvesSeverity,
} from '../lib/types';

// Recharts is client-only and heavy; keep it out of the dashboard's first paint.
const CodesBars = dynamic(() => import('./OvesHealthCharts').then((m) => m.CodesBars), { ssr: false });
const MetricArea = dynamic(() => import('./OvesHealthCharts').then((m) => m.MetricArea), { ssr: false });

const POLL_INTERVAL_MS = 60_000;
const CLOCK_TICK_MS = 15_000;
const STALE_AFTER_SECONDS = 180;

const RANGES: { hours: number; label: string }[] = [
  { hours: 1, label: '1h' },
  { hours: 6, label: '6h' },
  { hours: 24, label: '24h' },
  { hours: 72, label: '3d' },
  { hours: 168, label: '7d' },
  { hours: 336, label: '14d' },
];

type Tab = 'overview' | 'codes' | 'database' | 'clusters' | 'dependencies';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'codes', label: 'Codes' },
  { id: 'database', label: 'Database' },
  { id: 'clusters', label: 'Clusters' },
  { id: 'dependencies', label: 'Dependencies' },
];

// ---------------------------------------------------------------------------
// small presentational helpers
// ---------------------------------------------------------------------------

const SEV_STYLE: Record<string, { pill: string; dot: string; text: string; border: string }> = {
  ok: { pill: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30', dot: 'bg-emerald-500', text: 'text-emerald-500', border: '' },
  info: { pill: 'bg-sky-500/10 text-sky-400 border-sky-500/30', dot: 'bg-sky-400', text: 'text-sky-400', border: '' },
  warning: { pill: 'bg-amber-500/10 text-amber-500 border-amber-500/30', dot: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500/40' },
  critical: { pill: 'bg-red-500/10 text-red-500 border-red-500/30', dot: 'bg-red-500', text: 'text-red-500', border: 'border-red-500/40' },
  unknown: { pill: 'bg-background-tertiary text-foreground-muted border-border', dot: 'bg-foreground-muted', text: 'text-foreground-muted', border: '' },
};
const PROBE_TO_SEV: Record<string, OvesSeverity> = { up: 'ok', slow: 'warning', down: 'critical', unknown: 'unknown' };

function sevStyle(s: string | null | undefined) {
  return SEV_STYLE[s || 'unknown'] ?? SEV_STYLE.unknown;
}

function SevPill({ status, label }: { status: string | null | undefined; label?: string }) {
  const st = sevStyle(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium uppercase tracking-wider ${st.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
      {label ?? (status === 'ok' ? 'healthy' : status || 'unknown')}
    </span>
  );
}

function Dot({ status }: { status: string }) {
  const st = sevStyle(PROBE_TO_SEV[status] ?? status);
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} aria-label={status} />;
}

function pct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(digits)}%`;
}

function secs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function relative(iso: string | null | undefined, now: number): string {
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

function Meter({ value, warn = 80, crit = 90 }: { value: number | null | undefined; warn?: number; crit?: number }) {
  if (value === null || value === undefined) return <span className="text-foreground-muted text-xs">—</span>;
  const color = value >= crit ? 'bg-red-500' : value >= warn ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2 sm:min-w-[80px]">
      {/* Phones get the number alone (coloured when hot) so all three columns fit. */}
      <div className="hidden sm:block flex-1 h-1.5 rounded-full bg-background-tertiary overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(2, value))}%` }} />
      </div>
      <span className={`text-[11px] tabular-nums w-9 sm:text-right ${value >= crit ? 'text-red-500' : value >= warn ? 'text-amber-500' : 'text-foreground-muted'}`}>{Math.round(value)}%</span>
    </div>
  );
}

function Tile({ label, value, sub, status, testId }: {
  label: string; value: string; sub?: string; status?: string; testId?: string;
}) {
  const st = sevStyle(status);
  return (
    <div className={`rounded-xl border bg-background-secondary/60 p-3 min-w-0 ${st.border || 'border-border'}`} data-testid={testId}>
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
        <p className="text-[11px] uppercase tracking-wider text-foreground-muted truncate">{label}</p>
      </div>
      <p className={`mt-1 text-lg sm:text-xl font-semibold tabular-nums truncate ${status === 'critical' ? 'text-red-500' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[11px] leading-snug text-foreground-muted mt-0.5 line-clamp-2" title={sub}>{sub}</p>}
    </div>
  );
}

function HeartIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function summaryLine(data: OvesHealthResponse): string {
  const crit = data.alerts.filter((a) => a.severity === 'critical').length;
  const warn = data.alerts.filter((a) => a.severity === 'warning').length;
  if (!crit && !warn) {
    const groups = data.sections.dependencies?.groups ?? [];
    const probes = groups.flatMap((g) => g.probes).filter((p) => p.group !== 'exposure');
    const up = probes.filter((p) => p.status === 'up' || p.status === 'slow').length;
    const codes = data.sections.codes?.last_60m;
    const codePart = codes && codes.attempts ? `${codes.ok} codes in the last hour, ` : '';
    return `${codePart}${up}/${probes.length} services answering. Nothing needs attention.`;
  }
  const parts: string[] = [];
  if (crit) parts.push(`${crit} critical`);
  if (warn) parts.push(`${warn} warning${warn > 1 ? 's' : ''}`);
  return `${parts.join(' and ')} need${crit + warn === 1 ? 's' : ''} attention.`;
}

// ---------------------------------------------------------------------------
// sections
// ---------------------------------------------------------------------------

function AlertList({ alerts, now }: { alerts: OvesAlert[]; now: number }) {
  const visible = alerts.filter((a) => a.severity === 'critical' || a.severity === 'warning');
  const info = alerts.filter((a) => a.severity === 'info');
  if (!visible.length && !info.length) return null;
  return (
    <div className="space-y-1.5" data-testid="oves-alerts">
      {[...visible, ...info].map((a) => {
        const st = sevStyle(a.severity);
        return (
          <div key={a.key} className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${st.pill}`}>
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">{a.title}</p>
              <p className="text-[11px] text-foreground-muted break-words">{a.message}</p>
            </div>
            {a.notified_at && <span className="text-[10px] text-foreground-muted whitespace-nowrap">alerted {relative(a.notified_at, now)}</span>}
          </div>
        );
      })}
    </div>
  );
}

function CodeWindowRow({ label, w }: { label: string; w: OvesCodeWindow }) {
  return (
    <tr className="border-t border-border">
      <td className="py-1.5 pr-3 text-foreground-muted">{label}</td>
      <td className="py-1.5 pr-3 tabular-nums text-foreground">{w.ok}</td>
      <td className="py-1.5 pr-3 tabular-nums text-foreground">{w.failed}<span className="text-foreground-muted"> ({w.failed_system} platform)</span></td>
      <td className="py-1.5 pr-3 tabular-nums text-foreground">{pct(w.success_rate)}</td>
      <td className="py-1.5 pr-3 tabular-nums text-foreground">{secs(w.p50_ms)} / {secs(w.p95_ms)}</td>
    </tr>
  );
}

function CodesTab({ data, now }: { data: OvesHealthResponse; now: number }) {
  const c = data.sections.codes;
  if (!c || !c.available) {
    return <p className="text-xs text-foreground-muted">Code generation is read from the prod cluster&apos;s thing-microservice logs. Connect the prod cluster (OVES_K8S_PROD_*) to see it.</p>;
  }
  const reasons = Object.entries(c.last_60m.by_reason);
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-foreground-muted">
              <th className="pb-1.5 pr-3 font-medium">Window</th><th className="pb-1.5 pr-3 font-medium">Succeeded</th>
              <th className="pb-1.5 pr-3 font-medium">Failed</th><th className="pb-1.5 pr-3 font-medium">Success</th>
              <th className="pb-1.5 pr-3 font-medium">p50 / p95</th>
            </tr>
          </thead>
          <tbody>
            <CodeWindowRow label="5 min" w={c.last_5m} />
            <CodeWindowRow label="15 min" w={c.last_15m} />
            <CodeWindowRow label="60 min" w={c.last_60m} />
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-3">
          <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-2">By service (this minute)</p>
          {Object.keys(c.by_service).length === 0 ? <p className="text-xs text-foreground-muted">No code traffic this minute.</p> : (
            <ul className="space-y-1">
              {Object.entries(c.by_service).map(([svc, w]) => (
                <li key={svc} className="flex justify-between gap-2 text-xs">
                  <span className="text-foreground truncate">{svc}</span>
                  <span className="tabular-nums text-foreground-muted">{w.ok} ok · {w.failed} failed · p95 {secs(w.p95_ms)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-foreground-muted mt-2">
            Types (60 min): {Object.entries(c.last_60m.by_type).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-2">Failure reasons (60 min)</p>
          {reasons.length === 0 ? <p className="text-xs text-emerald-500">No failures.</p> : (
            <ul className="space-y-1">
              {reasons.map(([r, n]) => (
                <li key={r} className="flex justify-between text-xs"><span className="text-foreground">{r.replace(/_/g, ' ')}</span><span className="tabular-nums text-foreground-muted">{n}</span></li>
              ))}
            </ul>
          )}
          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-foreground-muted">
            <span title="Codes generated but not written to the Elasticsearch code-event index">ES index fails: <b className="text-foreground">{c.last_60m.index_failures}</b></span>
            <span title="OpenToken algorithm calls that needed a retry">OpenToken retries: <b className="text-foreground">{c.last_60m.opentoken_retries}</b></span>
            <span title="Hash chain advanced without a code event row">Integrity: <b className="text-foreground">{c.last_60m.integrity_warnings}</b></span>
          </div>
        </div>
      </div>

      {c.recent_failures.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-1.5">Latest failures</p>
          <ul className="space-y-1">
            {c.recent_failures.slice().reverse().map((f, i) => (
              <li key={`${f.at}-${i}`} className="text-xs flex flex-wrap gap-x-2">
                <span className="text-foreground-muted tabular-nums">{relative(f.at, now)}</span>
                <span className={f.kind === 'system' ? 'text-red-500' : 'text-amber-500'}>{f.reason.replace(/_/g, ' ')}</span>
                <span className="text-foreground-muted">{f.service}</span>
                <span className="text-foreground break-all">{f.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[11px] text-foreground-muted">{c.note}</p>
    </div>
  );
}

function DatabaseTab({ data }: { data: OvesHealthResponse }) {
  const db = data.sections.database;
  if (!db) return null;
  const checks = [db.login, ...db.service_checks].filter(Boolean) as OvesProbe[];
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-1.5">Can the services reach MongoDB rs0?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {checks.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 min-w-0" title={p.detail}>
              <Dot status={p.status} />
              <span className="text-xs text-foreground truncate flex-1">{p.name.replace('-microservice', '')}</span>
              <span className="text-[11px] tabular-nums text-foreground-muted">{secs(p.latency_ms)}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-foreground-muted mt-1.5">
          &quot;Not primary&quot; / server-selection errors in app logs: <b className="text-foreground">{db.log_errors_5m}</b> in 5 min, <b className="text-foreground">{db.log_errors_60m}</b> in 60 min. {db.replica_set.note}
        </p>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-1.5">MongoDB hosts (EC2, eu-central-1)</p>
        {!db.hosts_available ? (
          <p className="text-xs text-foreground-muted">Not connected. Set OVES_AWS_ACCESS_KEY_ID / OVES_AWS_SECRET_ACCESS_KEY (read-only CloudWatch + EC2 status) to watch CPU credits, the metric that predicts rs0 elections.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {db.hosts.map((h) => {
              const bad = h.state !== 'running' || h.instance_status === 'impaired' || h.system_status === 'impaired';
              const lowCredits = h.credit_mode !== 'unlimited' && h.cpu_credits !== null && h.cpu_credits < 20;
              return (
                <div key={h.instance_id} className={`rounded-lg border p-2.5 ${bad ? 'border-red-500/40' : lowCredits ? 'border-amber-500/40' : 'border-border'}`}>
                  <div className="flex items-center gap-2"><Dot status={bad ? 'down' : lowCredits ? 'slow' : 'up'} /><span className="text-xs font-medium text-foreground truncate">{h.name}</span></div>
                  <p className="text-[11px] text-foreground-muted mt-1">{h.state ?? '—'} · checks {h.system_status ?? '—'}/{h.instance_status ?? '—'}</p>
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center gap-2 text-[11px] text-foreground-muted"><span className="w-12">CPU</span><Meter value={h.cpu_pct} /></div>
                    <p className="text-[11px] text-foreground-muted">CPU credits: <b className={lowCredits ? 'text-amber-500' : 'text-foreground'}>{h.cpu_credits ?? 'n/a'}</b>{h.credit_mode ? ` · ${h.credit_mode}` : ''}{h.credit_mode === 'unlimited' && h.cpu_credits === 0 ? ' (billing surplus)' : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {db.tencent_rs && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-1.5">Tencent MongoDB rs0 (hello, unauthenticated)</p>
          <div className="flex flex-wrap gap-2">
            {(db.tencent_rs.members ?? []).map((m) => (
              <span key={m.host} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs">
                <Dot status={m.error ? 'down' : 'up'} />
                {m.host.split('.')[0]} {m.error ? m.error : m.writable ? 'PRIMARY' : 'secondary'}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProbeDetail({ probe, hours }: { probe: OvesProbe; hours: number }) {
  const [hist, setHist] = useState<OvesHistoryResponse | null>(null);
  useEffect(() => {
    let alive = true;
    api.getOvesHealthHistory(hours, probe.id).then((h) => { if (alive) setHist(h); });
    return () => { alive = false; };
  }, [probe.id, hours]);
  return (
    <div className="mt-2 rounded-lg bg-background-tertiary/50 p-3 space-y-2" data-testid={`oves-probe-detail-${probe.id}`}>
      <p className="text-[11px] text-foreground-muted break-all">{probe.kind.toUpperCase()} {probe.target} — {probe.detail}{probe.http_status ? ` (HTTP ${probe.http_status})` : ''}</p>
      {!hist ? <p className="text-[11px] text-foreground-muted">Loading history…</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <MetricArea points={hist.points} dataKey="probe_p95_ms" label="Latency p95" unit=" ms" bucketMinutes={hist.bucket_minutes} color="var(--chart-2)" />
          <MetricArea points={hist.points} dataKey="probe_uptime" label="Uptime" unit="%" scale={100} digits={1} domainMax={100} bucketMinutes={hist.bucket_minutes} color="#10b981" />
        </div>
      )}
    </div>
  );
}

function DependenciesTab({ data, uptime, hours }: { data: OvesHealthResponse; uptime: Record<string, number>; hours: number }) {
  const [open, setOpen] = useState<string | null>(null);
  const groups = data.sections.dependencies?.groups ?? [];
  const rangeLabel = RANGES.find((r) => r.hours === hours)?.label ?? `${hours}h`;
  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const down = g.probes.filter((p) => p.status === 'down').length;
        return (
          <div key={g.id}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-[11px] uppercase tracking-wider text-foreground-muted">{g.label}</p>
              <span className={`text-[11px] ${down ? 'text-red-500' : 'text-foreground-muted'}`}>
                {g.id === 'exposure'
                  ? (down ? `${down} exposed` : 'nothing exposed')
                  : `${g.probes.length - down}/${g.probes.length} up`}
              </span>
            </div>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {g.probes.map((p) => {
                const isOpen = open === p.id;
                const up = uptime[p.id];
                return (
                  <li key={p.id} className="px-2.5 py-2">
                    <button type="button" className="w-full flex items-center gap-2 text-left" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen}>
                      <Dot status={p.status} />
                      <span className="min-w-0 flex-1">
                        <span className="text-xs text-foreground">{p.name}</span>
                        {p.critical && <span className="ml-1.5 text-[10px] uppercase tracking-wider text-foreground-muted">critical</span>}
                        {p.depends && <span className="block text-[11px] text-foreground-muted truncate">{p.depends}</span>}
                      </span>
                      <span className="text-[11px] tabular-nums text-foreground-muted whitespace-nowrap text-right">
                        {p.status === 'down' ? <span className="text-red-500">{p.detail.slice(0, 40)}</span> : secs(p.latency_ms)}
                        {up !== undefined && g.id !== 'exposure' && <span className="block">{pct(up, up >= 0.9995 ? 0 : 2)} · {rangeLabel}</span>}
                      </span>
                    </button>
                    {isOpen && <ProbeDetail probe={p} hours={hours} />}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// panel
// ---------------------------------------------------------------------------

export default function OvesHealthPanel() {
  const [data, setData] = useState<OvesHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const [tab, setTab] = useState<Tab>('overview');
  // null = automatic: open when something is wrong, closed otherwise.
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const [hours, setHours] = useState(24);
  const [hist, setHist] = useState<OvesHistoryResponse | null>(null);
  const inFlight = useRef(false);

  const fetchLatest = useCallback(async (silent = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (!silent) setLoading(true);
    try {
      const res = await api.getOvesHealth();
      if (res) { setData(res); setFailed(false); } else { setFailed(true); }
      setNow(Date.now());
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, []);

  const fetchHistory = useCallback(async (h: number) => {
    const res = await api.getOvesHealthHistory(h);
    if (res) setHist(res);
  }, []);

  // Poll every 60 s while the tab is visible; history refreshes with it.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = () => { if (!document.hidden) fetchLatest(true); };
    const start = () => { if (!timer) timer = setInterval(tick, POLL_INTERVAL_MS); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVis = () => { if (document.hidden) stop(); else { fetchLatest(true); start(); } };
    fetchLatest(false);
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [fetchLatest]);

  const hasProblems = useMemo(() => (data?.alerts ?? []).some((a) => a.severity === 'critical' || a.severity === 'warning'), [data]);
  const isOpen = expanded ?? hasProblems;

  useEffect(() => {
    if (isOpen) fetchHistory(hours);
  }, [isOpen, hours, fetchHistory, data?.generated_at]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(t);
  }, []);

  if (loading && !data) {
    return (
      <div className="card p-4 sm:p-5 animate-pulse" data-testid="oves-health-panel">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-background-tertiary" />
          <div className="flex-1 space-y-2"><div className="h-3.5 w-44 bg-background-tertiary rounded" /><div className="h-2.5 w-60 bg-background-tertiary rounded" /></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-background-tertiary" />)}</div>
      </div>
    );
  }

  if (!data || !data.generated_at) {
    return (
      <div className="card p-4 sm:p-5" data-testid="oves-health-panel">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-background-tertiary flex items-center justify-center ring-1 ring-border flex-shrink-0"><HeartIcon className="w-5 h-5 text-foreground-muted" /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap"><h3 className="text-sm sm:text-base font-semibold text-foreground">OVES platform health</h3><SevPill status="unknown" label={failed ? 'unavailable' : data && !data.enabled ? 'off' : 'waiting'} /></div>
            <p className="text-xs text-foreground-muted mt-0.5">
              {failed ? 'The oves-health endpoint did not respond. It may not be deployed yet.'
                : data && !data.enabled ? 'The collector is off. Set OVES_HEALTH_ENABLED=true on the server to start watching OVES.'
                  : 'The first snapshot arrives within a minute of the collector starting.'}
            </p>
          </div>
          <button onClick={() => fetchLatest(false)} className="btn-secondary text-xs px-3 py-1.5" disabled={loading}>Retry</button>
        </div>
      </div>
    );
  }

  const age = data.snapshot_age_seconds ?? 0;
  const stale = age > STALE_AFTER_SECONDS;
  const overall = stale ? 'unknown' : data.overall_status;
  const st = sevStyle(overall);
  const codes = data.sections.codes;
  const db = data.sections.database;
  const clusters = data.sections.clusters ?? {};
  const deps = (data.sections.dependencies?.groups ?? []).flatMap((g) => g.probes);
  const nonExposure = deps.filter((p) => p.group !== 'exposure');
  const depsDown = nonExposure.filter((p) => p.status === 'down');
  const exposed = deps.filter((p) => p.group === 'exposure' && p.status === 'down');
  const dbChecks = [db?.login, ...(db?.service_checks ?? [])].filter(Boolean) as OvesProbe[];
  const dbUp = dbChecks.filter((p) => p.status !== 'down').length;

  const w15 = codes?.last_15m;
  const w60 = codes?.last_60m;
  const codesStatus = !codes?.available ? 'unknown' : codes.status;

  return (
    <div className={`card p-4 sm:p-5 space-y-4 ${st.border}`} data-testid="oves-health-panel">
      {/* header */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-1 flex-shrink-0 ${st.pill}`}><HeartIcon className={`w-5 h-5 ${st.text}`} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-semibold text-foreground">OVES platform health</h3>
            <SevPill status={overall} label={stale ? 'stale' : undefined} />
          </div>
          <p className="text-xs text-foreground-muted mt-0.5">
            {stale ? `No fresh snapshot for ${Math.round(age / 60)} min: the collector may be stopped.` : summaryLine(data)}
            <span className="ml-1.5 text-foreground-muted/80">· updated {relative(data.generated_at, now)}</span>
          </p>
        </div>
        <button type="button" onClick={() => setExpanded(!isOpen)} className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0" aria-expanded={isOpen} data-testid="oves-toggle">
          {isOpen ? 'Hide details' : 'Details'}
        </button>
      </div>

      <AlertList alerts={data.alerts} now={now} />

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Tile testId="oves-tile-success" label="Success 15m" status={codesStatus}
          value={codes?.available ? pct(w15?.system_success_rate ?? null) : '—'}
          sub={codes?.available ? `${w15?.ok ?? 0} ok · ${w15?.failed ?? 0} failed · ${w15?.failed_system ?? 0} platform` : 'prod cluster not connected'} />
        <Tile testId="oves-tile-rate" label="Codes / hour" status={codesStatus}
          value={codes?.available ? String(w60?.ok ?? 0) : '—'}
          sub={codes?.baseline_per_hour != null ? `usually ~${Math.round(codes.baseline_per_hour)}/h now` : 'baseline builds over 2 days'} />
        <Tile testId="oves-tile-latency" label="Latency p95" status={(w15?.p95_ms ?? 0) > 8000 ? 'warning' : codesStatus}
          value={secs(w15?.p95_ms)} sub={`p50 ${secs(w15?.p50_ms)} · 15 min`} />
        <Tile testId="oves-tile-db" label="Database" status={db?.status}
          value={`${dbUp}/${dbChecks.length}`} sub={db?.login ? `login ${db.login.status === 'up' ? 'ok' : db.login.status} · ${db.log_errors_60m} log errors 1h` : 'reachability checks'} />
        <Tile testId="oves-tile-clusters" label="Clusters" status={['prod', 'dev', 'tencent'].map((c) => clusters[c]?.status ?? 'unknown').reduce((a, b) => (['critical', 'warning'].includes(b) ? b : a), 'ok')}
          value={['prod', 'dev', 'tencent'].filter((c) => clusters[c] && !clusters[c].not_configured && !clusters[c].error).length + '/3'}
          sub={['prod', 'dev', 'tencent'].map((c) => `${c} ${clusters[c]?.not_configured ? 'off' : clusters[c]?.error ? 'down' : (clusters[c]?.workloads ? `${clusters[c]!.workloads!.ok}/${clusters[c]!.workloads!.total}` : '—')}`).join(' · ')} />
        <Tile testId="oves-tile-deps" label="Dependencies" status={depsDown.some((p) => p.critical) ? 'critical' : depsDown.length || exposed.length ? 'warning' : 'ok'}
          value={`${nonExposure.length - depsDown.length}/${nonExposure.length}`}
          sub={depsDown.length ? `down: ${depsDown.map((p) => p.name).slice(0, 2).join(', ')}` : exposed.length ? `${exposed.length} exposed to the internet` : 'all answering'} />
      </div>

      {isOpen && (
        <div className="space-y-4" data-testid="oves-details">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 overflow-x-auto -mx-1 px-1" role="tablist">
              {TABS.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-background-tertiary text-foreground' : 'text-foreground-muted hover:text-foreground'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            {(tab === 'overview' || tab === 'dependencies') && (
              <div className="flex gap-1 rounded-lg border border-border p-0.5" data-testid="oves-range">
                {RANGES.map((r) => (
                  <button key={r.hours} type="button" onClick={() => setHours(r.hours)}
                    className={`px-2 py-1 rounded-md text-[11px] tabular-nums ${hours === r.hours ? 'bg-background-tertiary text-foreground' : 'text-foreground-muted hover:text-foreground'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {tab === 'overview' && (
            !hist ? <p className="text-xs text-foreground-muted">Loading history…</p> : (
              <div className="space-y-3">
                <p className="text-[11px] text-foreground-muted">
                  {RANGES.find((r) => r.hours === hours)?.label}: <b className="text-foreground">{hist.totals.codes_ok}</b> codes, <b className="text-foreground">{hist.totals.codes_failed}</b> failed, success <b className="text-foreground">{pct(hist.totals.success_rate)}</b>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <CodesBars points={hist.points} bucketMinutes={hist.bucket_minutes} />
                  <MetricArea points={hist.points} dataKey="success_rate" label="Code success rate" unit="%" scale={100} digits={1} domainMax={100} bucketMinutes={hist.bucket_minutes} color="#10b981" />
                  <MetricArea points={hist.points} dataKey="code_p95_ms" label="Latency p95" unit=" s" scale={0.001} digits={1} threshold={8} bucketMinutes={hist.bucket_minutes} />
                  <MetricArea points={hist.points} dataKey="db_errors" label="MongoDB errors in app logs" bucketMinutes={hist.bucket_minutes} color="#ef4444" />
                  <MetricArea points={hist.points} dataKey="probes_down" label="Failed dependency checks" bucketMinutes={hist.bucket_minutes} color="var(--chart-4)" />
                  <MetricArea points={hist.points} dataKey="prod_disk_max" label="Prod busiest node disk" unit="%" digits={0} threshold={90} domainMax={100} bucketMinutes={hist.bucket_minutes} color="var(--chart-2)" />
                </div>
              </div>
            )
          )}
          {tab === 'codes' && <CodesTab data={data} now={now} />}
          {tab === 'database' && <DatabaseTab data={data} />}
          {tab === 'clusters' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              {['prod', 'tencent', 'dev'].map((c) => clusters[c] && (
                <OvesClusterCard key={c} name={c} cl={clusters[c]} traffic={c === 'prod' ? data.sections.traffic?.last_5m : undefined} />
              ))}
            </div>
          )}
          {tab === 'dependencies' && <DependenciesTab data={data} uptime={hist?.probe_uptime ?? {}} hours={hours} />}

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-foreground-muted border-t border-border pt-2">
            {Object.entries(data.sources).map(([src, s]) => (
              <span key={src} title={s.error}>
                <span className={s.state === 'ok' ? 'text-emerald-500' : s.state === 'error' ? 'text-red-500' : s.state === 'partial' ? 'text-amber-500' : ''}>●</span> {src.replace(/_/g, ' ')}: {s.state.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
