/**
 * Router health history (CPU / memory over time) -> chart rows, ticks and
 * labels. Pure, so it is unit-tested apart from the chart.
 *
 * The API returns column-wise series on naive-UTC slots; the app shows times in
 * GMT+3 (lib/dateUtils), so ticks fall on GMT+3 hours and midnights.
 */
import type { HealthHistoryRange, RouterHealthHistory } from './types';

export type HealthMetric = 'cpu' | 'mem';

export interface HealthRow {
  /** Slot start, epoch ms. */
  t: number;
  avg: number | null;
  max: number | null;
  /** [avg, peak] for the light band behind the average line; null = gap. */
  band: [number, number] | null;
  reboots: number;
  linkDrops: number;
}

const EAT_OFFSET_MS = 3 * 3600 * 1000;
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function startMs(h: Pick<RouterHealthHistory, 'start'>): number {
  const s = h.start;
  return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
}

export function toRows(h: RouterHealthHistory, metric: HealthMetric): HealthRow[] {
  const avgs = metric === 'cpu' ? h.cpu_avg : h.mem_avg;
  const maxes = metric === 'cpu' ? h.cpu_max : h.mem_max;
  const t0 = startMs(h);
  const step = h.step_seconds * 1000;
  return avgs.map((avg, i) => {
    const max = maxes[i] ?? null;
    return {
      t: t0 + i * step,
      avg,
      max,
      band: avg !== null && max !== null ? [avg, Math.max(avg, max)] : null,
      reboots: h.reboots[i] ?? 0,
      linkDrops: h.link_drops[i] ?? 0,
    };
  });
}

export function hasData(h: RouterHealthHistory | null | undefined, metric: HealthMetric): boolean {
  if (!h) return false;
  return (metric === 'cpu' ? h.cpu_avg : h.mem_avg).some((v) => v !== null);
}

function eat(t: number): Date {
  return new Date(t + EAT_OFFSET_MS);
}

const pad = (n: number) => String(n).padStart(2, '0');

function hhmm(d: Date): string {
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Axis ticks: every 6 hours (GMT+3) for 24h, each GMT+3 midnight for 7d. */
export function ticksFor(rows: HealthRow[], range: HealthHistoryRange): number[] {
  return rows
    .map((r) => r.t)
    .filter((t) => {
      const d = eat(t);
      if (d.getUTCMinutes() !== 0) return false;
      return range === '24h' ? d.getUTCHours() % 6 === 0 : d.getUTCHours() === 0;
    });
}

export function tickLabel(t: number, range: HealthHistoryRange): string {
  const d = eat(t);
  return range === '24h' ? hhmm(d) : SHORT_DAYS[d.getUTCDay()];
}

/** Tooltip heading for one slot: "Mon 21:05–21:10" or "Mon 23 Nov, 21:00–22:00". */
export function slotLabel(t: number, stepSeconds: number, range: HealthHistoryRange): string {
  const from = eat(t);
  const to = eat(t + stepSeconds * 1000);
  const day = SHORT_DAYS[from.getUTCDay()];
  if (range === '24h') return `${day} ${hhmm(from)}–${hhmm(to)}`;
  return `${day} ${from.getUTCDate()} ${SHORT_MONTHS[from.getUTCMonth()]}, ${hhmm(from)}–${hhmm(to)}`;
}

export function pct(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : `${Math.round(v)}%`;
}

/**
 * Nearest-rank percentile, the same rule as the backend: the smallest value
 * with at least p% of the values at or below it. Always one of the values.
 */
export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * ordered.length));
  return ordered[rank - 1];
}

export type RankSortKey =
  | 'cpu_p95' | 'cpu_p99' | 'cpu_max' | 'cpu_avg'
  | 'mem_p95' | 'mem_max' | 'reboots' | 'link_drops' | 'name';

/**
 * Highest first for numbers (the most affected router on top), A-Z for names.
 * A router with no value for the key sorts last either way, and ties fall back
 * to CPU p95 so the order never jumps between refreshes.
 */
export function sortRanking<T extends { name: string; cpu_p95: number | null; router_id: number }>(
  rows: T[], key: RankSortKey,
): T[] {
  const val = (r: T): number | null => (key === 'name' ? null : ((r as unknown as Record<string, number | null>)[key] ?? null));
  return [...rows].sort((a, b) => {
    if (key === 'name') return a.name.localeCompare(b.name) || a.router_id - b.router_id;
    const va = val(a);
    const vb = val(b);
    if (va === null && vb !== null) return 1;
    if (vb === null && va !== null) return -1;
    if (va !== null && vb !== null && va !== vb) return vb - va;
    return (b.cpu_p95 ?? -1) - (a.cpu_p95 ?? -1) || a.router_id - b.router_id;
  });
}

/** Load bands for a p95 figure: the colour is never the only signal (the number is shown too). */
export function loadTone(v: number | null | undefined): 'high' | 'elevated' | 'normal' | 'none' {
  if (v === null || v === undefined) return 'none';
  if (v >= 80) return 'high';
  if (v >= 50) return 'elevated';
  return 'normal';
}
