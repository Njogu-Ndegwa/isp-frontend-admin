import { UsageTimelineGranularity } from '../../lib/types';
import { parseUTCToGMT3, formatGMT3Date } from '../../lib/dateUtils';

export function formatUsageMb(mb: number): string {
  if (!Number.isFinite(mb) || mb <= 0) return '0 MB';
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

/** "Oct 6" (EAT) for a UTC timestamp. */
export function shortDate(utc: string): string {
  return formatGMT3Date(parseUTCToGMT3(utc), { month: 'short', day: 'numeric' });
}

/** "Mon, Oct 6" for a day slot; "Oct 6, 14:00–15:00" for an hour slot (EAT). */
export function slotLabel(startUtc: string, granularity: UsageTimelineGranularity): string {
  const local = parseUTCToGMT3(startUtc);
  if (granularity === 'day') {
    return formatGMT3Date(local, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  const end = new Date(local.getTime() + 3_600_000);
  const day = formatGMT3Date(local, { month: 'short', day: 'numeric' });
  const from = formatGMT3Date(local, { hour: '2-digit', minute: '2-digit', hour12: false });
  const to = formatGMT3Date(end, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day}, ${from}–${to}`;
}
