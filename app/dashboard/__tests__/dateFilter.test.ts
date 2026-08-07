import { describe, it, expect } from 'vitest';
import { USAGE_PERIOD_OPTIONS, toUsageWindowParams, isFilterEqual } from '../dateFilter';

describe('usage period filters', () => {
  it('asks the backend for the local calendar day, not a rolling 24h window', () => {
    const today = USAGE_PERIOD_OPTIONS[0];
    expect(today.label).toBe('Today');
    expect(toUsageWindowParams(today.filter)).toEqual({ preset: 'today' });
    // Regression guard: the old UI sent hours=24, which included last night.
    expect(toUsageWindowParams(today.filter)).not.toHaveProperty('hours');
  });

  it('maps multi-day pills to whole calendar days', () => {
    expect(USAGE_PERIOD_OPTIONS.map((o) => o.label)).toEqual(['Today', '3D', '7D', '30D']);
    expect(toUsageWindowParams({ type: 'days', days: 7 })).toEqual({ days: 7 });
  });

  it('never offers a window wider than snapshot retention', () => {
    for (const option of USAGE_PERIOD_OPTIONS) {
      if (option.filter.type === 'days') expect(option.filter.days).toBeLessThanOrEqual(30);
    }
  });

  it('maps a custom range to inclusive local dates', () => {
    expect(
      toUsageWindowParams({ type: 'custom', startDate: '2026-08-01', endDate: '2026-08-05' })
    ).toEqual({ startDate: '2026-08-01', endDate: '2026-08-05' });
  });

  it('matches the selected pill by value, not identity', () => {
    expect(isFilterEqual({ type: 'preset', preset: 'today' }, USAGE_PERIOD_OPTIONS[0].filter)).toBe(true);
    expect(isFilterEqual({ type: 'days', days: 3 }, USAGE_PERIOD_OPTIONS[0].filter)).toBe(false);
  });
});
