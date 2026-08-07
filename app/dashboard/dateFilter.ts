// Shared date filter types and helpers — consumed by DashboardToolbar, DashboardClient, and section components.

export type DateFilter =
  | { type: 'preset'; preset: 'today' | 'this_month' }
  | { type: 'days'; days: number }
  | { type: 'custom'; startDate: string; endDate: string };

export const DATE_FILTER_OPTIONS: { filter: DateFilter; label: string }[] = [
  { filter: { type: 'preset', preset: 'today' }, label: 'Today' },
  { filter: { type: 'days', days: 3 }, label: '3D' },
  { filter: { type: 'days', days: 7 }, label: '7D' },
  { filter: { type: 'days', days: 14 }, label: '14D' },
  { filter: { type: 'days', days: 30 }, label: '30D' },
  { filter: { type: 'preset', preset: 'this_month' }, label: 'This Month' },
];

export function isFilterEqual(a: DateFilter, b: DateFilter): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'preset' && b.type === 'preset') return a.preset === b.preset;
  if (a.type === 'days' && b.type === 'days') return a.days === b.days;
  if (a.type === 'custom' && b.type === 'custom') {
    return a.startDate === b.startDate && a.endDate === b.endDate;
  }
  return false;
}

// Usage/bandwidth history is only kept for 30 days (backend prunes snapshots),
// so the usage chart offers a narrower set than the dashboard-wide toolbar.
// Every option is a whole local calendar day — "Today" is 00:00 EAT until now,
// never a rolling 24h window that also shows part of yesterday evening.
export const USAGE_PERIOD_OPTIONS: { filter: DateFilter; label: string }[] = [
  { filter: { type: 'preset', preset: 'today' }, label: 'Today' },
  { filter: { type: 'days', days: 3 }, label: '3D' },
  { filter: { type: 'days', days: 7 }, label: '7D' },
  { filter: { type: 'days', days: 30 }, label: '30D' },
];

export type UsageWindowParams = {
  preset?: 'today' | 'this_month';
  days?: number;
  startDate?: string;
  endDate?: string;
};

// Translate a dashboard date filter into bandwidth-history query params.
export function toUsageWindowParams(filter: DateFilter): UsageWindowParams {
  if (filter.type === 'preset') return { preset: filter.preset };
  if (filter.type === 'days') return { days: filter.days };
  return { startDate: filter.startDate, endDate: filter.endDate };
}

export function getPeriodLabel(filter: DateFilter): string {
  if (filter.type === 'preset') {
    if (filter.preset === 'today') return 'today';
    if (filter.preset === 'this_month') return 'this month';
  }
  if (filter.type === 'days') {
    return `the last ${filter.days} days`;
  }
  if (filter.type === 'custom') {
    return `${filter.startDate} to ${filter.endDate}`;
  }
  return 'selected period';
}
