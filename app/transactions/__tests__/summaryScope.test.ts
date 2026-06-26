import { describe, it, expect } from 'vitest';
import {
  currentMonthRangeGMT3,
  scopedSummaryDates,
  formatDateLabel,
  thisMonthCardTitle,
  scopeCaption,
} from '../summaryScope';

// Dates built with Date.UTC so getUTC* fields read back the GMT+3 wall clock,
// matching how getCurrentTimeGMT3() encodes time.
const JUNE = new Date(Date.UTC(2026, 5, 15)); // 15 June 2026
const FEB_LEAP = new Date(Date.UTC(2024, 1, 10)); // Feb 2024 (leap year)

describe('currentMonthRangeGMT3', () => {
  it('returns first and last day of the month', () => {
    expect(currentMonthRangeGMT3(JUNE)).toEqual({ start: '2026-06-01', end: '2026-06-30' });
  });
  it('handles February in a leap year', () => {
    expect(currentMonthRangeGMT3(FEB_LEAP)).toEqual({ start: '2024-02-01', end: '2024-02-29' });
  });
});

describe('scopedSummaryDates', () => {
  it('uses the month range when no date filter is set', () => {
    expect(scopedSummaryDates('', JUNE)).toEqual({
      startDate: '2026-06-01', endDate: '2026-06-30', date: undefined,
    });
  });
  it('uses the exact date when a date filter is set', () => {
    expect(scopedSummaryDates('2026-06-26', JUNE)).toEqual({
      startDate: undefined, endDate: undefined, date: '2026-06-26',
    });
  });
});

describe('labels', () => {
  it('formats a YYYY-MM-DD filter as a readable date', () => {
    expect(formatDateLabel('2026-06-26')).toBe('26 Jun 2026');
  });
  it('this-month card title defaults, follows the date filter', () => {
    expect(thisMonthCardTitle('')).toBe('This Month');
    expect(thisMonthCardTitle('2026-06-26')).toBe('26 Jun 2026');
  });
  it('scope caption shows month name or the selected date', () => {
    expect(scopeCaption('', JUNE)).toBe('June 2026');
    expect(scopeCaption('2026-06-26', JUNE)).toBe('26 Jun 2026');
  });
});
