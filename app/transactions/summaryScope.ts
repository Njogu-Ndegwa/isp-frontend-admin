/**
 * Pure helpers for the Transactions summary cards: month-range computation
 * and scope/label strings. Kept free of React/DOM so they are unit-testable.
 * `nowGmt3` is the value returned by getCurrentTimeGMT3() — a Date whose UTC
 * fields hold the GMT+3 wall-clock time.
 */

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad2 = (n: number) => String(n).padStart(2, '0');

export function currentMonthRangeGMT3(nowGmt3: Date): { start: string; end: string } {
  const y = nowGmt3.getUTCFullYear();
  const m = nowGmt3.getUTCMonth(); // 0-11
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return { start: `${y}-${pad2(m + 1)}-01`, end: `${y}-${pad2(m + 1)}-${pad2(lastDay)}` };
}

export function scopedSummaryDates(
  dateFilter: string,
  nowGmt3: Date,
): { startDate?: string; endDate?: string; date?: string } {
  if (dateFilter) return { startDate: undefined, endDate: undefined, date: dateFilter };
  const { start, end } = currentMonthRangeGMT3(nowGmt3);
  return { startDate: start, endDate: end, date: undefined };
}

export function formatDateLabel(dateFilter: string): string {
  const [y, m, d] = dateFilter.split('-').map(Number);
  return y && m && d ? `${d} ${SHORT_MONTHS[m - 1]} ${y}` : dateFilter;
}

export function thisMonthCardTitle(dateFilter: string): string {
  return dateFilter ? formatDateLabel(dateFilter) : 'This Month';
}

export function scopeCaption(dateFilter: string, nowGmt3: Date): string {
  if (dateFilter) return formatDateLabel(dateFilter);
  return `${FULL_MONTHS[nowGmt3.getUTCMonth()]} ${nowGmt3.getUTCFullYear()}`;
}
