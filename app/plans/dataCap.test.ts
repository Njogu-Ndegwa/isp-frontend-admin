import { describe, expect, it } from 'vitest';
import { fupPeriodHint, normalizeFupPeriod, withFupPeriod } from './dataCap';

describe('FUP reset period', () => {
  it('treats anything but daily as the original per-period cap', () => {
    expect(normalizeFupPeriod('daily')).toBe('daily');
    expect(normalizeFupPeriod('plan')).toBe('plan');
    expect(normalizeFupPeriod(undefined)).toBe('plan');
    expect(normalizeFupPeriod(null)).toBe('plan');
    expect(normalizeFupPeriod('weekly')).toBe('plan');
  });

  it('labels a daily cap per day and leaves per-period caps alone', () => {
    expect(withFupPeriod('1 GB', 'daily')).toBe('1 GB/day');
    expect(withFupPeriod('1 GB', 'plan')).toBe('1 GB');
    expect(withFupPeriod('500 MB', undefined)).toBe('500 MB');
  });

  it('explains when each option resets', () => {
    expect(fupPeriodHint('daily')).toMatch(/every day at midnight/);
    expect(fupPeriodHint(null)).toMatch(/renews/);
  });
});
