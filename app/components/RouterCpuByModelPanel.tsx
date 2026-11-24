'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api } from '../lib/api';
import type { RouterCpuByModelResponse } from '../lib/types';
import {
  CPU_METRICS, MIN_AFTER_MS, chartableModels, changeAround, dataAfterMs, periodMean, seriesKey, toChartRows,
  type CpuMetric,
} from './routerCpuSeries';

const PERIODS = [
  { hours: 6, label: '6h' },
  { hours: 24, label: '24h' },
  { hours: 24 * 7, label: '7d' },
  { hours: 24 * 30, label: '30d' },
];
const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)',
  '#e11d48', '#64748b', '#0d9488'];
const TZ = 'Africa/Nairobi';

function fmtTick(ts: number, hours: number): string {
  const d = new Date(ts);
  return hours <= 24
    ? d.toLocaleTimeString('en-KE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-KE', { timeZone: TZ, day: 'numeric', month: 'short' });
}

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-KE', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

/** Short commit for a deploy, or null when the heartbeat didn't record one. */
function shortVersion(v: string | null | undefined): string | null {
  return v && v !== 'unknown' ? v.slice(0, 7) : null;
}

function signed(v: number | null): string {
  if (v == null) return '—';
  return `${v > 0 ? '+' : ''}${v}`;
}

export default function RouterCpuByModelPanel() {
  const [hours, setHours] = useState(24);
  const [metric, setMetric] = useState<CpuMetric>('avg');
  const [splitVersion, setSplitVersion] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [data, setData] = useState<RouterCpuByModelResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const next = await api.getRouterCpuByModel({ hours, splitVersion });
        if (alive) { setData(next); setError(null); }
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'CPU history unavailable');
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    // A new 5-minute bucket lands every 5 minutes; refreshing faster shows nothing new.
    const timer = window.setInterval(() => void load(), 5 * 60_000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [hours, splitVersion]);

  const models = useMemo(() => chartableModels(data), [data]);
  const rows = useMemo(() => toChartRows(models, metric), [models, metric]);
  const metricInfo = CPU_METRICS.find((m) => m.key === metric)!;
  const deploys = useMemo(() => (data?.deploys ?? []).filter((d) => d.runtime_mode !== 'shadow'), [data]);
  const lastDeploy = deploys.at(-1) ?? null;
  const stepMs = (data?.step_seconds ?? 0) * 1000;
  const afterMs = lastDeploy && data ? dataAfterMs(lastDeploy.at, data.to, stepMs) : 0;
  const collecting = lastDeploy != null && afterMs < MIN_AFTER_MS;
  const readyInMin = Math.ceil((MIN_AFTER_MS - afterMs) / 60_000);

  const toggle = (key: string) => setHidden((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  return (
    <section className="card p-4 border border-border" aria-label="Router CPU by model">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">Router CPU by model</h2>
          <p className="text-sm text-foreground-muted mt-1">
            Each router counts once per interval. Dashed lines are app deploys: compare before and after.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <div className="inline-flex rounded-lg border border-border overflow-hidden" role="group" aria-label="Period">
            {PERIODS.map((p) => (
              <button key={p.hours} type="button" onClick={() => setHours(p.hours)}
                className={`px-3 py-1.5 min-h-[36px] ${hours === p.hours ? 'bg-primary text-white' : 'hover:bg-background-secondary'}`}
                aria-pressed={hours === p.hours}>{p.label}</button>
            ))}
          </div>
          <select value={metric} onChange={(e) => setMetric(e.target.value as CpuMetric)}
            className="rounded-lg border border-border bg-background px-2 py-1.5 min-h-[36px]" aria-label="Metric">
            {CPU_METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <label className="inline-flex items-center gap-2 px-2 min-h-[36px] cursor-pointer">
            <input type="checkbox" checked={splitVersion} onChange={(e) => setSplitVersion(e.target.checked)} />
            Split by RouterOS
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-danger mt-3">CPU history unavailable: {error}</p>}
      {!error && !loading && rows.length === 0 && (
        <p className="text-sm text-foreground-muted mt-3">
          No history yet. Points appear five minutes after routers start reporting.
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-3 h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']}
                tickFormatter={(v) => fmtTick(Number(v), hours)} minTickGap={40}
                tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-background-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 11 }}
                labelFormatter={(v) => fmtWhen(new Date(Number(v)).toISOString())}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any, name: any) => [v == null ? '—' : `${v}%`, String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 11, cursor: 'pointer' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(e: any) => e?.dataKey && toggle(String(e.dataKey))} />
              {deploys.map((d) => (
                <ReferenceLine key={d.at} x={Date.parse(d.at)} stroke="var(--color-foreground-muted)" strokeDasharray="4 4"
                  label={{ value: shortVersion(d.version) ?? 'deploy', position: 'insideTopRight', fontSize: 9, fill: 'var(--color-foreground-muted)' }} />
              ))}
              {metric === 'avg' && <ReferenceLine y={80} stroke="var(--color-danger)" strokeOpacity={0.4} />}
              {models.map((m, i) => {
                const key = seriesKey(m);
                return (
                  <Line key={key} dataKey={key} name={key} type="monotone" dot={false} connectNulls
                    stroke={COLORS[i % COLORS.length]} strokeWidth={2} hide={hidden.has(key)} isAnimationActive={false} />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {models.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-foreground-muted text-xs">
                <th className="py-1 pr-3 font-medium">Model</th>
                <th className="py-1 pr-3 font-medium text-right">Reporting now</th>
                <th className="py-1 pr-3 font-medium text-right">CPU now</th>
                <th className="py-1 pr-3 font-medium text-right">{metricInfo.label}, period</th>
                {lastDeploy && <th className="py-1 font-medium text-right" title={`Up to 3 h after vs 3 h before ${fmtWhen(lastDeploy.at)}, once 30 min of data exist after it. Traffic also changes with the time of day.`}>Since last deploy</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {models.map((m) => {
                const change = lastDeploy && !collecting ? changeAround(m.points, lastDeploy.at, metric, stepMs) : null;
                return (
                  <tr key={seriesKey(m)}>
                    <td className="py-1.5 pr-3">{seriesKey(m)}</td>
                    <td className="py-1.5 pr-3 text-right">{m.routers_now}</td>
                    <td className="py-1.5 pr-3 text-right">{m.avg_now == null ? '—' : `${m.avg_now}%`}</td>
                    <td className="py-1.5 pr-3 text-right">{periodMean(m.points, metric) ?? '—'}{metricInfo.unit === '%' ? '%' : ''}</td>
                    {lastDeploy && (
                      <td className={`py-1.5 text-right ${change != null && change >= 5 ? 'text-danger font-medium' : ''} ${collecting ? 'text-foreground-muted' : ''}`}>
                        {collecting ? 'collecting' : signed(change)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {lastDeploy && (
            <p className="text-xs text-foreground-muted mt-2">
              Last deploy {fmtWhen(lastDeploy.at)}{shortVersion(lastDeploy.version) ? ` (${shortVersion(lastDeploy.version)})` : ''}.{' '}
              {collecting
                ? `The change is shown once 30 minutes of data exist after it (about ${readyInMin} min).`
                : 'A rise of 5 points or more is highlighted.'}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
