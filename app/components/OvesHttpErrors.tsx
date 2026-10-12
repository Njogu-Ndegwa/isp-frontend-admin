'use client';

import { useState } from 'react';
import { OvesTraffic } from '../lib/types';

// HTTP 5xx per service from the prod ingress, last 5 minutes: which endpoint
// failed, how often, and what the service itself logged. Scanner / crawler hits
// on dead URLs (`GET /.env`...) are separated out: they fail by design and never
// alert, but you can still see them.

function pct(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

function label(svc: string): string {
  return svc.replace(/-microservice/, '').replace(/-/g, ' ');
}

export default function OvesHttpErrors({ traffic, focus }: { traffic: Record<string, OvesTraffic>; focus?: string | null }) {
  const [showBots, setShowBots] = useState<Record<string, boolean>>({});
  const failing = Object.entries(traffic)
    .filter(([, t]) => (t.status_5xx ?? 0) > 0 || (t.log_errors?.length ?? 0) > 0)
    .sort((a, b) => (b[0] === focus ? 1 : 0) - (a[0] === focus ? 1 : 0)
      || (b[1].real_5xx ?? b[1].status_5xx) - (a[1].real_5xx ?? a[1].status_5xx));

  return (
    <div data-testid="oves-http-errors">
      <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-1.5">HTTP errors · last 5 min (prod ingress + service logs)</p>
      {failing.length === 0 ? (
        <p className="text-xs text-emerald-500">No service returned a 5xx in the last 5 minutes.</p>
      ) : (
        <ul className="space-y-2">
          {failing.map(([svc, t]) => {
            const real = t.real_5xx ?? t.status_5xx;
            const bots = t.bot_5xx ?? 0;
            const realRate = t.real_error_rate ?? t.error_rate ?? null;
            const bad = (t.real_requests ?? t.requests) >= 20 && (realRate ?? 0) > 0.05;
            const realRows = (t.top_failures ?? []).filter((f) => !f.bots);
            const botRows = (t.top_failures ?? []).filter((f) => f.bots);
            return (
              <li key={svc} className={`rounded-lg border px-3 py-2 ${bad ? 'border-red-500/40 bg-red-500/5' : 'border-border'}`} data-testid={`oves-http-${svc}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-xs font-semibold text-foreground capitalize">{label(svc)}</p>
                  <p className="text-[11px] tabular-nums text-foreground-muted">
                    <span className={real ? (bad ? 'text-red-500 font-semibold' : 'text-amber-500') : ''}>{real} real 5xx</span>
                    {' '}of {t.real_requests ?? t.requests} ({pct(realRate)})
                    {bots > 0 && <span> · {bots} from bots / scanners</span>}
                  </p>
                </div>

                {realRows.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {realRows.map((f, i) => (
                      <li key={`${f.method}${f.route}${f.status}${i}`} className="flex items-baseline gap-2 text-[11px] font-mono">
                        <span className="tabular-nums text-red-500 w-10 text-right">{f.count}×</span>
                        <span className="text-foreground">{f.method} {f.route}</span>
                        <span className="text-red-500">→ {f.status}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {(t.log_errors?.length ?? 0) > 0 && (
                  <div className="mt-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-foreground-muted">What the service logged</p>
                    <ul className="space-y-0.5">
                      {t.log_errors!.slice(0, 4).map((e, i) => (
                        <li key={i} className="flex items-baseline gap-2 text-[11px]">
                          <span className="tabular-nums text-amber-500 w-10 text-right flex-shrink-0">{e.count}×</span>
                          <span className="font-mono text-foreground break-all">{e.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {botRows.length > 0 && (
                  <div className="mt-1.5">
                    <button type="button" className="text-[11px] text-foreground-muted underline hover:text-foreground"
                      onClick={() => setShowBots((s) => ({ ...s, [svc]: !s[svc] }))} data-testid={`oves-http-bots-${svc}`}>
                      {showBots[svc] ? 'Hide' : 'Show'} {bots} bot / scanner request{bots === 1 ? '' : 's'} (ignored)
                    </button>
                    {showBots[svc] && (
                      <ul className="mt-1 space-y-0.5">
                        {botRows.map((f, i) => (
                          <li key={i} className="flex items-baseline gap-2 text-[11px] font-mono text-foreground-muted">
                            <span className="tabular-nums w-10 text-right">{f.count}×</span>
                            <span>{f.method} {f.route}</span>
                            {f.status ? <span>→ {f.status}</span> : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
