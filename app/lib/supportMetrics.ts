// Metrics tab of the support desk: snapshot.metrics, built on the laptop by
// work/support_metrics.py. Every field is optional because the builder evolves
// independently of this page; an older snapshot simply has no metrics key.

import type { SupportAutomation, SupportOverview } from './supportOverview';

export type MetricsPeriod = 'today' | 'week' | 'since';

export const METRIC_PERIODS: MetricsPeriod[] = ['today', 'week', 'since'];

export interface ConversationMetrics {
  customers?: number;
  inbound?: number;
  replies?: number;
  replies_agent?: number;
  replies_dennis?: number;
  needed_reply?: number;
  answered?: number;
  answered_agent?: number;
  answered_dennis?: number;
  median_first_response_min?: number | null;
  within_60_min?: number;
}

export interface WorkMetrics {
  bugs_shipped?: number;
  features_shipped?: number;
  tasks_done?: number;
  workers?: number;
  promises_made?: number;
  promises_kept?: number;
  promises_open?: number;
  handovers?: number;
}

export interface QualityMetrics {
  agent_sends?: number;
  long_replies?: number;
  misses?: number;
  misses_open?: number;
  handovers?: number;
}

export interface CurrentMetrics {
  waiting_on_us?: number;
  waiting_on_customer?: number;
  with_dennis?: number;
  handover_chats?: number;
  features_in_progress?: number;
  bugs_in_progress?: number;
  prs_awaiting_dennis?: number;
  promises_open?: number;
  dennis_waiting?: number;
  dennis_oldest_min?: number | null;
  dennis_median_min?: number | null;
}

export interface PrLink {
  label: string;
  url: string;
}

export interface ShippedItem {
  date?: string | null;
  title?: string;
  source?: 'worklog' | 'github' | string;
  prs?: PrLink[];
}

export interface MetricsLists {
  bugs?: ShippedItem[];
  features?: ShippedItem[];
  in_progress?: { date?: string | null; title?: string; kind?: string }[];
  prs_awaiting_dennis?: { title?: string; kind?: string; label?: string; url?: string; age_min?: number }[];
  dennis_waiting?: { title?: string; customer?: string | null; since?: string | null; age_min?: number | null }[];
  promises_open?: { date?: string | null; title?: string; customer?: string | null }[];
  misses?: { customer?: string; at?: string; waited_min?: number; answered?: boolean; by?: string | null }[];
}

export interface TrendDay {
  date: string;
  customers?: number;
  inbound?: number;
  replies_agent?: number;
  replies_dennis?: number;
  misses?: number;
  long_replies?: number;
  shipped?: number;
}

export interface SupportMetrics {
  /** Overview tab (daily charts, corrections, improvement notes); see supportOverview.ts. */
  overview?: SupportOverview;
  /** Automation headline: how much of the work runs without Dennis. */
  automation?: SupportAutomation;
  generated_at?: string;
  today?: string;
  periods?: Partial<Record<MetricsPeriod, { label?: string; start?: string }>>;
  conversations?: Partial<Record<MetricsPeriod, ConversationMetrics>>;
  work?: Partial<Record<MetricsPeriod, WorkMetrics>>;
  quality?: Partial<Record<MetricsPeriod, QualityMetrics>>;
  current?: CurrentMetrics;
  lists?: MetricsLists;
  trend?: TrendDay[];
  reply_limit?: number;
  reply_cap?: { since?: string; sends?: number; long_replies?: number };
  github?: string;
  notes?: string[];
  error?: string;
}

const DEFAULT_PERIOD_LABELS: Record<MetricsPeriod, string> = {
  today: 'Today',
  week: 'Last 7 days',
  since: 'Since intake start',
};

export function periodLabel(metrics: SupportMetrics | undefined, period: MetricsPeriod): string {
  return metrics?.periods?.[period]?.label || DEFAULT_PERIOD_LABELS[period];
}

/** "-" for a missing number; otherwise the number. */
export function num(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '-';
}

/** Minutes as a short duration: "45 s", "12 min", "3 h 20 min", "2 d 4 h". */
export function formatMinutes(minutes: number | null | undefined): string {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) return '-';
  if (minutes < 1) return `${Math.round(minutes * 60)} s`;
  if (minutes < 60) return `${Math.round(minutes * 10) / 10 >= 10 ? Math.round(minutes) : Math.round(minutes * 10) / 10} min`;
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  if (h < 48) return total % 60 ? `${h} h ${total % 60} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d} d ${h % 24} h` : `${d} d`;
}

/** Share as a whole percent, or null when there is nothing to divide by. */
export function percent(part: number | undefined, whole: number | undefined): number | null {
  if (!whole || typeof part !== 'number') return null;
  return Math.round((part / whole) * 100);
}

/** Items dated on or after the period's start (YYYY-MM-DD compare). Undated items only show in the widest view. */
export function inPeriod<T extends { date?: string | null }>(
  items: T[] | undefined,
  metrics: SupportMetrics | undefined,
  period: MetricsPeriod,
): T[] {
  const start = metrics?.periods?.[period]?.start;
  if (!start) return items ?? [];
  return (items ?? []).filter((i) => (i.date ? i.date >= start : period === 'since'));
}

/** Largest daily reply/inbound total, for scaling the trend bars (never 0). */
export function trendScale(days: TrendDay[] | undefined): number {
  return Math.max(1, ...(days ?? []).map((d) => Math.max(d.inbound ?? 0, (d.replies_agent ?? 0) + (d.replies_dennis ?? 0))));
}

/** Bar width in percent of the scale; a non-zero value is always at least visible. */
export function barWidth(value: number | undefined, scale: number): number {
  if (!value || value <= 0) return 0;
  return Math.max(2, Math.min(100, (value / scale) * 100));
}
