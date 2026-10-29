import type { AdminPlatformEarnings, PlatformEarningsStreamKey } from '../lib/types';

/**
 * The admin dashboard's money vocabulary, in one place so every card says the
 * same thing (the English text is also the t() key; French is in
 * app/lib/locales/fr.ts).
 *
 * - "Transaction volume": customer payments that flowed through Bitwave for
 *   all resellers. This is the resellers' money, not ours.
 * - "Bitwave earnings": what Bitwave itself received — reseller subscription
 *   payments (hotspot commission, per-user fees, minimum/flat fee) and SMS
 *   credit sales.
 * - "Revenue" is kept only on the reseller's own dashboard, where it means the
 *   reseller's takings.
 */
export const TERMS = {
  volume: 'Transaction volume',
  volumeTooltip: "Total customer payments processed through Bitwave for all resellers — not Bitwave's income",
  earnings: 'Bitwave earnings',
  earningsTooltip:
    'What Bitwave itself received in this period: reseller subscription payments and SMS credit sales. Excludes our own reseller accounts.',
  takeRate: 'Take rate',
  takeRateTooltip: 'Bitwave earnings ÷ transaction volume',
} as const;

/** Display order and labels of the income streams. */
export const STREAM_LABELS: Record<PlatformEarningsStreamKey, string> = {
  subscription_hotspot: 'Hotspot commission',
  subscription_per_user: 'PPPoE / static per-user fees',
  subscription_minimum: 'Minimum / flat subscription fee',
  subscription_unattributed: 'Subscription payments without an invoice',
  sms_credits: 'SMS credit sales',
};

export const STREAM_ORDER = Object.keys(STREAM_LABELS) as PlatformEarningsStreamKey[];

/** One hue per stream; validated for 3:1 contrast on both card surfaces. */
export const STREAM_COLORS: Record<PlatformEarningsStreamKey, string> = {
  subscription_hotspot: '#5850ec',
  subscription_per_user: '#0d9488',
  subscription_minimum: '#d97706',
  subscription_unattributed: '#78716c',
  sms_credits: '#db2777',
};

export interface EarningsRow {
  key: PlatformEarningsStreamKey;
  label: string;
  total: number;
  /** Share of total earnings, 0–100. */
  share: number;
}

/** Breakdown rows in a fixed order, with each stream's share of the total. */
export function earningsRows(data: AdminPlatformEarnings): EarningsRow[] {
  const byKey = new Map(data.earnings.streams.map((s) => [s.key, s]));
  const total = data.earnings.total;
  return STREAM_ORDER.flatMap((key) => {
    const stream = byKey.get(key);
    if (!stream) return [];
    return [{
      key,
      label: STREAM_LABELS[key],
      total: stream.total,
      share: total > 0 ? Math.round((stream.total / total) * 1000) / 10 : 0,
    }];
  });
}

export function formatTakeRate(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return '—';
  return `${pct < 10 ? pct.toFixed(2) : pct.toFixed(1)}%`;
}

export function formatChange(pct: number): string {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

/** Range chips → the calendar-period noun the backend windows use. */
export const PERIOD_NOUN: Record<AdminPlatformEarnings['period'], string> = {
  week: 'this week',
  month: 'this month',
  quarter: 'this quarter',
  year: 'this year',
};
