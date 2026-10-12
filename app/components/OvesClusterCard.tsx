'use client';

import { OvesCluster, OvesPod, OvesService } from '../lib/types';

// One cluster in the OVES health panel: the named services that matter most
// (shadow path first on prod), each with its pods' live state, then a one-line
// summary of the machines underneath. Nodes are never listed by IP.

const CLUSTER_LABEL: Record<string, string> = {
  prod: 'AWS prod (EKS oves-prod)',
  dev: 'AWS dev (EKS oves-dev)',
  tencent: 'Tencent (TKE oves-dev)',
};

type Tone = 'ok' | 'warn' | 'bad' | 'muted';
const DOT: Record<Tone, string> = {
  ok: 'bg-emerald-500', warn: 'bg-amber-500', bad: 'bg-red-500', muted: 'bg-foreground-muted',
};
const TEXT: Record<Tone, string> = {
  ok: 'text-foreground-muted', warn: 'text-amber-500', bad: 'text-red-500', muted: 'text-foreground-muted',
};
const PILL: Record<Tone, string> = {
  ok: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  warn: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  bad: 'bg-red-500/10 text-red-500 border-red-500/30',
  muted: 'bg-background-tertiary text-foreground-muted border-border',
};

function toneOf(status: string | undefined): Tone {
  if (status === 'critical') return 'bad';
  if (status === 'warning') return 'warn';
  if (status === 'ok' || status === 'info') return 'ok';
  return 'muted';
}

function Dot({ tone }: { tone: Tone }) {
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${DOT[tone]}`} />;
}

function Pill({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium uppercase tracking-wider ${PILL[tone]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOT[tone]}`} />{label}
    </span>
  );
}

function duration(s: number | null | undefined): string {
  if (s === null || s === undefined) return '—';
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86_400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86_400)}d`;
}

function secs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function pctTone(v: number | null | undefined, warn: number, bad: number): Tone {
  if (v === null || v === undefined) return 'muted';
  return v >= bad ? 'bad' : v >= warn ? 'warn' : 'ok';
}

const SERVICE_STATE: Record<OvesService['state'], { label: string; tone: Tone }> = {
  ok: { label: 'healthy', tone: 'ok' },
  restarting: { label: 'restarted <1h', tone: 'warn' },
  degraded: { label: 'degraded', tone: 'warn' },
  down: { label: 'down', tone: 'bad' },
};

function recentRestart(p: OvesPod): boolean {
  return p.last_restart_ago_s !== null && p.last_restart_ago_s < 3600;
}

function PodChip({ pod, index }: { pod: OvesPod; index: number }) {
  const tone: Tone = !pod.ok ? 'bad' : recentRestart(pod) ? 'warn' : 'ok';
  const box = tone === 'bad' ? 'border-red-500/40 bg-red-500/10'
    : tone === 'warn' ? 'border-amber-500/40 bg-amber-500/10' : 'border-border bg-background-tertiary/40';
  const restartNote = pod.restarts
    ? `${pod.restarts} restart${pod.restarts > 1 ? 's' : ''}${pod.last_restart_reason ? ` (last: ${pod.last_restart_reason}, ${duration(pod.last_restart_ago_s)} ago)` : ''}`
    : 'no restarts';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] ${box}`}
      title={`${pod.name}: ${pod.state}, up ${duration(pod.age_s)}, ${restartNote}`}>
      <Dot tone={tone} />
      <span className="text-foreground">Pod {index + 1}</span>
      <span className={pod.ok ? 'text-foreground-muted' : 'text-red-500'}>{pod.ok ? `up ${duration(pod.age_s)}` : pod.state}</span>
      {pod.restarts > 0 && <span className={recentRestart(pod) ? 'text-amber-500' : 'text-foreground-muted'} aria-label={`${pod.restarts} restarts`}>↻{pod.restarts}</span>}
    </span>
  );
}

function ServiceRow({ svc }: { svc: OvesService }) {
  const meta = SERVICE_STATE[svc.state] ?? SERVICE_STATE.ok;
  const worst = svc.pods.find((p) => !p.ok) ?? svc.pods.find(recentRestart)
    ?? svc.pods.find((p) => p.last_restart_reason);
  return (
    <li className="py-2 first:pt-0 last:pb-0" data-testid={`oves-service-${svc.name}`}>
      <div className="flex items-start gap-2">
        <span className="mt-1"><Dot tone={meta.tone} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-medium text-foreground truncate">
              {svc.label} <span className="font-normal text-foreground-muted">· {svc.role}</span>
            </p>
            <span className={`text-[11px] tabular-nums whitespace-nowrap ${TEXT[meta.tone]}`}>
              {svc.ready}/{svc.desired} ready{meta.tone !== 'ok' ? ` · ${meta.label}` : ''}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {svc.pods.map((p, i) => <PodChip key={p.name} pod={p} index={i} />)}
            {svc.dead_pods > 0 && (
              <span className="text-[11px] text-foreground-muted self-center">+{svc.dead_pods} dead leftover{svc.dead_pods > 1 ? 's' : ''}</span>
            )}
          </div>
          {worst && worst.last_restart_reason && (
            <p className="text-[11px] text-foreground-muted mt-1">
              Last crash: <span className={recentRestart(worst) || !worst.ok ? 'text-amber-500' : 'text-foreground'}>{worst.last_restart_reason}</span>
              {worst.last_restart_ago_s !== null ? `, ${duration(worst.last_restart_ago_s)} ago` : ''}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export default function OvesClusterCard({ name, cl, traffic }: {
  name: string;
  cl: OvesCluster;
  traffic?: Record<string, { requests: number; status_5xx: number; p95_ms: number | null }>;
}) {
  const title = CLUSTER_LABEL[name] ?? name;
  if (cl.not_configured) {
    return (
      <div className="rounded-xl border border-dashed border-border p-3">
        <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-foreground">{title}</p><Pill tone="muted" label="not connected" /></div>
        <p className="text-[11px] text-foreground-muted mt-1">Apply deploy/oves-health/rbac.yaml to this cluster and set OVES_K8S_{name.toUpperCase()}_SERVER / _TOKEN / _CA_B64.</p>
      </div>
    );
  }
  if (cl.error) {
    return (
      <div className="rounded-xl border border-red-500/40 p-3">
        <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-foreground">{title}</p><Pill tone="bad" label="unreachable" /></div>
        <p className="text-[11px] text-foreground-muted mt-1 break-all">{cl.error}</p>
      </div>
    );
  }
  const w = cl.workloads;
  const p = cl.pods;
  const ns = cl.node_summary;
  const services = cl.services ?? [];
  const keyNames = new Set(services.map((s) => `${s.namespace}/${s.name}`));
  const otherProblems = (w?.problems ?? []).filter((x) => !keyNames.has(`${x.namespace}/${x.name}`));
  const keyPods = new Set(services.flatMap((s) => s.pods.map((sp) => sp.name)));
  const otherCrashes = (p?.crashloop ?? []).filter((c) => !keyPods.has(c.pod));
  const tone = toneOf(cl.status);
  return (
    <div className={`rounded-xl border p-3 space-y-3 ${tone === 'bad' ? 'border-red-500/40' : tone === 'warn' ? 'border-amber-500/40' : 'border-border'}`} data-testid={`oves-cluster-${name}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <Pill tone={tone} label={cl.status === 'ok' ? 'healthy' : cl.status} />
      </div>

      {services.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-1.5">Key services</p>
          <ul className="divide-y divide-border">
            {services.map((svc) => <ServiceRow key={`${svc.namespace}/${svc.name}`} svc={svc} />)}
          </ul>
        </div>
      )}

      {w && p && (
        <div className="rounded-lg bg-background-tertiary/40 px-2.5 py-2 text-[11px] text-foreground-muted space-y-0.5">
          <p>
            Everything else: <span className={w.ok === w.total ? 'text-foreground' : 'text-amber-500'}>{w.ok}/{w.total}</span> workloads ready
            {' '}· <span className={p.restarted_1h ? 'text-amber-500' : 'text-foreground'}>{p.restarted_1h}</span> restarts in 1h
            {p.crashloop.length > 0 && <> · <span className="text-red-500">{p.crashloop.length} crash-looping</span></>}
          </p>
          {ns && (
            <p>
              Machines: <span className={ns.ready === ns.total ? 'text-foreground' : 'text-red-500'}>{ns.ready}/{ns.total} up</span>
              {' '}· busiest CPU <span className={TEXT[pctTone(ns.cpu_max, 85, 95)] === 'text-foreground-muted' ? 'text-foreground' : TEXT[pctTone(ns.cpu_max, 85, 95)]}>{ns.cpu_max === null ? '—' : `${Math.round(ns.cpu_max)}%`}</span>
              {' '}· memory <span className="text-foreground">{ns.mem_max === null ? '—' : `${Math.round(ns.mem_max)}%`}</span>
              {' '}· disk <span className={TEXT[pctTone(ns.disk_max, 80, 90)] === 'text-foreground-muted' ? 'text-foreground' : TEXT[pctTone(ns.disk_max, 80, 90)]}>{ns.disk_max === null ? '—' : `${Math.round(ns.disk_max)}%`}</span>
              {ns.pressure.length > 0 && <span className="text-amber-500"> · {ns.pressure.join(', ')}</span>}
            </p>
          )}
        </div>
      )}

      {(otherProblems.length > 0 || otherCrashes.length > 0) && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-1">Other workloads needing attention</p>
          <ul className="space-y-0.5 text-[11px]">
            {otherProblems.map((x) => (
              <li key={`${x.namespace}/${x.name}`} className="flex items-center gap-2">
                <Dot tone={x.state === 'down' ? 'bad' : 'warn'} />
                <span className="text-foreground truncate flex-1">{x.name}</span>
                <span className="text-foreground-muted tabular-nums">{x.ready}/{x.desired}</span>
              </li>
            ))}
            {otherCrashes.map((c) => (
              <li key={c.pod} className="flex items-center gap-2">
                <Dot tone="bad" />
                <span className="text-foreground truncate flex-1">{c.pod.replace(/-[a-z0-9]{8,10}-[a-z0-9]{5}$/, '')}</span>
                <span className="text-red-500">{c.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {traffic && Object.keys(traffic).length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-1">Requests, last 5 min</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
            {Object.entries(traffic).sort((a, b) => b[1].requests - a[1].requests).slice(0, 10).map(([svc, t]) => (
              <li key={svc} className="flex justify-between gap-2 text-[11px]">
                <span className="text-foreground truncate">{svc.replace(/-microservice/, '')}</span>
                <span className="tabular-nums text-foreground-muted whitespace-nowrap">
                  {t.requests} req · <span className={t.status_5xx ? 'text-red-500' : ''}>{t.status_5xx} errors</span> · p95 {secs(t.p95_ms)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
