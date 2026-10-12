'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '../lib/api';
import { OvesGqlGraphSummary, OvesGqlInsights } from '../lib/types';

// Apollo Studio's Insights page, inside the dashboard: pick a graph (shadow
// codes first), see requests vs errors and the error rate over the chosen
// range, the operations ranked by traffic with their error rate, and every
// error group with its actual message. Click an operation to narrow to it.

const GqlRequestBars = dynamic(() => import('./OvesHealthCharts').then((m) => m.GqlRequestBars), { ssr: false });
const GqlErrorRate = dynamic(() => import('./OvesHealthCharts').then((m) => m.GqlErrorRate), { ssr: false });

function pct(v: number | null | undefined, digits = 2): string {
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

function rateClass(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return 'text-foreground-muted';
  return rate >= 0.10 ? 'text-red-500' : rate >= 0.02 ? 'text-amber-500' : 'text-foreground-muted';
}

export default function OvesGraphqlErrors({ hours, summary }: { hours: number; summary: OvesGqlGraphSummary[] }) {
  const [graphs, setGraphs] = useState<{ graph: string; label: string; role: string }[] | null>(null);
  const [graph, setGraph] = useState<string | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [data, setData] = useState<OvesGqlInsights | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  // Which request the shown data/error belongs to; loading = the current one has not landed yet.
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [showCaller, setShowCaller] = useState(false);

  useEffect(() => {
    api.getOvesGraphqlGraphs().then((g) => {
      setGraphs(g?.graphs ?? []);
      if (g?.graphs?.length) setGraph((cur) => cur ?? g.graphs[0].graph);
    });
  }, []);

  const requestKey = graph ? `${graph}|${hours}|${operation ?? ''}` : null;
  const loading = requestKey !== null && requestKey !== settledKey;

  useEffect(() => {
    if (!graph || !requestKey) return;
    let alive = true;
    api.getOvesGraphqlInsights(graph, hours, operation ?? undefined)
      .then((d) => { if (alive) { setData(d); setError(null); } })
      .catch((e: unknown) => {
        if (alive) setError({ key: requestKey, message: e instanceof Error ? e.message : 'Could not load Apollo insights' });
      })
      .finally(() => { if (alive) setSettledKey(requestKey); });
    return () => { alive = false; };
  }, [graph, hours, operation, requestKey]);

  const byGraph = useMemo(() => Object.fromEntries(summary.map((s) => [s.graph, s])), [summary]);
  const groups = useMemo(() => {
    const all = data?.error_groups ?? [];
    return showCaller ? all : all.filter((e) => e.kind === 'system');
  }, [data, showCaller]);
  const callerCount = (data?.error_groups ?? []).filter((e) => e.kind !== 'system').reduce((a, e) => a + e.count, 0);

  if (graphs === null) return <p className="text-xs text-foreground-muted">Loading graphs…</p>;
  if (graphs.length === 0) {
    return <p className="text-xs text-foreground-muted">Apollo GraphOS is not connected. Set OVES_APOLLO_GRAPH_KEYS on the server to see errors per operation, like Apollo Studio.</p>;
  }

  return (
    <div className="space-y-4" data-testid="oves-gql">
      {/* graph picker, with each graph's 15-minute platform error rate */}
      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1" role="tablist" aria-label="Graph">
        {graphs.map((g) => {
          const s = byGraph[g.graph];
          const active = g.graph === graph;
          return (
            <button key={g.graph} type="button" role="tab" aria-selected={active}
              onClick={() => { setGraph(g.graph); setOperation(null); }}
              className={`flex-shrink-0 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${active ? 'border-foreground/40 bg-background-tertiary' : 'border-border hover:bg-background-tertiary/50'}`}
              title={g.role}>
              <span className="block text-xs font-medium text-foreground whitespace-nowrap">{g.label}</span>
              <span className={`block text-[10px] tabular-nums whitespace-nowrap ${rateClass(s?.system_error_rate)}`}>
                {s ? `${pct(s.system_error_rate, 1)} platform errors · 15m` : g.role}
              </span>
            </button>
          );
        })}
      </div>

      {error && error.key === requestKey && <p className="text-xs text-red-500" data-testid="oves-gql-error">{error.message}</p>}
      {!data && loading && <p className="text-xs text-foreground-muted">Loading from Apollo GraphOS…</p>}

      {data && (
        <div className={`space-y-4 ${loading ? 'opacity-60' : ''}`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-[11px] uppercase tracking-wider text-foreground-muted">Requests</p><p className="text-xl font-semibold tabular-nums text-foreground">{data.requests.toLocaleString()}</p></div>
              <div><p className="text-[11px] uppercase tracking-wider text-foreground-muted">With errors</p><p className={`text-xl font-semibold tabular-nums ${data.errors ? 'text-amber-500' : 'text-foreground'}`}>{data.errors.toLocaleString()}</p></div>
              <div><p className="text-[11px] uppercase tracking-wider text-foreground-muted">Error rate</p><p className={`text-xl font-semibold tabular-nums ${rateClass(data.error_rate)}`}>{pct(data.error_rate)}</p></div>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              {operation && (
                <button type="button" onClick={() => setOperation(null)} className="rounded-md border border-border px-2 py-1 text-foreground hover:bg-background-tertiary" data-testid="oves-gql-clear-op">
                  {data.operations.find((o) => o.name === operation)?.label ?? operation} ✕
                </button>
              )}
              <a href={data.studio_url} target="_blank" rel="noopener noreferrer" className="text-foreground-muted underline hover:text-foreground">Open in Apollo Studio ↗</a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GqlRequestBars series={data.series} bucketMinutes={data.bucket_minutes} />
            <GqlErrorRate series={data.series} bucketMinutes={data.bucket_minutes} />
          </div>

          {/* errors first: this is what the view is for */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-[11px] uppercase tracking-wider text-foreground-muted">Errors{operation ? ' for this operation' : ''}</p>
              {callerCount > 0 && (
                <label className="flex items-center gap-1.5 text-[11px] text-foreground-muted cursor-pointer">
                  <input type="checkbox" checked={showCaller} onChange={(e) => setShowCaller(e.target.checked)} data-testid="oves-gql-show-caller" />
                  show caller errors ({callerCount.toLocaleString()})
                </label>
              )}
            </div>
            {groups.length === 0 ? (
              <p className="text-xs text-emerald-500">
                No {showCaller ? '' : 'platform '}errors in this window{!showCaller && callerCount ? ` (${callerCount.toLocaleString()} caller errors hidden)` : ''}.
              </p>
            ) : (
              <ul className="space-y-1.5" data-testid="oves-gql-errors">
                {groups.map((e, i) => (
                  <li key={`${e.operation}-${e.path}-${e.code}-${i}`} className={`rounded-lg border px-3 py-2 ${e.kind === 'system' ? 'border-red-500/40 bg-red-500/5' : 'border-border'}`}>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px]">
                      <span className={`font-semibold tabular-nums ${e.kind === 'system' ? 'text-red-500' : 'text-amber-500'}`}>{e.count.toLocaleString()}×</span>
                      <button type="button" className="text-foreground font-medium hover:underline" onClick={() => setOperation(e.operation)}>{e.operation_label}</button>
                      {e.path && <span className="font-mono text-foreground-muted">{e.path}</span>}
                      {e.code && <span className="font-mono text-foreground-muted">{e.code}</span>}
                      <span className={`uppercase tracking-wider text-[10px] ${e.kind === 'system' ? 'text-red-500' : 'text-foreground-muted'}`}>{e.kind === 'system' ? 'platform' : 'caller'} · {e.reason.replace(/_/g, ' ')}</span>
                      {e.last_seen && <span className="text-foreground-muted ml-auto">last {ago(e.last_seen)}</span>}
                    </div>
                    <p className="text-xs font-mono text-foreground break-all mt-1">{e.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-1.5">Operations</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" data-testid="oves-gql-ops">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-foreground-muted">
                    <th className="pb-1 pr-3 font-medium">Operation</th>
                    <th className="pb-1 pr-3 font-medium text-right">Requests</th>
                    <th className="pb-1 pr-3 font-medium text-right">Per min</th>
                    <th className="pb-1 pr-3 font-medium text-right">Errors</th>
                    <th className="pb-1 font-medium text-right">Error rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.operations.map((o) => (
                    <tr key={o.name} onClick={() => setOperation(o.name === operation ? null : o.name)}
                      className={`border-t border-border cursor-pointer hover:bg-background-tertiary/50 ${o.name === operation ? 'bg-background-tertiary' : ''}`}>
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        <span className="text-foreground font-medium">{o.label}</span>
                        <span className="ml-1.5 text-[10px] uppercase tracking-wider text-foreground-muted">{o.type}</span>
                        {o.is_code && <span className="ml-1.5 text-[10px] uppercase tracking-wider text-sky-400">code</span>}
                      </td>
                      <td className="py-1.5 pr-3 tabular-nums text-right text-foreground">{o.requests.toLocaleString()}</td>
                      <td className="py-1.5 pr-3 tabular-nums text-right text-foreground-muted">{o.requests_per_min}</td>
                      <td className={`py-1.5 pr-3 tabular-nums text-right ${o.errors ? 'text-amber-500' : 'text-foreground-muted'}`}>{o.errors.toLocaleString()}</td>
                      <td className={`py-1.5 tabular-nums text-right ${rateClass(o.error_rate)}`}>{pct(o.error_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
