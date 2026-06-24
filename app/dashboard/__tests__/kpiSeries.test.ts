import { describe, it, expect } from 'vitest';
import { revenueSeries, transactionSeries, userSeries } from '../components/kpiSeries';
import type { DailyTrend } from '../../lib/types';

const trend: DailyTrend[] = [
  { date: '2026-06-01', label: 'Jun 1', transactions: 2, revenue: 100, users: 1 },
  { date: '2026-06-02', label: 'Jun 2', transactions: 5, revenue: 250, users: 3 },
];

describe('kpiSeries', () => {
  it('extracts revenue series in order', () => expect(revenueSeries(trend)).toEqual([100, 250]));
  it('extracts transaction series', () => expect(transactionSeries(trend)).toEqual([2, 5]));
  it('extracts user series', () => expect(userSeries(trend)).toEqual([1, 3]));
  it('handles empty', () => expect(revenueSeries([])).toEqual([]));
});
