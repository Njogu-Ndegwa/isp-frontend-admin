import { describe, expect, it } from 'vitest';
import type { OpsHealthHistoryPoint } from '../types';
import {
  OTHERS_COLOR, ROUTER_PALETTE, assignRouterColors, buildStackRows, hasBreakdown, rankRouters, tooltipLines,
} from '../routerBreakdown';

const base = {
  provisioning_p95_end_to_end: null, payments_p95_callback: null, expiry_active_hot: null,
  expiry_p95_removal: null, tunnels_offline: null, safety_net_removals: null, active_writers: null,
};
const pt = (t: string, total: number | null, retry?: Record<string, number>): OpsHealthHistoryPoint => ({
  ...base, t, provisioning_retry_pending: total, ...(retry ? { retry_by_router: retry } : {}),
});

// Shaped like the real 2026-09-24 afternoon: Pamoja and EBENEZER behind the hump.
const points = [
  pt('2026-09-24T17:15:00Z', 7, { '486': 4, '388': 3 }),
  pt('2026-09-24T17:30:00Z', 8, { '486': 4, '388': 3, '292': 1 }),
  pt('2026-09-24T17:45:00Z', 9, { '486': 5, '388': 3, '525': 1 }),
];

describe('routerBreakdown', () => {
  it('knows whether snapshots carry a breakdown yet', () => {
    expect(hasBreakdown(points, 'retry_by_router')).toBe(true);
    expect(hasBreakdown([pt('2026-09-24T10:00:00Z', 3)], 'retry_by_router')).toBe(false);
  });

  it('ranks routers by their share of the window', () => {
    const ranked = rankRouters(points, 'retry_by_router');
    expect(ranked.map((r) => r.id)).toEqual(['486', '388', '292', '525']);
    expect(ranked[0]).toEqual({ id: '486', total: 13, share: 54 });
  });

  it('builds stacked rows with an "others" remainder that never goes negative', () => {
    const rows = buildStackRows(points, 'retry_by_router', 'provisioning_retry_pending', ['486', '388']);
    expect(rows[1]).toMatchObject({ '486': 4, '388': 3, others: 1, total: 8 });
    const gap = buildStackRows([pt('2026-09-24T18:00:00Z', null, {})], 'retry_by_router', 'provisioning_retry_pending', ['486']);
    expect(gap[0]).toMatchObject({ '486': null, others: null, total: null });
    const drift = buildStackRows([pt('2026-09-24T18:00:00Z', 2, { '486': 5 })], 'retry_by_router', 'provisioning_retry_pending', ['486']);
    expect(drift[0].others).toBe(0);
  });

  it('gives each router one colour for the whole page, first come first served', () => {
    const colors = assignRouterColors([281, '486', 281, '388']);
    expect(colors).toEqual({ '281': ROUTER_PALETTE[0], '486': ROUTER_PALETTE[1], '388': ROUTER_PALETTE[2] });
  });

  it('names everyone in the tooltip, including routers folded into "others"', () => {
    const rows = buildStackRows(points, 'retry_by_router', 'provisioning_retry_pending', ['486', '388']);
    const names = { '486': 'Pamoja #3', '388': 'EBENEZER #1', '525': 'Free wifi #5' };
    const lines = tooltipLines(rows[2], ['486', '388'], names, { '486': '#111', '388': '#222' });
    expect(lines).toEqual([
      { id: '486', name: 'Pamoja #3', count: 5, color: '#111' },
      { id: '388', name: 'EBENEZER #1', count: 3, color: '#222' },
      { id: '525', name: 'Free wifi #5', count: 1, color: OTHERS_COLOR },
    ]);
  });
});
