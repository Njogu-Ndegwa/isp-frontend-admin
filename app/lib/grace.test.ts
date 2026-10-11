import { describe, expect, it } from 'vitest';
import { MAX_GRACE_MINUTES, formatGrace, graceToMinutes, splitGraceMinutes } from './grace';

describe('splitGraceMinutes', () => {
  it('shows whole days in days', () => {
    expect(splitGraceMinutes(3 * 24 * 60)).toEqual({ value: 3, unit: 'days' });
  });
  it('falls back to hours', () => {
    expect(splitGraceMinutes(36 * 60)).toEqual({ value: 36, unit: 'hours' });
    expect(splitGraceMinutes(90)).toEqual({ value: 1.5, unit: 'hours' });
  });
  it('treats missing as zero hours', () => {
    expect(splitGraceMinutes(undefined)).toEqual({ value: 0, unit: 'hours' });
  });
});

describe('graceToMinutes', () => {
  it('converts days and hours', () => {
    expect(graceToMinutes(2, 'days')).toBe(2880);
    expect(graceToMinutes(12, 'hours')).toBe(720);
    expect(graceToMinutes(0, 'days')).toBe(0);
  });
  it('rejects negative, non-numeric and over-cap values', () => {
    expect(graceToMinutes(-1, 'hours')).toBeNull();
    expect(graceToMinutes(Number.NaN, 'hours')).toBeNull();
    expect(graceToMinutes(31, 'days')).toBeNull();
    expect(graceToMinutes(30, 'days')).toBe(MAX_GRACE_MINUTES);
  });
});

describe('formatGrace', () => {
  it('formats readable lengths', () => {
    expect(formatGrace(0)).toBe('None');
    expect(formatGrace(24 * 60)).toBe('1 day');
    expect(formatGrace(30 * 60)).toBe('1 day 6 hours');
    expect(formatGrace(5 * 60)).toBe('5 hours');
  });
});
