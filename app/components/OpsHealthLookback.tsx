'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '../lib/api';

const DeliveryTimeline = dynamic(() => import('./OpsHealthCharts').then((m) => m.DeliveryTimeline), { ssr: false });
const LatencyTimeline = dynamic(() => import('./OpsHealthCharts').then((m) => m.LatencyTimeline), { ssr: false });
const ExpiryTimeline = dynamic(() => import('./OpsHealthCharts').then((m) => m.ExpiryTimeline), { ssr: false });
import { AdminReseller, OpsHealthWindowReport, OpsHealthWindowStats, Router } from '../lib/types';

// Backend order: primary planes, then insurance planes, then unclassified.
const TUNNEL_ORDER = ['wireguard', 'l2tp', 'sstp', 'wg2_insurance', 'aws_insurance', 'other'];
const TUNNEL_LABEL: Record<string, string> = {
  wireguard: 'WireGuard', l2tp: 'L2TP', sstp: 'SSTP', wg2_insurance: 'wg2 ins.', aws_insurance: 'AWS ins.', other: 'other',
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

/** The reseller the report is scoped to. `email` is what the API is asked for. */
interface OwnerPick { id: number; email: string; name: string }

function routerState(r: { last_status: boolean | null; last_checked_at: string | null }): { label: string; cls: string } {
  if (r.last_status === null || !r.last_checked_at) return { label: 'never reached', cls: 'text-foreground-muted' };
  const ageMs = Date.now() - new Date(r.last_checked_at).getTime();
  if (Number.isFinite(ageMs) && ageMs > 6 * 3600_000) return { label: 'not reached 6h+', cls: 'text-zinc-400' };
  return r.last_status ? { label: 'online', cls: 'text-emerald-500' } : { label: 'offline', cls: 'text-red-500' };
}

function fmtAgo(iso: string | null): string {
  if (!iso) return '—';
  const mins = (Date.now() - new Date(iso).getTime()) / 60_000;
  return Number.isFinite(mins) ? `${fmtMins(Math.max(0, mins))} ago` : '—';
}

export default function OpsHealthLookback() {
  const [routers, setRouters] = useState<Router[]>([]);
  const [routerId, setRouterId] = useState<number | ''>('');
  const [start, setStart] = useState<string>(() => toLocalInput(new Date(Date.now() - 3 * 3600_000)));
  const [end, setEnd] = useState<string>(() => toLocalInput(new Date()));
  const [report, setReport] = useState<OpsHealthWindowReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reseller search is the primary way in: type an email (or name), pick, and
  // the report runs across every router that reseller owns.
  const [ownerQuery, setOwnerQuery] = useState('');
  const [ownerMatches, setOwnerMatches] = useState<AdminReseller[]>([]);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [owner, setOwner] = useState<OwnerPick | null>(null);
  const searchSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    api.getRouters().then((rs) => { if (!cancelled) setRouters([...rs].sort((a, b) => a.name.localeCompare(b.name))); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const q = ownerQuery.trim();
    if (owner || q.length < 2) { setOwnerMatches([]); setOwnerSearching(false); return; }
    const seq = ++searchSeq.current;
    setOwnerSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.getAdminResellers({ search: q });
        if (seq === searchSeq.current) setOwnerMatches((res?.resellers ?? []).slice(0, 8));
      } catch {
        if (seq === searchSeq.current) setOwnerMatches([]);
      } finally {
        if (seq === searchSeq.current) setOwnerSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [ownerQuery, owner]);

  const run = useCallback(async (override?: { routerId?: number | ''; owner?: OwnerPick | null }) => {
    const s = fromLocalInput(start);
    const e = fromLocalInput(end);
    if (!s || !e) { setError('Pick a valid start and end.'); return; }
    const rid = override && 'routerId' in override ? override.routerId : routerId;
    const own = override && 'owner' in override ? override.owner : owner;
    setLoading(true);
    setError(null);
    const result = await api.getOpsHealthWindow(s.toISOString(), e.toISOString(), rid === '' || rid === undefined ? undefined : rid, own?.email);
    setLoading(false);
    if (!result || !result.window || !result.provisioning) { setError(own ? `No report for ${own.email}. Check the email and try again.` : 'The look-back endpoint did not respond.'); return; }
    setReport(result);
  }, [start, end, routerId, owner]);

  const pickOwner = (r: AdminReseller) => {
    const picked = { id: r.id, email: r.email, name: r.organization_name || r.business_name || r.email };
    setOwner(picked);
    setOwnerQuery('');
    setOwnerMatches([]);
    setRouterId('');
    void run({ routerId: '', owner: picked });
  };
  const clearOwner = () => { setOwner(null); setRouterId(''); setReport(null); };
  const pickRouter = (id: number | '') => { setRouterId(id); void run({ routerId: id }); };

  // With a reseller chosen, the router list is theirs (from the report); otherwise the fleet.
  const routerOptions = useMemo(() => {
    if (owner && report?.owner?.routers) return report.owner.routers.map((r) => ({ id: r.router_id, name: r.router_name ?? `Router #${r.router_id}` }));
    return routers.map((r) => ({ id: r.id, name: r.name }));
  }, [owner, report, routers]);

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
        <p className="text-[11px] uppercase tracking-wider text-foreground-muted font-semibold">Investigate a time window</p>
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => applyPreset(p.hours)} className="text-[11px] px-2 py-0.5 rounded border border-border text-foreground-muted hover:text-foreground hover:bg-background-tertiary">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-2" data-testid="ops-health-lookback-owner">
        <label className="text-[10px] uppercase tracking-wider text-foreground-muted block">
          Reseller (email or name)
          {owner ? (
            <div className="input mt-1 w-full text-xs flex items-center justify-between gap-2" data-testid="ops-health-lookback-owner-chip">
              <span className="truncate normal-case tracking-normal text-foreground"><span className="font-medium">{owner.name}</span> <span className="text-foreground-muted">{owner.email}</span></span>
              <button type="button" onClick={clearOwner} className="text-foreground-muted hover:text-foreground shrink-0" aria-label="Clear reseller">✕</button>
            </div>
          ) : (
            <input
              type="search"
              value={ownerQuery}
              onChange={(e) => setOwnerQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && ownerMatches[0]) { e.preventDefault(); pickOwner(ownerMatches[0]); } }}
              placeholder="opic@example.com"
              autoComplete="off"
              className="input mt-1 w-full text-xs"
              aria-label="Look-back reseller"
            />
          )}
        </label>
        {!owner && (ownerMatches.length > 0 || (ownerSearching && ownerQuery.trim().length >= 2)) ? (
          <ul className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-border bg-background-secondary shadow-lg max-h-56 overflow-auto" role="listbox" data-testid="ops-health-lookback-owner-matches">
            {ownerSearching && ownerMatches.length === 0 ? <li className="px-3 py-2 text-xs text-foreground-muted">Searching…</li> : null}
            {ownerMatches.map((r) => (
              <li key={r.id} role="option" aria-selected="false">
                <button type="button" onClick={() => pickOwner(r)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-background-tertiary flex items-center justify-between gap-2">
                  <span className="truncate"><span className="font-medium text-foreground">{r.organization_name || r.business_name || r.email}</span> <span className="text-foreground-muted">{r.email}</span></span>
                  <span className="text-[10px] text-foreground-muted shrink-0">{r.active_customers ?? 0} active customers</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {!owner && ownerQuery.trim().length >= 2 && !ownerSearching && ownerMatches.length === 0 ? (
          <p className="text-[11px] text-foreground-muted mt-1">No reseller matches “{ownerQuery.trim()}”.</p>
        ) : null}
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
          {owner ? 'Narrow to one of their routers' : 'Router'}
          <select value={routerId} onChange={(e) => pickRouter(e.target.value === '' ? '' : Number(e.target.value))} className="input mt-1 w-full text-xs" aria-label="Look-back router">
            <option value="">{owner ? `All ${routerOptions.length} routers` : 'All routers'}</option>
            {routerOptions.map((r) => <option key={r.id} value={r.id}>{r.name} (#{r.id})</option>)}
          </select>
        </label>
        <button type="button" onClick={() => run()} disabled={loading} className="btn-primary text-xs px-3 py-2 col-span-2 sm:col-span-1" data-testid="ops-health-lookback-run">
          {loading ? 'Computing…' : 'Show'}
        </button>
      </div>
      {error ? <p className="text-xs text-red-500 mt-2">{error}</p> : null}

      {report ? (
        <div className="mt-3 space-y-3" data-testid="ops-health-lookback-result">
          <p className="text-[11px] text-foreground-muted" data-testid="ops-health-lookback-scope">
            {report.window.hours}h slice
            {report.owner ? ` · ${report.owner.organization_name || report.owner.email || `Reseller #${report.owner.user_id}`}${report.owner.email ? ` (${report.owner.email})` : ''} · ${report.owner.routers_total} router${report.owner.routers_total === 1 ? '' : 's'}` : ''}
            {report.router ? ` · ${report.router.router_name ?? `Router #${report.router.router_id}`} (${TUNNEL_LABEL[report.router.tunnel] ?? report.router.tunnel})` : (report.owner ? '' : ' · all routers')}
            {report.truncated ? <span className="text-amber-500"> · truncated, narrow the slice</span> : null}
          </p>

          {report.owner && !report.router ? (
            <div className="rounded-lg border border-border overflow-hidden" data-testid="ops-health-lookback-owner-routers">
              <div className="px-2.5 py-1.5 bg-background-tertiary/60 text-[10px] uppercase tracking-wider text-foreground-muted grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto] gap-x-3">
                <span>Their routers ({report.owner.routers_total})</span><span>Tunnel</span><span>State</span><span>Last reached</span>
              </div>
              {report.owner.routers.length === 0 ? (
                <p className="px-2.5 py-2 text-xs text-foreground-muted">This reseller has no routers.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {report.owner.routers.map((r) => {
                    const st = routerState(r);
                    return (
                      <li key={r.router_id} className="px-2.5 py-1.5 text-xs grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-0.5 items-center">
                        <button type="button" onClick={() => pickRouter(r.router_id)} className="text-left font-medium text-foreground hover:underline truncate col-span-2 sm:col-span-1" title={`Narrow to router #${r.router_id}`}>
                          {r.router_name ?? `Router #${r.router_id}`}
                        </button>
                        <span className="text-foreground-muted uppercase text-[10px]">{TUNNEL_LABEL[r.tunnel] ?? r.tunnel}</span>
                        <span className={`font-semibold ${st.cls}`}>{st.label}</span>
                        <span className="tabular-nums text-foreground-muted">{fmtAgo(r.last_checked_at)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-background-tertiary/40 p-3">
              <p className="text-xs font-semibold text-foreground mb-1">Payments in this window</p>
              <DeliveryTimeline points={report.timeline?.points ?? []} bucketSeconds={report.timeline?.bucket_seconds ?? 3600} />
            </div>
            <div className="rounded-xl border border-border bg-background-tertiary/40 p-3">
              <p className="text-xs font-semibold text-foreground mb-1">Plans that expired in this window</p>
              <ExpiryTimeline points={report.timeline?.points ?? []} bucketSeconds={report.timeline?.bucket_seconds ?? 3600} />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background-tertiary/40 p-3">
            <p className="text-xs font-semibold text-foreground mb-1">How long customers waited to get connected (slowest 5%)</p>
            <LatencyTimeline points={report.timeline?.points ?? []} bucketSeconds={report.timeline?.bucket_seconds ?? 3600} />
          </div>

          <div className="rounded-xl border border-border bg-background-tertiary/40 p-2.5 sm:p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">Payments reaching routers</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-1.5">
              <StatCell label="Payments" value={String(Object.values(prov?.counts ?? {}).reduce((a: number, b) => a + (b ?? 0), 0))} />
              <StatCell label="Delivered" value={String(prov?.counts?.router_updated ?? 0)} />
              <StatCell label="Not delivered" value={String((prov?.counts?.retry_pending ?? 0) + (prov?.counts?.failed ?? 0))} className={((prov?.counts?.retry_pending ?? 0) + (prov?.counts?.failed ?? 0)) > 0 ? 'text-red-500' : ''} />
              <StatCell label="Success" value={fmtPct(prov?.success_ratio)} />
              <StatCell label="Retries / delivery" value={`p50 ${prov?.retries_per_delivery?.p50 ?? '—'} · max ${prov?.retries_per_delivery?.max ?? '—'}`} />
            </div>
            <div className="divide-y divide-border/60">
              <LatencyRow label="Paid → connected" s={prov?.end_to_end} />
              <LatencyRow label="Router response" s={prov?.router_call} />
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
              <p className="text-xs font-semibold text-foreground mb-1 mt-2">Time to remove after expiry ({report.expiry.removals})</p>
              <LatencyRow label="Expiry → removed" s={report.expiry.removal_latency} warn={600} crit={1800} />
              {Object.keys(report.expiry.by_tunnel ?? {}).sort((a, b) => TUNNEL_ORDER.indexOf(a) - TUNNEL_ORDER.indexOf(b)).map((t) => (
                <LatencyRow key={t} label={TUNNEL_LABEL[t] ?? t} s={report.expiry.by_tunnel[t]} warn={600} crit={1800} />
              ))}
            </div>
            <div className="rounded-xl border border-border bg-background-tertiary/40 p-2.5 sm:p-3">
              <p className="text-xs font-semibold text-foreground mb-1">M-Pesa confirmations {report.router ? '(fleet-wide, not per router)' : ''}</p>
              {report.payments ? (
                <>
                  <div className="grid grid-cols-4 gap-x-2 mb-1">
                    <StatCell label="Created" value={String(report.payments.counts.created)} />
                    <StatCell label="Completed" value={String(report.payments.counts.completed)} />
                    <StatCell label="Failed" value={String(report.payments.counts.failed)} />
                    <StatCell label="Pending" value={String(report.payments.counts.pending)} />
                  </div>
                  <LatencyRow label="PIN entered → confirmed" s={report.payments.callback_latency} warn={30} crit={90} />
                </>
              ) : <p className="text-xs text-foreground-muted">Clear the router filter to see payment latency.</p>}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
