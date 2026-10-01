import type { OpsHealthHistoryPoint } from './types';

// Per-router breakdowns behind the Network health graphs. Pure helpers so the
// chart components stay thin and this logic is unit-tested.

export type BreakdownKey = 'retry_by_router' | 'expiry_hot_by_router';
export type TotalKey = 'provisioning_retry_pending' | 'expiry_active_hot';

/** Distinct hues for the few routers that get their own band; "others" is grey. */
export const ROUTER_PALETTE = [
  '#2563eb', '#d97706', '#059669', '#db2777', '#7c3aed',
  '#0891b2', '#65a30d', '#e11d48', '#9333ea', '#ca8a04',
];
export const OTHERS_COLOR = '#a1a1aa';

export interface RankedRouter { id: string; total: number; share: number }

export function hasBreakdown(points: OpsHealthHistoryPoint[], key: BreakdownKey): boolean {
  return points.some((p) => p[key] !== undefined && p[key] !== null);
}

/** Routers ordered by their contribution over the window (sum of their counts). */
export function rankRouters(points: OpsHealthHistoryPoint[], key: BreakdownKey): RankedRouter[] {
  const sums = new Map<string, number>();
  let all = 0;
  for (const p of points) {
    for (const [id, n] of Object.entries(p[key] ?? {})) {
      sums.set(id, (sums.get(id) ?? 0) + n);
      all += n;
    }
  }
  return [...sums.entries()]
    .sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))
    .map(([id, total]) => ({ id, total, share: all ? Math.round((100 * total) / all) : 0 }));
}

export interface StackRow {
  t: string;
  total: number | null;
  others: number | null;
  /** The point's full breakdown, so a tooltip can name who is inside "others". */
  detail: Record<string, number>;
  [routerId: string]: number | string | null | Record<string, number>;
}

/** One row per point: a column per top router, "others" = total minus those. */
export function buildStackRows(points: OpsHealthHistoryPoint[], key: BreakdownKey, totalKey: TotalKey, topIds: string[]): StackRow[] {
  return points.map((p) => {
    const detail = p[key] ?? {};
    const total = typeof p[totalKey] === 'number' ? (p[totalKey] as number) : null;
    const row: StackRow = { t: p.t, total, others: null, detail };
    let named = 0;
    for (const id of topIds) {
      const n = detail[id] ?? 0;
      row[id] = total === null ? null : n;
      named += n;
    }
    row.others = total === null ? null : Math.max(0, total - named);
    return row;
  });
}

/** Stable colours for one page: the first router mentioned gets the first hue, and
 *  keeps it on every graph, so the same router reads the same everywhere. */
export function assignRouterColors(orderedIds: Array<string | number>): Record<string, string> {
  const colors: Record<string, string> = {};
  let next = 0;
  for (const raw of orderedIds) {
    const id = String(raw);
    if (colors[id]) continue;
    colors[id] = ROUTER_PALETTE[next % ROUTER_PALETTE.length];
    next += 1;
  }
  return colors;
}

export interface TooltipLine { id: string | null; name: string; count: number; color: string }

/** What a tooltip lists at one moment: named bands first, then who is in "others". */
export function tooltipLines(row: StackRow, topIds: string[], names: Record<string, string>,
  colors: Record<string, string>): TooltipLine[] {
  const lines: TooltipLine[] = [];
  for (const id of topIds) {
    const n = Number(row[id] ?? 0);
    if (n > 0) lines.push({ id, name: names[id] ?? `Router #${id}`, count: n, color: colors[id] ?? OTHERS_COLOR });
  }
  const rest = Object.entries(row.detail).filter(([id, n]) => !topIds.includes(id) && n > 0);
  for (const [id, n] of rest) lines.push({ id, name: names[id] ?? `Router #${id}`, count: n, color: OTHERS_COLOR });
  const unnamed = Math.max(0, Number(row.others ?? 0) - rest.reduce((a, [, n]) => a + n, 0));
  if (unnamed > 0) lines.push({ id: null, name: 'other routers', count: unnamed, color: OTHERS_COLOR });
  return lines.sort((a, b) => b.count - a.count);
}
