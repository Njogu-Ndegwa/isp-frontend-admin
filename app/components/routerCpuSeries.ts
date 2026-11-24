import type { RouterCpuByModelResponse, RouterCpuModelSeries, RouterCpuPoint } from '../lib/types';

export type CpuMetric = 'avg' | 'p90' | 'pct_over_80';

export const CPU_METRICS: { key: CpuMetric; label: string; unit: string }[] = [
  { key: 'avg', label: 'Average', unit: '%' },
  { key: 'p90', label: 'Busiest 10%', unit: '%' },
  { key: 'pct_over_80', label: 'Routers ≥80%', unit: '% of routers' },
];

export function seriesKey(m: Pick<RouterCpuModelSeries, 'board_name' | 'ros_major'>): string {
  return m.ros_major ? `${m.board_name} · v${m.ros_major}` : m.board_name;
}

/** Models worth charting: those with data, biggest fleets first. */
export function chartableModels(data: RouterCpuByModelResponse | null, limit = 8): RouterCpuModelSeries[] {
  if (!data) return [];
  return [...data.models]
    .filter((m) => m.points.length > 0)
    .sort((a, b) => b.routers_now - a.routers_now || avgRouters(b) - avgRouters(a))
    .slice(0, limit);
}

function avgRouters(m: RouterCpuModelSeries): number {
  if (!m.points.length) return 0;
  return m.points.reduce((s, p) => s + p.routers, 0) / m.points.length;
}

/** One row per timestamp, one column per model, for a recharts LineChart. */
export function toChartRows(models: RouterCpuModelSeries[], metric: CpuMetric): Record<string, number | string | null>[] {
  const byT = new Map<string, Record<string, number | string | null>>();
  for (const m of models) {
    const key = seriesKey(m);
    for (const p of m.points) {
      const row = byT.get(p.t) ?? { t: p.t, ts: Date.parse(p.t) };
      row[key] = p[metric] ?? null;
      byT.set(p.t, row);
    }
  }
  return [...byT.values()].sort((a, b) => Number(a.ts) - Number(b.ts));
}

/** Router-weighted mean of a metric over the period. */
export function periodMean(points: RouterCpuPoint[], metric: CpuMetric): number | null {
  let num = 0;
  let den = 0;
  for (const p of points) {
    const v = p[metric];
    if (v == null) continue;
    num += v * p.routers;
    den += p.routers;
  }
  return den ? Math.round((num / den) * 10) / 10 : null;
}

/**
 * Average of the metric in the window after a deploy minus the window before it.
 * Positive = CPU went up after the release. Null when either side has no data.
 *
 * A point covers [t, t + stepMs). The one the deploy falls inside holds readings
 * from both sides (or, after a restart, only from after it), so it counts for
 * neither: otherwise a deploy minutes old already shows a "change".
 */
export function changeAround(
  points: RouterCpuPoint[], atIso: string, metric: CpuMetric, stepMs = 0, windowMs = 3 * 3600_000,
): number | null {
  const at = Date.parse(atIso);
  if (Number.isNaN(at)) return null;
  const before = points.filter((p) => { const t = Date.parse(p.t); return t < at && t + stepMs <= at && t >= at - windowMs; });
  const after = points.filter((p) => { const t = Date.parse(p.t); return t >= at && t < at + windowMs; });
  const b = periodMean(before, metric);
  const a = periodMean(after, metric);
  return a == null || b == null ? null : Math.round((a - b) * 10) / 10;
}
