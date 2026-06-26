import { describe, it, expect } from 'vitest';
import { normalizeDuration, describeDuration } from './duration';

describe('normalizeDuration', () => {
  it('passes integer values through unchanged in their unit', () => {
    expect(normalizeDuration(3, 'DAYS')).toEqual({ value: 3, unit: 'DAYS' });
    expect(normalizeDuration(2, 'HOURS')).toEqual({ value: 2, unit: 'HOURS' });
    expect(normalizeDuration(60, 'MINUTES')).toEqual({ value: 60, unit: 'MINUTES' });
    expect(normalizeDuration(1, 'HOURS')).toEqual({ value: 1, unit: 'HOURS' });
  });

  it('converts fractional hours to the coarsest whole unit', () => {
    expect(normalizeDuration(1.5, 'HOURS')).toEqual({ value: 90, unit: 'MINUTES' });
    expect(normalizeDuration(0.5, 'HOURS')).toEqual({ value: 30, unit: 'MINUTES' });
    expect(normalizeDuration(1.25, 'HOURS')).toEqual({ value: 75, unit: 'MINUTES' });
  });

  it('converts fractional days, preferring hours when whole', () => {
    expect(normalizeDuration(1.5, 'DAYS')).toEqual({ value: 36, unit: 'HOURS' });
    expect(normalizeDuration(2.5, 'DAYS')).toEqual({ value: 60, unit: 'HOURS' });
  });

  it('falls back to minutes for days that are not whole hours', () => {
    expect(normalizeDuration(1.1, 'DAYS')).toEqual({ value: 1584, unit: 'MINUTES' });
  });

  it('rounds fractional minutes to the nearest whole minute', () => {
    // No sub-minute unit exists on the backend.
    expect(normalizeDuration(1.5, 'MINUTES')).toEqual({ value: 2, unit: 'MINUTES' });
    expect(normalizeDuration(2.4, 'MINUTES')).toEqual({ value: 2, unit: 'MINUTES' });
  });

  it('returns null for values that do not resolve to at least one whole minute', () => {
    expect(normalizeDuration(0, 'HOURS')).toBeNull();
    expect(normalizeDuration(-1, 'HOURS')).toBeNull();
    expect(normalizeDuration(NaN, 'HOURS')).toBeNull();
    // 0.4 minutes rounds to 0 minutes -> invalid.
    expect(normalizeDuration(0.4, 'MINUTES')).toBeNull();
  });
});

describe('describeDuration', () => {
  it('renders plural units', () => {
    expect(describeDuration(90, 'MINUTES')).toBe('90 minutes');
    expect(describeDuration(36, 'HOURS')).toBe('36 hours');
    expect(describeDuration(3, 'DAYS')).toBe('3 days');
  });

  it('renders singular units for a value of 1', () => {
    expect(describeDuration(1, 'MINUTES')).toBe('1 minute');
    expect(describeDuration(1, 'HOURS')).toBe('1 hour');
    expect(describeDuration(1, 'DAYS')).toBe('1 day');
  });
});
