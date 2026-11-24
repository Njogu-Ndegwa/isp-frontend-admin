import { describe, expect, it } from 'vitest';
import {
  MIN_AFTER_MS, changeAround, chartableModels, dataAfterMs, periodMean, seriesKey, toChartRows,
} from '../routerCpuSeries';
import type { RouterCpuByModelResponse, RouterCpuPoint } from '../../lib/types';

const pt = (t: string, avg: number, routers = 10): RouterCpuPoint => ({
  t, routers, avg, p50: avg, p90: Math.min(avg + 20, 100), max: 100, pct_over_80: 0, pct_peaked_95: 0, samples: routers * 5,
});

const data: RouterCpuByModelResponse = {
  from: '2026-11-23T00:00:00Z', to: '2026-11-23T06:00:00Z', step_seconds: 3600, bucket_seconds: 300, split_version: false,
  deploys: [{ at: '2026-11-23T03:00:00Z', version: 'abc1234def', runtime_mode: 'active' }],
  models: [
    { board_name: 'hAP lite', ros_major: null, routers_now: 3, avg_now: 40, points: [pt('2026-11-23T01:00:00Z', 40, 3)] },
    { board_name: 'RB951Ui-2HnD', ros_major: null, routers_now: 70, avg_now: 30, points: [
      pt('2026-11-23T01:00:00Z', 20), pt('2026-11-23T02:00:00Z', 20, 30), pt('2026-11-23T03:00:00Z', 35), pt('2026-11-23T04:00:00Z', 35),
    ] },
    { board_name: 'RB4011iGS+', ros_major: '7', routers_now: 0, avg_now: null, points: [] },
  ],
};

describe('router CPU series', () => {
  it('charts the biggest fleets first and skips models with no history', () => {
    expect(chartableModels(data).map((m) => m.board_name)).toEqual(['RB951Ui-2HnD', 'hAP lite']);
    expect(chartableModels(null)).toEqual([]);
    expect(seriesKey({ board_name: 'RB951Ui-2HnD', ros_major: '6' })).toBe('RB951Ui-2HnD · v6');
  });

  it('pivots to one row per time with a column per model', () => {
    const rows = toChartRows(chartableModels(data), 'avg');
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ t: '2026-11-23T01:00:00Z', 'RB951Ui-2HnD': 20, 'hAP lite': 40 });
    expect(rows[1]['hAP lite']).toBeUndefined();
    expect(rows.map((r) => r.ts)).toEqual([...rows.map((r) => r.ts)].sort());
  });

  it('weights the period mean by routers and measures the change around a deploy', () => {
    const rb = data.models[1].points;
    expect(periodMean(rb, 'avg')).toBe(Math.round(((20 * 10 + 20 * 30 + 35 * 10 + 35 * 10) / 60) * 10) / 10);
    expect(changeAround(rb, data.deploys[0].at, 'avg')).toBe(15);
    expect(changeAround(rb, 'not a date', 'avg')).toBeNull();
    expect(changeAround(data.models[0].points, data.deploys[0].at, 'avg')).toBeNull();
  });

  it('leaves out the interval the deploy falls inside', () => {
    // Live case, 24 Nov: deploy at 04:10:52, history only from the 04:10 bucket on.
    const pts = [pt('2026-11-24T04:10:00Z', 30), pt('2026-11-24T04:15:00Z', 20)];
    expect(changeAround(pts, '2026-11-24T04:10:52Z', 'avg', 300_000)).toBeNull();
    // With a full bucket before it, the straddling one is still skipped on both sides.
    const more = [pt('2026-11-24T04:05:00Z', 10), ...pts];
    expect(changeAround(more, '2026-11-24T04:10:52Z', 'avg', 300_000)).toBe(10);
    // Without the step, the straddling bucket wrongly counts as "before".
    expect(changeAround(more, '2026-11-24T04:10:52Z', 'avg')).toBe(0);
  });

  it('counts only written data after a deploy before judging it', () => {
    // Live case, 24 Nov: deploy 07:26:13, page read 07:36:24, 15-minute points.
    // The 07:15 point holds the deploy; 07:30-07:35 is written; 07:35 is still open.
    expect(dataAfterMs('2026-11-24T07:26:13Z', '2026-11-24T07:36:24Z', 900_000)).toBe(5 * 60_000);
    expect(dataAfterMs('2026-11-24T07:26:13Z', '2026-11-24T07:36:24Z', 900_000)).toBeLessThan(MIN_AFTER_MS);
    // At 08:16 the newest written bucket ends 08:15: 45 minutes, enough.
    expect(dataAfterMs('2026-11-24T07:26:13Z', '2026-11-24T08:16:00Z', 900_000)).toBe(45 * 60_000);
    // The newest bucket counts only once it has been written (30 s after it closes).
    expect(dataAfterMs('2026-11-24T07:26:13Z', '2026-11-24T08:00:10Z', 900_000)).toBe(25 * 60_000);
    expect(dataAfterMs('2026-11-24T07:26:13Z', '2026-11-24T08:00:40Z', 900_000)).toBe(MIN_AFTER_MS);
    expect(dataAfterMs('bad', '2026-11-24T08:00:40Z')).toBe(0);
  });
});
