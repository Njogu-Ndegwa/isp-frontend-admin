import { describe, expect, it } from 'vitest';
import {
  SupportMetrics,
  barWidth,
  formatMinutes,
  inPeriod,
  num,
  percent,
  periodLabel,
  trendScale,
} from './supportMetrics';

const metrics: SupportMetrics = {
  periods: {
    today: { label: 'Today', start: '2026-10-24' },
    week: { label: 'Last 7 days', start: '2026-10-18' },
    since: { label: 'Since 22 Oct', start: '2026-10-22' },
  },
};

describe('formatMinutes', () => {
  it('formats seconds, minutes, hours and days', () => {
    expect(formatMinutes(0.5)).toBe('30 s');
    expect(formatMinutes(3.3)).toBe('3.3 min');
    expect(formatMinutes(42.4)).toBe('42 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(200)).toBe('3 h 20 min');
    expect(formatMinutes(3472)).toBe('2 d 9 h');
  });

  it('shows a dash for missing values', () => {
    expect(formatMinutes(null)).toBe('-');
    expect(formatMinutes(undefined)).toBe('-');
    expect(formatMinutes(-1)).toBe('-');
  });
});

describe('num and percent', () => {
  it('handles missing numbers', () => {
    expect(num(0)).toBe('0');
    expect(num(undefined)).toBe('-');
    expect(num(null)).toBe('-');
  });

  it('rounds shares and refuses division by zero', () => {
    expect(percent(100, 110)).toBe(91);
    expect(percent(0, 0)).toBeNull();
    expect(percent(undefined, 5)).toBeNull();
  });
});

describe('periodLabel', () => {
  it('uses the snapshot label, falling back to a default', () => {
    expect(periodLabel(metrics, 'since')).toBe('Since 22 Oct');
    expect(periodLabel(undefined, 'week')).toBe('Last 7 days');
  });
});

describe('inPeriod', () => {
  const items = [
    { date: '2026-10-24', title: 'today' },
    { date: '2026-10-22', title: 'intake day' },
    { date: '2026-10-19', title: 'last week' },
    { date: null, title: 'undated' },
  ];

  it('keeps items on or after the period start', () => {
    expect(inPeriod(items, metrics, 'today').map((i) => i.title)).toEqual(['today']);
    expect(inPeriod(items, metrics, 'week').map((i) => i.title)).toEqual(['today', 'intake day', 'last week']);
  });

  it('shows undated items only in the since-intake view', () => {
    expect(inPeriod(items, metrics, 'since').map((i) => i.title)).toEqual(['today', 'intake day', 'undated']);
  });

  it('returns everything when the snapshot has no periods', () => {
    expect(inPeriod(items, {}, 'today')).toHaveLength(4);
    expect(inPeriod(undefined, metrics, 'today')).toEqual([]);
  });
});

describe('trend scaling', () => {
  it('scales to the busiest day and never divides by zero', () => {
    expect(trendScale([{ date: 'a', inbound: 10, replies_agent: 4, replies_dennis: 9 }, { date: 'b', inbound: 3 }])).toBe(13);
    expect(trendScale([])).toBe(1);
    expect(trendScale(undefined)).toBe(1);
  });

  it('keeps small non-zero bars visible and caps at 100', () => {
    expect(barWidth(0, 100)).toBe(0);
    expect(barWidth(1, 1000)).toBe(2);
    expect(barWidth(50, 100)).toBe(50);
    expect(barWidth(200, 100)).toBe(100);
  });
});
