'use client';

import { OvesCodePathItem, OvesGqlCodes, OvesGqlErrorGroup, OvesGqlOperation, OvesSeverity } from '../lib/types';

// The first thing on the OVES panel: is code generation working right now?
// Numbers come from Apollo GraphOS (every code request on every pod, errors
// inside HTTP 200 included), falling back to the log-derived counts when
// Apollo is not connected. Then the services a code passes through, in order.

type Tone = 'ok' | 'warn' | 'bad' | 'muted';
const DOT: Record<Tone, string> = { ok: 'bg-emerald-500', warn: 'bg-amber-500', bad: 'bg-red-500', muted: 'bg-foreground-muted' };
const RING: Record<Tone, string> = {
  ok: 'border-emerald-500/30', warn: 'border-amber-500/40', bad: 'border-red-500/50', muted: 'border-border',
};
const TEXT: Record<Tone, string> = { ok: 'text-emerald-500', warn: 'text-amber-500', bad: 'text-red-500', muted: 'text-foreground-muted' };

function toneOf(s: OvesSeverity | string | null | undefined): Tone {
  if (s === 'critical') return 'bad';
  if (s === 'warning') return 'warn';
  if (s === 'ok' || s === 'info') return 'ok';
  return 'muted';
}

function pct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(digits)}%`;
}

function ago(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function rateTone(rate: number | null | undefined): Tone {
  if (rate === null || rate === undefined) return 'muted';
  return rate >= 0.10 ? 'bad' : rate >= 0.02 ? 'warn' : 'ok';
}

function Big({ label, value, sub, tone, testId }: { label: string; value: string; sub?: string; tone: Tone; testId?: string }) {
  return (
    <div className="min-w-0" data-testid={testId}>
      <p className="text-[11px] uppercase tracking-wider text-foreground-muted">{label}</p>
      <p className={`text-2xl sm:text-3xl font-semibold tabular-nums leading-tight ${tone === 'ok' || tone === 'muted' ? 'text-foreground' : TEXT[tone]}`}>{value}</p>
      {sub && <p className="text-[11px] text-foreground-muted">{sub}</p>}
    </div>
  );
}

function PathStep({ item, last }: { item: OvesCodePathItem; last: boolean }) {
  const tone = toneOf(item.status);
  const detail = item.note
    ?? [item.pods ? `${item.pods} pods` : null,
      item.requests_15m !== null && item.requests_15m !== undefined ? `${item.requests_15m} req` : null,
      item.platform_error_rate ? `${pct(item.platform_error_rate)} errors` : null]
      .filter(Boolean).join(' · ');
  return (
    <li className="flex items-stretch min-w-0" data-testid={`oves-path-${item.id}`}>
      <div className={`flex-1 min-w-0 rounded-lg border px-2.5 py-2 bg-background-secondary/60 ${RING[tone]}`} title={item.role}>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT[tone]}`} />
          <span className="text-xs font-medium text-foreground truncate">{item.label}</span>
        </div>
        <p className={`text-[11px] mt-0.5 line-clamp-2 ${tone === 'bad' ? 'text-red-500' : tone === 'warn' ? 'text-amber-500' : 'text-foreground-muted'}`}>
          {detail || item.role}
        </p>
      </div>
      {!last && <span className="hidden lg:flex items-center px-1 text-foreground-muted text-xs" aria-hidden>→</span>}
    </li>
  );
}

export default function OvesCodeGeneration({
  apollo, operations, errors, path, logCodes, onOpenErrors,
}: {
  apollo: OvesGqlCodes | null | undefined;
  operations: OvesGqlOperation[];
  errors: OvesGqlErrorGroup[];
  path: OvesCodePathItem[];
  logCodes?: { ok: number; failed: number; failed_system: number; p95_ms: number | null } | null;
  onOpenErrors: () => void;
}) {
  const fromApollo = !!apollo && apollo.requests > 0;
  const requests = fromApollo ? apollo!.requests : (logCodes ? logCodes.ok + logCodes.failed : 0);
  const failed = fromApollo ? apollo!.errors : (logCodes?.failed ?? 0);
  const platformFailed = fromApollo ? apollo!.system_errors : (logCodes?.failed_system ?? 0);
  const platformRate = requests ? platformFailed / requests : null;
  const success = requests ? 1 - failed / requests : null;
  const pathWorst = path.reduce<Tone>((w, p) => {
    const t = toneOf(p.status);
    return t === 'bad' || (t === 'warn' && w !== 'bad') ? t : w;
  }, 'ok');
  const tone: Tone = requests === 0 ? 'muted' : rateTone(platformRate) === 'ok' ? pathWorst : rateTone(platformRate);
  const headline = requests === 0 ? 'No code requests in the last 15 minutes'
    : tone === 'ok' ? 'Codes are being generated normally'
      : tone === 'warn' ? 'Code generation needs attention' : 'Code generation is failing';
  const platformErrors = errors.filter((e) => e.kind === 'system');
  const callerErrors = errors.filter((e) => e.kind !== 'system');

  return (
    <section className={`rounded-xl border p-3 sm:p-4 space-y-3 ${RING[tone]} bg-background-tertiary/20`} data-testid="oves-codegen">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-foreground-muted">Code generation · last 15 min</p>
          <p className={`text-sm font-semibold ${tone === 'ok' ? 'text-foreground' : TEXT[tone]}`}>
            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 align-middle ${DOT[tone]}`} />{headline}
          </p>
        </div>
        <button type="button" onClick={onOpenErrors} className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0" data-testid="oves-open-errors">
          Errors &amp; history
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Big testId="oves-codegen-success" label="Success" tone={rateTone(platformRate)} value={pct(success)}
          sub={fromApollo ? 'all code requests' : logCodes ? 'from service logs' : undefined} />
        <Big testId="oves-codegen-requests" label="Code requests" tone="muted" value={requests.toLocaleString()}
          sub={requests ? `${(requests / 15).toFixed(1)} / min` : undefined} />
        <Big testId="oves-codegen-errors" label="Errors" tone={failed ? (platformFailed ? rateTone(platformRate) : 'warn') : 'ok'}
          value={failed.toLocaleString()} sub={failed ? `${platformFailed} platform · ${failed - platformFailed} caller` : 'none'} />
        <Big testId="oves-codegen-rate" label="Platform error rate" tone={rateTone(platformRate)} value={pct(platformRate, 2)}
          sub="excludes rate limits, bad ids, auth" />
      </div>

      {operations.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs" data-testid="oves-codegen-ops">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-foreground-muted">
                <th className="pb-1 pr-3 font-medium">Operation</th>
                <th className="pb-1 pr-3 font-medium">Served by</th>
                <th className="pb-1 pr-3 font-medium text-right">Requests</th>
                <th className="pb-1 pr-3 font-medium text-right">Errors</th>
                <th className="pb-1 font-medium text-right">Error rate</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((o) => (
                <tr key={`${o.graph}-${o.name}`} className="border-t border-border">
                  <td className="py-1.5 pr-3 text-foreground font-medium whitespace-nowrap">{o.label}</td>
                  <td className="py-1.5 pr-3 text-foreground-muted whitespace-nowrap">{o.graph_label}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-right text-foreground">{o.requests.toLocaleString()}</td>
                  <td className={`py-1.5 pr-3 tabular-nums text-right ${o.errors ? 'text-amber-500' : 'text-foreground-muted'}`}>{o.errors}</td>
                  <td className={`py-1.5 tabular-nums text-right ${TEXT[rateTone(o.error_rate)] === 'text-emerald-500' ? 'text-foreground-muted' : TEXT[rateTone(o.error_rate)]}`}>{pct(o.error_rate, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(platformErrors.length > 0 || callerErrors.length > 0) && (
        <div data-testid="oves-codegen-errors-list">
          <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-1">Latest code errors</p>
          <ul className="space-y-1">
            {[...platformErrors, ...callerErrors].slice(0, 6).map((e, i) => (
              <li key={`${e.operation}-${e.reason}-${i}`} className={`rounded-lg border px-2.5 py-1.5 ${e.kind === 'system' ? 'border-red-500/40 bg-red-500/5' : 'border-border'}`}>
                <div className="flex flex-wrap items-baseline gap-x-2 text-[11px]">
                  <span className={`font-semibold tabular-nums ${e.kind === 'system' ? 'text-red-500' : 'text-amber-500'}`}>{e.count}×</span>
                  <span className="text-foreground font-medium">{e.operation_label}</span>
                  <span className="text-foreground-muted">{e.graph_label}</span>
                  <span className={`uppercase tracking-wider text-[10px] ${e.kind === 'system' ? 'text-red-500' : 'text-foreground-muted'}`}>{e.kind === 'system' ? 'platform' : 'caller'}</span>
                  {e.last_seen && <span className="text-foreground-muted ml-auto">{ago(e.last_seen)}</span>}
                </div>
                <p className="text-[11px] font-mono text-foreground break-all mt-0.5">{e.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {path.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-1">Services codes depend on</p>
          <ol className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {path.map((p, i) => <PathStep key={p.id} item={p} last={i === path.length - 1} />)}
          </ol>
        </div>
      )}
    </section>
  );
}
