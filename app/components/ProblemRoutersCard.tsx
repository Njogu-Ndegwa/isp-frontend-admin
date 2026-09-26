'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  OpsHealthProblemRouter,
  OpsHealthProblemRoutersSection,
  OpsHealthProblemState,
  OpsHealthRouterDiagnosis,
} from '../lib/types';

// Problem routers: the routers costing paying customers now, and whether the
// fixes we applied held. One plain reason per router; click opens its look-back.
// Routers with paid customers still waiting to be connected lead the list: a
// waiting payment only counts as "not connected" hours later, once retries give up.
// The window picker re-judges the fleet on the last 1h..3 days, so a fix shows
// up within the hour instead of after a day.

const STYLE: Record<OpsHealthProblemState, { dot: string; chip: string; label: string }> = {
  attention: { dot: 'bg-red-500', chip: 'bg-red-500/10 text-red-500 border-red-500/30', label: 'need attention' },
  recovering: { dot: 'bg-amber-500', chip: 'bg-amber-500/10 text-amber-500 border-amber-500/30', label: 'recovering' },
  fixed: { dot: 'bg-emerald-500', chip: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30', label: 'fixed' },
};
const ORDER: OpsHealthProblemState[] = ['attention', 'recovering', 'fixed'];

// What the live probe (TCP connects + one API login + the router's own push)
// says is wrong. Unknown ailments from a newer backend fall back to a neutral chip.
const AILMENT: Record<string, { label: string; chip: string }> = {
  overloaded: { label: 'Overloaded router', chip: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  lossy_line: { label: 'Line losing packets', chip: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  udp_blocked: { label: 'UDP blocked', chip: 'bg-violet-500/10 text-violet-500 border-violet-500/30' },
  tunnel_down: { label: 'Tunnel down', chip: 'bg-violet-500/10 text-violet-500 border-violet-500/30' },
  offline: { label: 'Offline', chip: 'bg-red-500/10 text-red-500 border-red-500/30' },
  healthy_now: { label: 'Healthy now', chip: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  login_rejected: { label: 'Login rejected', chip: 'bg-red-500/10 text-red-500 border-red-500/30' },
  inconclusive: { label: 'Inconclusive', chip: 'bg-background-tertiary text-foreground-muted border-border' },
};
const NEUTRAL_CHIP = 'bg-background-tertiary text-foreground-muted border-border';

function Diagnosis({ d }: { d: OpsHealthRouterDiagnosis }) {
  const style = AILMENT[d.ailment];
  return (
    <div className="mt-0.5" data-testid="problem-router-diagnosis" data-ailment={d.ailment}>
      <div className="flex items-center gap-1 flex-wrap">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${style?.chip ?? NEUTRAL_CHIP}`}>
          {style?.label ?? d.ailment}
        </span>
        {d.sstp_candidate && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-sky-500/30 bg-sky-500/10 text-[10px] font-medium text-sky-500" data-testid="problem-router-sstp-candidate">
            SSTP candidate
          </span>
        )}
      </div>
      <p className="text-[11px] text-foreground-muted break-words" title={d.probed_at ? `Probed ${d.probed_at}` : undefined}>
        {d.evidence} · {d.action}
      </p>
    </div>
  );
}

const fmt = (n: number | null | undefined) => (typeof n === 'number' ? n.toLocaleString() : '—');

// Windows the admin can judge routers on. 24h is the dashboard snapshot; the
// others (and Refresh) are fetched live, only when picked -- never on a timer.
export const PROBLEM_WINDOWS: { hours: number; label: string }[] = [
  { hours: 1, label: '1h' },
  { hours: 3, label: '3h' },
  { hours: 6, label: '6h' },
  { hours: 12, label: '12h' },
  { hours: 24, label: '24h' },
  { hours: 72, label: '3 days' },
];
const SNAPSHOT_HOURS = 24;

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
        {r.diagnosis && <Diagnosis d={r.diagnosis} />}
      </div>
    </li>
  );
}

export default function ProblemRoutersCard({ section, onOpen, tunnelLabels = {}, loadWindow, initialHours = SNAPSHOT_HOURS }: {
  section?: OpsHealthProblemRoutersSection;
  onOpen: (id: number) => void;
  tunnelLabels?: Record<string, string>;
  /** Fetches the section judged on the last N hours; omit to show the snapshot only. */
  loadWindow?: (hours: number) => Promise<OpsHealthProblemRoutersSection | null>;
  initialHours?: number;
}) {
  const [showOutcomes, setShowOutcomes] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [hours, setHours] = useState(initialHours);
  // Live result for `hours`; null means "use the snapshot" (24h) or "not loaded yet".
  const [live, setLive] = useState<OpsHealthProblemRoutersSection | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const request = useRef(0);

  const load = useCallback(async (h: number) => {
    if (!loadWindow) return;
    const id = ++request.current;
    setLoading(true);
    setFailed(false);
    const result = await loadWindow(h);
    if (id !== request.current) return; // a newer pick won
    setLoading(false);
    if (result && result.counts) setLive(result);
    else setFailed(true);
  }, [loadWindow]);

  useEffect(() => {
    if (initialHours !== SNAPSHOT_HOURS) void load(initialHours);
    // Only on mount: later picks load explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!section || !section.counts) return null;

  const pick = (h: number) => {
    if (h === hours) return;
    setHours(h);
    setLive(null);
    if (h !== SNAPSHOT_HOURS || showRules) {
      void load(h);
    } else {
      request.current++; // drop any in-flight pick; the snapshot answers 24h
      setLoading(false);
      setFailed(false);
    }
  };
  const toggleRules = () => {
    const next = !showRules;
    setShowRules(next);
    if (next && !live && !loading) void load(hours);
  };

  const view = live ?? (hours === SNAPSHOT_HOURS ? section : null);
  const windowed = !!view?.window_label;
  const label = view?.window_label ?? '24h';
  const attention = view ? view.routers.filter((r) => r.state === 'attention') : [];
  const outcomes = view ? view.routers.filter((r) => r.state !== 'attention') : [];
  const lost = (windowed ? view?.paid_not_connected_window : view?.paid_not_connected_24h) ?? 0;
  const avg = (windowed ? view?.paid_not_connected_avg_before : view?.paid_not_connected_daily_avg_before) ?? 0;
  const better = lost <= avg;
  const waiting = view?.waiting_now ?? 0;
  const waitingRouters = view?.waiting_routers ?? 0;
  const pickedLabel = PROBLEM_WINDOWS.find((w) => w.hours === hours)?.label ?? `${hours}h`;
  return (
    <div className="rounded-xl border border-border bg-background-tertiary/40 p-3 mb-3" data-testid="ops-health-problem-routers">
      <div className="flex items-start justify-between gap-2 flex-wrap mb-1.5">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Problem routers</p>
          <p className="text-[11px] text-foreground-muted" data-testid="problem-routers-explainer">
            Routers where paid customers are waiting or were not connected, or that are often unreachable.
          </p>
          {view && waiting > 0 && (
            <p className="text-[11px] text-foreground-muted" data-testid="problem-routers-waiting">
              <span className="font-semibold text-red-500">
                {fmt(waiting)} paid {waiting === 1 ? 'customer' : 'customers'} waiting to be connected now
              </span>{' '}
              on {fmt(waitingRouters)} {waitingRouters === 1 ? 'router' : 'routers'}
            </p>
          )}
          {view && (
            <p className="text-[11px] text-foreground-muted" data-testid="problem-routers-headline">
              <span className={`font-semibold ${lost === 0 ? 'text-emerald-500' : better ? 'text-foreground' : 'text-red-500'}`}>
                {fmt(lost)} paid {lost === 1 ? 'customer' : 'customers'} not connected
              </span>{' '}
              in the last {label} · {better ? 'down from' : 'up from'} {avg}{windowed ? ` per ${label}` : '/day'} before
            </p>
          )}
        </div>
        {view && (
          <div className="flex items-center gap-1 flex-wrap">
            {ORDER.map((s) => (
              <span key={s} className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${STYLE[s].chip}`} data-testid={`problem-count-${s}`}>
                {fmt(view.counts[s])} {STYLE[s].label}
              </span>
            ))}
          </div>
        )}
      </div>
      {loadWindow && (
        <div className="flex items-center gap-1 flex-wrap mb-1.5" role="group" aria-label="Judge routers on the last" data-testid="problem-routers-window">
          <span className="text-[11px] text-foreground-muted mr-0.5">Last</span>
          {PROBLEM_WINDOWS.map((w) => (
            <button
              key={w.hours}
              type="button"
              onClick={() => pick(w.hours)}
              aria-pressed={w.hours === hours}
              className={`px-1.5 py-0.5 rounded border text-[10px] font-medium transition-colors ${
                w.hours === hours
                  ? 'border-foreground/40 bg-foreground/10 text-foreground'
                  : 'border-border text-foreground-muted hover:text-foreground'
              }`}
            >
              {w.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void load(hours)}
            disabled={loading}
            className="ml-1 px-1.5 py-0.5 rounded border border-border text-[10px] text-foreground-muted hover:text-foreground disabled:opacity-50"
            title="Recheck now"
            data-testid="problem-routers-refresh"
          >
            {loading ? 'Checking…' : 'Refresh'}
          </button>
          {live?.generated_at && !loading && (
            <span className="text-[10px] text-foreground-muted" data-testid="problem-routers-asof">
              as of {new Date(live.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}
      {!view ? (
        <p className="text-xs text-foreground-muted py-1" data-testid="problem-routers-status">
          {failed ? `Couldn't load the last ${pickedLabel}. Try Refresh.` : `Checking the last ${pickedLabel}…`}
        </p>
      ) : attention.length === 0 ? (
        <p className="text-xs text-emerald-500 py-1">
          {windowed ? `No router is costing customers in the last ${label}.` : 'No router is costing customers right now.'}
        </p>
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
      {loadWindow && (
        <div className="mt-2">
          <button
            type="button"
            onClick={toggleRules}
            aria-expanded={showRules}
            className="text-[11px] text-foreground-muted hover:text-foreground underline decoration-dotted underline-offset-2"
            data-testid="problem-routers-rules-toggle"
          >
            How is this judged?
          </button>
          {showRules && (
            view?.criteria?.length ? (
              <ul className="mt-1 list-disc pl-4 space-y-0.5" data-testid="problem-routers-criteria">
                {view.criteria.map((c) => <li key={c} className="text-[11px] text-foreground-muted">{c}</li>)}
              </ul>
            ) : (
              <p className="mt-1 text-[11px] text-foreground-muted">{failed ? "Couldn't load the rules." : 'Loading the rules…'}</p>
            )
          )}
        </div>
      )}
    </div>
  );
}
