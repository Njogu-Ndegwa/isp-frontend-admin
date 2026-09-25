'use client';

import { useState } from 'react';
import { OpsHealthProblemRouter, OpsHealthProblemRoutersSection, OpsHealthProblemState } from '../lib/types';

// Problem routers: the routers costing paying customers now, and whether the
// fixes we applied held. One plain reason per router; click opens its look-back.
// Routers with paid customers still waiting to be connected lead the list: a
// waiting payment only counts as "not connected" hours later, once retries give up.

const STYLE: Record<OpsHealthProblemState, { dot: string; chip: string; label: string }> = {
  attention: { dot: 'bg-red-500', chip: 'bg-red-500/10 text-red-500 border-red-500/30', label: 'need attention' },
  recovering: { dot: 'bg-amber-500', chip: 'bg-amber-500/10 text-amber-500 border-amber-500/30', label: 'recovering' },
  fixed: { dot: 'bg-emerald-500', chip: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30', label: 'fixed' },
};
const ORDER: OpsHealthProblemState[] = ['attention', 'recovering', 'fixed'];

const fmt = (n: number | null | undefined) => (typeof n === 'number' ? n.toLocaleString() : '—');

function Row({ r, onOpen, tunnelLabels }: {
  r: OpsHealthProblemRouter;
  onOpen: (id: number) => void;
  tunnelLabels: Record<string, string>;
}) {
  return (
    <li className="flex items-start gap-2 py-1.5 border-b border-border last:border-b-0" data-problem-state={r.state}>
      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${STYLE[r.state].dot}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => onOpen(r.router_id)}
            className="text-xs font-medium text-foreground hover:underline truncate text-left"
            title={`Open router #${r.router_id} in the look-back report`}
          >
            {r.router_name ?? `Router #${r.router_id}`}
          </button>
          {r.reseller && <span className="text-[11px] text-foreground-muted truncate">· {r.reseller}</span>}
          {!!r.waiting && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-[10px] font-semibold text-red-500 flex-shrink-0" data-testid="problem-router-waiting">
              {fmt(r.waiting)} waiting
            </span>
          )}
          {r.tunnel && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-background-tertiary text-[10px] uppercase tracking-wider text-foreground-muted flex-shrink-0" data-tunnel={r.tunnel}>
              {tunnelLabels[r.tunnel] ?? r.tunnel}
            </span>
          )}
        </div>
        <p className="text-[11px] text-foreground-muted break-words">{r.reason}</p>
      </div>
    </li>
  );
}

export default function ProblemRoutersCard({ section, onOpen, tunnelLabels = {} }: {
  section?: OpsHealthProblemRoutersSection;
  onOpen: (id: number) => void;
  tunnelLabels?: Record<string, string>;
}) {
  const [showOutcomes, setShowOutcomes] = useState(false);
  if (!section || !section.counts) return null;
  const attention = section.routers.filter((r) => r.state === 'attention');
  const outcomes = section.routers.filter((r) => r.state !== 'attention');
  const lost = section.paid_not_connected_24h;
  const avg = section.paid_not_connected_daily_avg_before;
  const better = lost <= avg;
  const waiting = section.waiting_now ?? 0;
  const waitingRouters = section.waiting_routers ?? 0;
  return (
    <div className="rounded-xl border border-border bg-background-tertiary/40 p-3 mb-3" data-testid="ops-health-problem-routers">
      <div className="flex items-start justify-between gap-2 flex-wrap mb-1.5">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Problem routers</p>
          <p className="text-[11px] text-foreground-muted" data-testid="problem-routers-explainer">
            Routers where paid customers are waiting or were not connected, or that are often unreachable.
          </p>
          {waiting > 0 && (
            <p className="text-[11px] text-foreground-muted" data-testid="problem-routers-waiting">
              <span className="font-semibold text-red-500">
                {fmt(waiting)} paid {waiting === 1 ? 'customer' : 'customers'} waiting to be connected now
              </span>{' '}
              on {fmt(waitingRouters)} {waitingRouters === 1 ? 'router' : 'routers'}
            </p>
          )}
          <p className="text-[11px] text-foreground-muted" data-testid="problem-routers-headline">
            <span className={`font-semibold ${lost === 0 ? 'text-emerald-500' : better ? 'text-foreground' : 'text-red-500'}`}>
              {fmt(lost)} paid {lost === 1 ? 'customer' : 'customers'} not connected
            </span>{' '}
            in the last 24h · {better ? 'down from' : 'up from'} {avg}/day before
          </p>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {ORDER.map((s) => (
            <span key={s} className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${STYLE[s].chip}`} data-testid={`problem-count-${s}`}>
              {fmt(section.counts[s])} {STYLE[s].label}
            </span>
          ))}
        </div>
      </div>
      {attention.length === 0 ? (
        <p className="text-xs text-emerald-500 py-1">No router is costing customers right now.</p>
      ) : (
        <ul>{attention.map((r) => <Row key={r.router_id} r={r} onOpen={onOpen} tunnelLabels={tunnelLabels} />)}</ul>
      )}
      {outcomes.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowOutcomes((v) => !v)}
            aria-expanded={showOutcomes}
            className="w-full flex items-center justify-between text-[11px] text-foreground-muted hover:text-foreground transition-colors"
          >
            <span>Fixes and recoveries ({outcomes.length})</span>
            <svg className={`w-3 h-3 transition-transform ${showOutcomes ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showOutcomes && (
            <ul className="mt-1">{outcomes.map((r) => <Row key={r.router_id} r={r} onOpen={onOpen} tunnelLabels={tunnelLabels} />)}</ul>
          )}
        </div>
      )}
    </div>
  );
}
