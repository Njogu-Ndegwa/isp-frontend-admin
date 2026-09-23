'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { OpsHealthWindowReport, OpsHealthWindowStats, Router } from '../lib/types';

// Backend order: primary planes, then insurance planes, then unclassified.
const TUNNEL_ORDER = ['wireguard', 'l2tp', 'wg2_insurance', 'aws_insurance', 'other'];
const TUNNEL_LABEL: Record<string, string> = {
  wireguard: 'WireGuard', l2tp: 'L2TP', wg2_insurance: 'wg2 ins.', aws_insurance: 'AWS ins.', other: 'other',
};

function fmtSecs(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (v < 10) return `${v.toFixed(1)}s`;
  if (v < 60) return `${Math.round(v)}s`;
  if (v < 3600) return `${(v / 60).toFixed(1)}m`;
  return `${(v / 3600).toFixed(1)}h`;
}

function fmtPct(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`;
}

function fmtMins(m: number | null | undefined): string {
  if (m === null || m === undefined) return '—';
  if (m < 60) return `${Math.round(m)}m`;
  if (m < 1440) return `${(m / 60).toFixed(1)}h`;
  return `${(m / 1440).toFixed(1)}d`;
}

const REASON_SHORT: Record<string, string> = {
  owner_suspended: 'reseller suspended',
  router_offline_3d_plus: 'router offline 3d+',
  router_offline: 'router offline',
  router_status_stale: 'router not reached 6h+',
  agent_managed_pending: 'agent pending',
  router_online_not_removed: 'online, not removed',
  no_router: 'no router',
};

/** datetime-local wants local wall time without zone; the API wants UTC ISO. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(s: string): Date | null {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function tone(p95: number | null | undefined, warn: number, crit: number): string {
  if (p95 === null || p95 === undefined) return 'text-foreground-muted';
  if (p95 >= crit) return 'text-red-500';
  if (p95 >= warn) return 'text-amber-500';
  return 'text-foreground';
}

function StatCell({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-foreground-muted truncate">{label}</p>
      <p className={`text-sm font-semibold tabular-nums leading-tight ${className}`}>{value}</p>
    </div>
  );
}

function LatencyRow({ label, s, warn = 30, crit = 60 }: { label: string; s: OpsHealthWindowStats | null | undefined; warn?: number; crit?: number }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 items-baseline text-xs py-0.5">
      <span className="text-foreground-muted truncate">{label}</span>
      <span className="tabular-nums text-foreground">p50 {fmtSecs(s?.p50)}</span>
      <span className={`tabular-nums font-semibold ${tone(s?.p95, warn, crit)}`}>p95 {fmtSecs(s?.p95)}</span>
      <span className="tabular-nums text-foreground-muted">max {fmtSecs(s?.max)}</span>
      <span className="tabular-nums text-foreground-muted">n={s?.samples ?? 0}</span>
    </div>
  );
}

const PRESETS: Array<{ label: string; hours: number }> = [
  { label: '1h', hours: 1 }, { label: '8h', hours: 8 }, { label: '24h', hours: 24 }, { label: '7d', hours: 168 },
];

export default function OpsHealthLookback() {
  const [routers, setRouters] = useState<Router[]>([]);
  const [routerId, setRouterId] = useState<number | ''>('');
  const [start, setStart] = useState<string>(() => toLocalInput(new Date(Date.now() - 3 * 3600_000)));
  const [end, setEnd] = useState<string>(() => toLocalInput(new Date()));
  const [report, setReport] = useState<OpsHealthWindowReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getRouters().then((rs) => { if (!cancelled) setRouters([...rs].sort((a, b) => a.name.localeCompare(b.name))); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const run = useCallback(async () => {
    const s = fromLocalInput(start);
    const e = fromLocalInput(end);
    if (!s || !e) { setError('Pick a valid start and end.'); return; }
    setLoading(true);
    setError(null);
    const result = await api.getOpsHealthWindow(s.toISOString(), e.toISOString(), routerId === '' ? undefined : routerId);
    setLoading(false);
    if (!result || !result.window || !result.provisioning) { setError('The look-back endpoint did not respond.'); return; }
    setReport(result);
  }, [start, end, routerId]);

  const applyPreset = (hours: number) => {
    const now = new Date();
    setEnd(toLocalInput(now));
    setStart(toLocalInput(new Date(now.getTime() - hours * 3600_000)));
  };

  const prov = report?.provisioning;
  const tunnels = useMemo(
    () => Object.keys(prov?.by_tunnel ?? {}).sort((a, b) => TUNNEL_ORDER.indexOf(a) - TUNNEL_ORDER.indexOf(b)),
    [prov],
  );

  return (
    <div className="mt-3 pt-3 border-t border-border" data-testid="ops-health-lookback">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <p className="text-[11px] uppercase tracking-wider text-foreground-muted font-semibold">Look back at a time slice</p>
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => applyPreset(p.hours)} className="text-[11px] px-2 py-0.5 rounded border border-border text-foreground-muted hover:text-foreground hover:bg-background-tertiary">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1.4fr_auto] gap-2 items-end">
        <label className="text-[10px] uppercase tracking-wider text-foreground-muted">
          From (your time)
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="input mt-1 w-full text-xs" aria-label="Look-back start" />
        </label>
        <label className="text-[10px] uppercase tracking-wider text-foreground-muted">
          To
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="input mt-1 w-full text-xs" aria-label="Look-back end" />
        </label>
        <label className="text-[10px] uppercase tracking-wider text-foreground-muted col-span-2 sm:col-span-1">
          Router
          <select value={routerId} onChange={(e) => setRouterId(e.target.value === '' ? '' : Number(e.target.value))} className="input mt-1 w-full text-xs" aria-label="Look-back router">
            <option value="">All routers</option>
            {routers.map((r) => <option key={r.id} value={r.id}>{r.name} (#{r.id})</option>)}
          </select>
        </label>
        <button type="button" onClick={run} disabled={loading} className="btn-primary text-xs px-3 py-2 col-span-2 sm:col-span-1" data-testid="ops-health-lookback-run">
          {loading ? 'Computing…' : 'Show'}
        </button>
      </div>
      {error ? <p className="text-xs text-red-500 mt-2">{error}</p> : null}

      {report ? (
        <div className="mt-3 space-y-3" data-testid="ops-health-lookback-result">
          <p className="text-[11px] text-foreground-muted">
            {report.window.hours}h slice · {report.router ? `${report.router.router_name ?? `Router #${report.router.router_id}`} (${TUNNEL_LABEL[report.router.tunnel] ?? report.router.tunnel})` : 'all routers'}
            {report.truncated ? <span className="text-amber-500"> · truncated, narrow the slice</span> : null}
          </p>

          <div className="rounded-xl border border-border bg-background-tertiary/40 p-2.5 sm:p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">Provisioning (payment → router)</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-1.5">
              <StatCell label="Payments" value={String(Object.values(prov?.counts ?? {}).reduce((a: number, b) => a + (b ?? 0), 0))} />
              <StatCell label="Delivered" value={String(prov?.counts?.router_updated ?? 0)} />
              <StatCell label="Not delivered" value={String((prov?.counts?.retry_pending ?? 0) + (prov?.counts?.failed ?? 0))} className={((prov?.counts?.retry_pending ?? 0) + (prov?.counts?.failed ?? 0)) > 0 ? 'text-red-500' : ''} />
              <StatCell label="Success" value={fmtPct(prov?.success_ratio)} />
              <StatCell label="Retries / delivery" value={`p50 ${prov?.retries_per_delivery?.p50 ?? '—'} · max ${prov?.retries_per_delivery?.max ?? '—'}`} />
            </div>
            <div className="divide-y divide-border/60">
              <LatencyRow label="End-to-end" s={prov?.end_to_end} />
              <LatencyRow label="Router call" s={prov?.router_call} />
              {tunnels.map((t) => (
                <LatencyRow key={t} label={`${TUNNEL_LABEL[t] ?? t} · call (${prov?.by_tunnel?.[t]?.delivered ?? 0} ok / ${prov?.by_tunnel?.[t]?.not_delivered ?? 0} not)`} s={prov?.by_tunnel?.[t]?.router_call} />
              ))}
            </div>
          </div>

          {!report.router && (prov?.routers?.length ?? 0) > 0 ? (
            <div className="rounded-lg border border-border overflow-hidden" data-testid="ops-health-lookback-routers">
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-3 px-2.5 py-1.5 bg-background-tertiary/60 text-[10px] uppercase tracking-wider text-foreground-muted">
                <span>Router (worst first, {prov?.routers_total} total)</span><span>Tunnel</span><span>Paid</span><span>Not delivered</span><span>Call p95</span><span>E2E p95</span>
              </div>
              <ul className="divide-y divide-border">
                {prov?.routers.map((r) => (
                  <li key={r.router_id} className="px-2.5 py-1.5 text-xs grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-3 gap-y-0.5 items-center">
                    <button type="button" onClick={() => setRouterId(r.router_id)} className="text-left font-medium text-foreground hover:underline truncate col-span-2 sm:col-span-1" title={`Filter to router #${r.router_id}`}>
                      {r.router_name ?? `Router #${r.router_id}`}
                    </button>
                    <span className="text-foreground-muted uppercase text-[10px]">{TUNNEL_LABEL[r.tunnel] ?? r.tunnel}</span>
                    <span className="tabular-nums"><span className="sm:hidden text-foreground-muted">paid </span>{r.attempts}</span>
                    <span className={`tabular-nums ${r.not_delivered > 0 ? 'text-red-500 font-semibold' : 'text-foreground-muted'}`}><span className="sm:hidden text-foreground-muted">not delivered </span>{r.not_delivered}</span>
                    <span className={`tabular-nums ${tone(r.router_call_p95, 30, 60)}`}><span className="sm:hidden text-foreground-muted">call p95 </span>{fmtSecs(r.router_call_p95)}</span>
                    <span className="tabular-nums text-foreground-muted"><span className="sm:hidden">e2e p95 </span>{fmtSecs(r.end_to_end_p95)}</span>
                    {r.last_error ? <span className="col-span-2 sm:col-span-6 text-[11px] text-foreground-muted truncate" title={r.last_error}>{r.last_error}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {(report.expiry.enforcement?.still_active ?? 0) > 0 ? (
            <div className="rounded-lg border border-red-500/30 overflow-hidden" data-testid="ops-health-lookback-unenforced">
              <div className="px-2.5 py-1.5 bg-background-tertiary/60 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-foreground-muted">
                  Expired but still active · {report.expiry.enforcement.still_active} customers on {report.expiry.enforcement.routers_total} routers
                </span>
                <span className="flex gap-1 flex-wrap">
                  {Object.entries(report.expiry.enforcement.by_reason ?? {}).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).map(([k, n]) => (
                    <span key={k} className="text-[10px] px-1.5 py-0.5 rounded border border-border text-foreground-muted">{REASON_SHORT[k] ?? k}: {n}</span>
                  ))}
                </span>
              </div>
              <ul className="divide-y divide-border">
                {report.expiry.enforcement.routers.map((r) => (
                  <li key={r.router_id} className="px-2.5 py-1.5 text-xs grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto_1.4fr] gap-x-3 gap-y-0.5 items-center">
                    <button type="button" onClick={() => setRouterId(r.router_id)} className="text-left font-medium text-foreground hover:underline truncate col-span-2 sm:col-span-1" title={`Filter to router #${r.router_id}`}>
                      {r.router_name ?? `Router #${r.router_id}`}
                    </button>
                    <span className="text-foreground-muted uppercase text-[10px]">{TUNNEL_LABEL[r.tunnel] ?? r.tunnel}</span>
                    <span className="tabular-nums text-red-500 font-semibold"><span className="sm:hidden text-foreground-muted">still active </span>{r.still_active}</span>
                    <span className="tabular-nums text-foreground-muted"><span className="sm:hidden">oldest </span>{fmtMins(r.oldest_expired_minutes)}</span>
                    <span className="text-[11px] text-foreground-muted col-span-2 sm:col-span-1 truncate" title={r.reason_label}>{r.reason_label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div className="rounded-xl border border-border bg-background-tertiary/40 p-2.5 sm:p-3">
              <p className="text-xs font-semibold text-foreground mb-1">Expiry enforcement</p>
              {(() => {
                const enf = report.expiry.enforcement;
                const pct = enf?.pct_removed;
                const pctTone = pct === null || pct === undefined ? 'text-foreground-muted' : pct >= 100 ? 'text-emerald-500' : pct >= 90 ? 'text-amber-500' : 'text-red-500';
                return (
                  <div className="grid grid-cols-3 gap-x-2 mb-2" data-testid="ops-health-lookback-enforcement">
                    <StatCell label="Removed" value={pct === null || pct === undefined ? '—' : `${pct}%`} className={pctTone} />
                    <StatCell label="Expired in slice" value={String(enf?.expired ?? 0)} />
                    <StatCell label="Still active" value={String(enf?.still_active ?? 0)} className={(enf?.still_active ?? 0) > 0 ? 'text-red-500' : ''} />
                  </div>
                );
              })()}
              <p className="text-xs font-semibold text-foreground mb-1 mt-2">Removal latency ({report.expiry.removals})</p>
              <LatencyRow label="Expiry → removed" s={report.expiry.removal_latency} warn={600} crit={1800} />
              {Object.keys(report.expiry.by_tunnel ?? {}).sort((a, b) => TUNNEL_ORDER.indexOf(a) - TUNNEL_ORDER.indexOf(b)).map((t) => (
                <LatencyRow key={t} label={TUNNEL_LABEL[t] ?? t} s={report.expiry.by_tunnel[t]} warn={600} crit={1800} />
              ))}
            </div>
            <div className="rounded-xl border border-border bg-background-tertiary/40 p-2.5 sm:p-3">
              <p className="text-xs font-semibold text-foreground mb-1">M-Pesa callbacks {report.router ? '(fleet-wide, not per router)' : ''}</p>
              {report.payments ? (
                <>
                  <div className="grid grid-cols-4 gap-x-2 mb-1">
                    <StatCell label="Created" value={String(report.payments.counts.created)} />
                    <StatCell label="Completed" value={String(report.payments.counts.completed)} />
                    <StatCell label="Failed" value={String(report.payments.counts.failed)} />
                    <StatCell label="Pending" value={String(report.payments.counts.pending)} />
                  </div>
                  <LatencyRow label="STK → callback" s={report.payments.callback_latency} warn={30} crit={90} />
                </>
              ) : <p className="text-xs text-foreground-muted">Clear the router filter to see payment latency.</p>}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
