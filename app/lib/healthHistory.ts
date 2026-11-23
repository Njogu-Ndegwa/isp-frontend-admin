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
