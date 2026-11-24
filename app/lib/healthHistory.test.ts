import { describe, expect, it } from 'vitest';
import {
  hasData, loadTone, pct, percentile, slotLabel, sortRanking, startMs, tickLabel, ticksFor, toRows,
} from './healthHistory';
import type { RouterHealthHistory } from './types';

function history(over: Partial<RouterHealthHistory> = {}): RouterHealthHistory {
  return {
    router_id: 7,
    range: '24h',
    step_seconds: 300,
    start: '2026-11-23T09:00:00', // 12:00 GMT+3
    slots: 4,
    cpu_avg: [20, null, 55.5, 30],
    cpu_max: [35, null, 99, 30],
    mem_avg: [null, null, null, null],
    mem_max: [null, null, null, null],
    reboots: [0, 0, 1, 0],
    link_drops: [0, 3, 0, 0],
    summary: {
      cpu_avg: 35, cpu_p95: 55.5, cpu_p99: 55.5, cpu_max: 99,
      mem_avg: null, mem_p95: null, mem_p99: null, mem_max: null,
      reboots: 1, link_drops: 3, buckets_with_data: 3,
      last_report_at: '2026-11-23T09:19:00', reporting: true, link_drops_reported: true,
    },
    ...over,
  };
}

describe('health history rows', () => {
  it('reads the naive start as UTC', () => {
    expect(startMs(history())).toBe(Date.UTC(2026, 10, 23, 9, 0));
    expect(startMs(history({ start: '2026-11-23T09:00:00Z' }))).toBe(Date.UTC(2026, 10, 23, 9, 0));
  });

  it('maps slots to rows with an avg-to-peak band and keeps gaps as null', () => {
    const rows = toRows(history(), 'cpu');
    expect(rows.map((r) => r.t - rows[0].t)).toEqual([0, 300_000, 600_000, 900_000]);
    expect(rows[0]).toMatchObject({ avg: 20, max: 35, band: [20, 35] });
    expect(rows[1]).toMatchObject({ avg: null, band: null, linkDrops: 3 });
    expect(rows[2]).toMatchObject({ band: [55.5, 99], reboots: 1 });
  });

  it('knows when a metric has nothing to draw', () => {
    expect(hasData(history(), 'cpu')).toBe(true);
    expect(hasData(history(), 'mem')).toBe(false);
    expect(hasData(null, 'cpu')).toBe(false);
  });
});

describe('time labels (GMT+3)', () => {
  it('ticks every 6 hours on GMT+3 for 24h and at midnight for 7d', () => {
    const day = history({
      start: '2026-11-22T09:00:00', // 12:00 GMT+3
      slots: 288,
      cpu_avg: Array(288).fill(1),
      cpu_max: Array(288).fill(1),
      reboots: Array(288).fill(0),
      link_drops: Array(288).fill(0),
    });
    const rows = toRows(day, 'cpu');
    expect(ticksFor(rows, '24h').map((t) => tickLabel(t, '24h'))).toEqual(['12:00', '18:00', '00:00', '06:00']);

    const week = history({
      range: '7d', step_seconds: 3600, start: '2026-11-16T09:00:00', slots: 168,
      cpu_avg: Array(168).fill(1), cpu_max: Array(168).fill(1),
      reboots: Array(168).fill(0), link_drops: Array(168).fill(0),
    });
    const weekRows = toRows(week, 'cpu');
    const labels = ticksFor(weekRows, '7d').map((t) => tickLabel(t, '7d'));
    expect(labels).toEqual(['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon']);
  });

  it('labels a slot with its span', () => {
    const t = Date.UTC(2026, 10, 23, 18, 5); // 21:05 GMT+3, a Monday
    expect(slotLabel(t, 300, '24h')).toBe('Mon 21:05–21:10');
    expect(slotLabel(t, 3600, '7d')).toBe('Mon 23 Nov, 21:05–22:05');
  });

  it('formats percentages and blanks', () => {
    expect(pct(23.6)).toBe('24%');
    expect(pct(null)).toBe('—');
  });
});

describe('percentile', () => {
  it('matches the backend nearest-rank rule', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(values, 95)).toBe(95);
    expect(percentile(values, 99)).toBe(99);
    expect(percentile([7], 99)).toBe(7);
    expect(percentile([], 95)).toBeNull();
    const quietThenBusy = [...Array(20).fill(10), 90];
    expect(percentile(quietThenBusy, 95)).toBe(10);
    expect(percentile(quietThenBusy, 99)).toBe(90);
  });
});

describe('sortRanking', () => {
  const rows = [
    { router_id: 1, name: 'b', cpu_p95: 40, cpu_max: 99, reboots: 0 },
    { router_id: 2, name: 'a', cpu_p95: 85, cpu_max: 90, reboots: 2 },
    { router_id: 3, name: 'c', cpu_p95: null, cpu_max: null, reboots: 0 },
  ];
  it('puts the most affected first and missing values last', () => {
    expect(sortRanking(rows, 'cpu_p95').map((r) => r.router_id)).toEqual([2, 1, 3]);
    expect(sortRanking(rows, 'cpu_max').map((r) => r.router_id)).toEqual([1, 2, 3]);
    expect(sortRanking(rows, 'reboots').map((r) => r.router_id)).toEqual([2, 1, 3]);
  });
  it('sorts names A-Z', () => {
    expect(sortRanking(rows, 'name').map((r) => r.name)).toEqual(['a', 'b', 'c']);
  });
});

describe('loadTone', () => {
  it('bands p95', () => {
    expect([loadTone(null), loadTone(20), loadTone(50), loadTone(80)]).toEqual(['none', 'normal', 'elevated', 'high']);
  });
});
