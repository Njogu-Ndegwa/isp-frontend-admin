import { DailyTrend } from '../../lib/types';
export const revenueSeries = (t: DailyTrend[]): number[] => t.map((d) => d.revenue);
export const transactionSeries = (t: DailyTrend[]): number[] => t.map((d) => d.transactions);
export const userSeries = (t: DailyTrend[]): number[] => t.map((d) => d.users);
