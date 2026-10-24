// Overview tab of the support desk: snapshot.metrics.overview, built on the
// laptop by work/support_metrics.py (daily series, week-on-week comparison,
// Dennis corrections and rule-based improvement notes). Every field is optional:
// an older snapshot has no overview and the tab says so.

export interface OverviewDay {
  date: string;
  customers?: number;
  inbound?: number;
  replies_agent?: number;
  replies_dennis?: number;
  needed?: number;
  answered?: number;
  median_first_response_min?: number | null;
  misses?: number;
  // null before the agent started (not tracked), a number from then on.
  long_replies?: number | null;
  step_ins?: number | null;
  handovers?: number | null;
  closed_by_dennis?: number | null;
  voice_rules?: number | null;
  refused?: number | null;
  corrections?: number | null;
  bugs?: number | null;
  features?: number | null;
  tasks?: number | null;
}

export interface WeekStats {
  start?: string;
  end?: string;
  days?: number;
  customers_per_day?: number | null;
  unique_customers?: number;
  inbound?: number;
  replies_agent?: number;
  replies_dennis?: number;
  agent_share?: number | null;
  median_first_response_min?: number | null;
  misses?: number;
  corrections?: number | null;
  step_ins?: number | null;
  shipped?: number | null;
}

export type ObservationKind = 'warn' | 'good' | 'info';

export interface Observation {
  kind?: ObservationKind | string;
  title?: string;
  detail?: string;
  tab?: string | null;
}

export interface SupportOverview {
  agent_start?: string;
  tracked_from?: string;
  refusals_from?: string;
  days?: OverviewDay[];
  weeks?: { current?: WeekStats; previous?: WeekStats; today?: WeekStats };
  step_in_topics?: { topic: string; count: number }[];
  dennis_top_chats?: { name: string; replies: number }[];
  misses_by_hour?: { hour: number; misses: number }[];
  improve?: Observation[];
  definitions?: Partial<Record<'conversations' | 'step_ins' | 'asked' | 'rules' | 'response' | 'work', string>>;
  error?: string;
}

export type OverviewRange = 14 | 30;

export const OVERVIEW_RANGES: OverviewRange[] = [14, 30];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-23" -> "23 Oct". */
export function shortDay(iso?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ''}` : '-';
}

/** The last `range` days of the series (it is already in date order). */
export function lastDays(days: OverviewDay[] | undefined, range: number): OverviewDay[] {
  const all = days ?? [];
  return all.slice(Math.max(0, all.length - range));
}

/** Days from the agent's first day on: the only days with work log and correction counts. */
export function trackedDays(days: OverviewDay[], trackedFrom?: string): OverviewDay[] {
  if (!trackedFrom) return days.filter((d) => d.corrections != null);
  return days.filter((d) => d.date >= trackedFrom);
}

/** YYYY-MM-DD of the agent start, if it falls inside the shown days (for the marker line). */
export function agentStartDay(overview: SupportOverview | undefined, days: OverviewDay[]): string | null {
  const day = overview?.agent_start?.slice(0, 10) || overview?.tracked_from;
  if (!day || days.length === 0) return null;
  return day >= days[0].date && day <= days[days.length - 1].date ? day : null;
}

/** "22 Oct 13:12" from the agent start ISO time (already in EAT). */
export function agentStartLabel(iso?: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso || '');
  return m ? `${shortDay(m[1])} ${m[2]}` : '';
}

export interface Trend {
  direction: 'up' | 'down' | 'flat';
  /** Rounded percent change, or null when there is nothing to compare with. */
  pct: number | null;
  /** True when this change is good news, false when bad, null when neutral or unknown. */
  good: boolean | null;
  label: string;
}

/**
 * Change from `prev` to `cur`. `upIsGood` decides the colour of the news
 * (more customers is good, a slower response is not); changes under 5% are flat.
 */
export function trend(cur: number | null | undefined, prev: number | null | undefined, upIsGood: boolean | null): Trend {
  if (typeof cur !== 'number' || typeof prev !== 'number' || !Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) {
    return { direction: 'flat', pct: null, good: null, label: 'no earlier week yet' };
  }
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (Math.abs(pct) < 5) return { direction: 'flat', pct, good: null, label: 'same as last week' };
  const direction = pct > 0 ? 'up' : 'down';
  const good = upIsGood == null ? null : (pct > 0) === upIsGood;
  return { direction, pct, good, label: `${direction} ${Math.abs(pct)}% vs last week` };
}

/** Change in percentage points (for shares such as the agent's share of replies). */
export function pointsChange(cur: number | null | undefined, prev: number | null | undefined): number | null {
  if (typeof cur !== 'number' || typeof prev !== 'number') return null;
  return Math.round(cur - prev);
}

export interface CorrectionGroups {
  stepped: number;
  asked: number;
  rules: number;
  total: number;
}

/**
 * The three groups the corrections chart stacks: Dennis stepped in after an
 * agent reply; the agent asked Dennis (needs-Dennis items) or he closed one;
 * voice rules he taught plus replies the checks refused.
 */
export function correctionGroups(d: OverviewDay): CorrectionGroups {
  const stepped = d.step_ins ?? 0;
  const asked = (d.handovers ?? 0) + (d.closed_by_dennis ?? 0);
  const rules = (d.voice_rules ?? 0) + (d.refused ?? 0);
  return { stepped, asked, rules, total: stepped + asked + rules };
}

export function sumBy(days: OverviewDay[], pick: (d: OverviewDay) => number | null | undefined): number {
  return days.reduce((n, d) => n + (pick(d) ?? 0), 0);
}

/** Corrections per 10 agent replies, one decimal; null without agent replies. */
export function perTenReplies(corrections: number, agentReplies: number): number | null {
  if (!agentReplies) return null;
  return Math.round((corrections / agentReplies) * 100) / 10;
}

/** Agent share of replies in percent over the given days; null without replies. */
export function agentShare(days: OverviewDay[]): number | null {
  const agent = sumBy(days, (d) => d.replies_agent);
  const total = agent + sumBy(days, (d) => d.replies_dennis);
  return total ? Math.round((agent / total) * 100) : null;
}

/**
 * Median first response values clipped to `cap` minutes so one slow day does
 * not flatten the chart; `over` marks the clipped days and `value` keeps the
 * real figure for the tooltip and table.
 */
export function cappedResponse(days: OverviewDay[], cap: number): { date: string; plot: number | null; value: number | null; over: boolean }[] {
  return days.map((d) => {
    const v = typeof d.median_first_response_min === 'number' ? d.median_first_response_min : null;
    return { date: d.date, value: v, plot: v == null ? null : Math.min(v, cap), over: v != null && v > cap };
  });
}

/** Hour bucket label: 18 -> "18:00". */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/** Observation kind -> label shown next to the icon (never colour alone). */
export function observationLabel(kind?: string): string {
  if (kind === 'warn') return 'Fix';
  if (kind === 'good') return 'Going well';
  return 'Note';
}

// ---------------------------------------------------------------- automation

/** One period or day of snapshot.metrics.automation (support_metrics.py automation_window). */
export interface AutomationWindow {
  date?: string;
  label?: string;
  score?: number | null;
  replies_pct?: number | null;
  replies_agent?: number;
  replies_total?: number;
  conversations_pct?: number | null;
  conversations_e2e?: number;
  conversations_total?: number;
  work_pct?: number | null;
  work_agent?: number;
  work_total?: number;
  prs_agent?: number;
  prs_total?: number;
}

export type AutomationPeriod = 'today' | 'week' | 'since';

export interface SupportAutomation {
  periods?: Partial<Record<AutomationPeriod, AutomationWindow>>;
  days?: AutomationWindow[];
  definition?: string;
  prs_note?: string;
  error?: string;
}

export const AUTOMATION_PERIODS: AutomationPeriod[] = ['today', 'week', 'since'];

export interface AutomationRow {
  key: 'replies' | 'conversations' | 'work';
  label: string;
  unit: string;
  pct: number | null;
  part: number;
  whole: number;
}

/** The three shares behind the score, each with its numerator and denominator. */
export function automationRows(w: AutomationWindow | undefined): AutomationRow[] {
  const v = w ?? {};
  const pct = (x: number | null | undefined) => (typeof x === 'number' ? x : null);
  return [
    { key: 'replies', label: 'Replies sent by the agent', unit: 'replies', pct: pct(v.replies_pct), part: v.replies_agent ?? 0, whole: v.replies_total ?? 0 },
    { key: 'conversations', label: 'Chats handled end to end', unit: 'chats', pct: pct(v.conversations_pct), part: v.conversations_e2e ?? 0, whole: v.conversations_total ?? 0 },
    { key: 'work', label: 'Work done without Dennis', unit: 'items', pct: pct(v.work_pct), part: v.work_agent ?? 0, whole: v.work_total ?? 0 },
  ];
}

/** "73%" or "-" when there was nothing to divide by. */
export function pctText(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}%` : '-';
}

/** Score change from the previous day of the daily line (points), or null. */
export function scoreChange(days: AutomationWindow[] | undefined): number | null {
  const scored = (days ?? []).filter((d) => typeof d.score === 'number');
  if (scored.length < 2) return null;
  return (scored[scored.length - 1].score as number) - (scored[scored.length - 2].score as number);
}
