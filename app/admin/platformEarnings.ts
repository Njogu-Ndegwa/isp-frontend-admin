import type {
  AdminPlatformEarnings,
  PlatformEarningsStreamKey,
  PlatformWithdrawalLedger,
  WithdrawalBucket,
  WithdrawalMethod,
} from '../lib/types';

/**
 * The admin dashboard's money vocabulary, in one place so every card says the
 * same thing (the English text is also the t() key; French is in
 * app/lib/locales/fr.ts).
 *
 * - "Transaction volume": customer payments that flowed through Bitwave for
 *   all resellers. This is the resellers' money, not ours.
 * - "Platform earnings" (the "Bitwave earnings" figure): what Bitwave itself
 *   received, in three groups: Hotspot, PPPoE / Static and SMS.
 * - "My reseller business": what the admin's own reseller accounts took from
 *   their customers. Own business income, shown apart from platform earnings.
 * - "Total income": platform earnings + my reseller business.
 * - "Revenue" is kept only on the reseller's own dashboard, where it means the
 *   reseller's takings.
 */
export const TERMS = {
  volume: 'Transaction volume',
  volumeTooltip: "Total customer payments processed through Bitwave for all resellers — not Bitwave's income",
  earnings: 'Bitwave earnings',
  earningsTooltip:
    'What Bitwave itself received in this period: reseller subscription payments and SMS credit sales. Excludes our own reseller accounts.',
  platformEarnings: 'Platform earnings',
  resellerBusiness: 'My reseller business',
  resellerBusinessTooltip:
    'Customer payments taken by your own reseller accounts ({accounts}). This is your own business income, not a platform fee, so it is kept apart from platform earnings.',
  resellerBusinessNone: 'No reseller accounts are marked as yours. Choose them on the Earnings page.',
  totalIncome: 'Total income',
  totalIncomeTooltip: 'Platform earnings + my reseller business',
  takeRate: 'Take rate',
  takeRateTooltip: 'Bitwave earnings ÷ transaction volume',
} as const;

/** Display order and labels of the platform earnings groups. */
export const STREAM_LABELS: Record<PlatformEarningsStreamKey, string> = {
  subscription_hotspot: 'Hotspot',
  subscription_per_user: 'PPPoE / Static',
  sms_credits: 'SMS',
};

/** Plain-words explanation behind each group's (i). */
export const STREAM_TOOLTIPS: Record<PlatformEarningsStreamKey, string> = {
  subscription_hotspot:
    "The hotspot % charge on resellers' hotspot sales, plus the minimum or flat monthly fee of resellers who sell hotspot.",
  subscription_per_user:
    'The monthly fee for each active PPPoE or static-IP customer, plus the minimum monthly fee of resellers who only sell PPPoE or static.',
  sms_credits: 'SMS credits resellers bought.',
};

export const STREAM_ORDER = Object.keys(STREAM_LABELS) as PlatformEarningsStreamKey[];

/** One hue per group; validated for 3:1 contrast on both card surfaces. */
export const STREAM_COLORS: Record<PlatformEarningsStreamKey, string> = {
  subscription_hotspot: '#5850ec',
  subscription_per_user: '#0d9488',
  sms_credits: '#db2777',
};

export interface EarningsRow {
  key: PlatformEarningsStreamKey;
  label: string;
  tooltip: string;
  total: number;
  /** Share of platform earnings, 0–100. */
  share: number;
}

/** Group rows in a fixed order, with each group's share of platform earnings. */
export function earningsRows(data: AdminPlatformEarnings): EarningsRow[] {
  const byKey = new Map(data.earnings.streams.map((s) => [s.key, s]));
  const total = data.earnings.total;
  return STREAM_ORDER.map((key) => {
    const value = byKey.get(key)?.total ?? 0;
    return {
      key,
      label: STREAM_LABELS[key],
      tooltip: STREAM_TOOLTIPS[key],
      total: value,
      share: total > 0 ? Math.round((value / total) * 1000) / 10 : 0,
    };
  });
}

/** Platform earnings subtotal, my reseller business, and their sum. */
export function incomeSummary(data: AdminPlatformEarnings) {
  const platform = data.earnings.total;
  const business = data.reseller_business?.total ?? 0;
  return {
    platform,
    business,
    total: data.total_income?.total ?? Math.round((platform + business) * 100) / 100,
    accounts: data.reseller_business?.accounts ?? data.excluded_own_accounts ?? [],
  };
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

// ---------------------------------------------------------------------------
// Withdrawals ledger (records only — nothing here moves money)
// ---------------------------------------------------------------------------

export const LEDGER = {
  title: 'Withdrawals',
  since: 'Since {date}',
  recordsOnly:
    'This only records money you have already taken out. It does not send money or call M-Pesa.',
  earned: 'Earned',
  earnedTooltip: 'Money collected since {date}',
  withdrawn: 'Withdrawn',
  available: 'Available to withdraw',
  record: 'Record withdrawal',
  fromAll: 'Withdrawn from all: {amount}',
  past: 'Past withdrawals',
  none: 'No withdrawals recorded yet',
  unavailable: 'Withdrawals unavailable',
} as const;

export const BUCKET_LABELS: Record<WithdrawalBucket, string> = {
  platform: 'Platform earnings',
  reseller_business: 'My reseller business',
  all: 'All income',
};

export const BUCKET_ORDER: WithdrawalBucket[] = ['platform', 'reseller_business', 'all'];

export const METHOD_LABELS: Record<WithdrawalMethod, string> = {
  mpesa: 'M-Pesa',
  bank: 'Bank',
  cash: 'Cash',
};

export const METHOD_ORDER = Object.keys(METHOD_LABELS) as WithdrawalMethod[];

/** What can still be withdrawn from a bucket ("all" = the total). */
export function availableFor(ledger: PlatformWithdrawalLedger, bucket: WithdrawalBucket): number {
  return bucket === 'all' ? ledger.total.available : ledger.buckets[bucket].available;
}

export interface WithdrawalForm {
  amount: string;
  date: string;
  method: WithdrawalMethod;
  bucket: WithdrawalBucket;
  reference: string;
  note: string;
}

/** Today's date in Kenya (EAT, UTC+3) as YYYY-MM-DD. */
export function todayEat(now: Date = new Date()): string {
  return new Date(now.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}

/**
 * The form's error as an English t() key (with vars), or null when it can be
 * sent. Mirrors the backend rules so most mistakes never leave the phone.
 */
export function validateWithdrawal(
  form: WithdrawalForm,
  ledger: PlatformWithdrawalLedger,
  {
    today = todayEat(),
    money = (kes: number) => `KES ${kes.toFixed(2)}`,
  }: { today?: string; money?: (kes: number) => string } = {},
): { message: string; vars?: Record<string, string | number> } | null {
  const amount = Number(form.amount.trim().replace(/,/g, ''));
  if (!form.amount.trim() || !Number.isFinite(amount) || amount <= 0) {
    return { message: 'Enter an amount more than zero' };
  }
  const available = availableFor(ledger, form.bucket);
  if (Math.round(amount * 100) > Math.round(available * 100)) {
    return { message: 'That is more than the {amount} available to withdraw', vars: { amount: money(available) } };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return { message: 'Choose the date' };
  if (form.date < ledger.start_date) {
    return { message: 'Tracking starts on {date}; pick a later date', vars: { date: ledger.start_date } };
  }
  if (form.date > today) return { message: 'The date cannot be in the future' };
  if (form.reference.length > 100) return { message: 'Reference is too long (100 characters max)' };
  if (form.note.length > 500) return { message: 'Note is too long (500 characters max)' };
  return null;
}

/** "1,234.5" / "1234.50" → 1234.5 */
export function parseAmount(raw: string): number {
  return Math.round(Number(raw.trim().replace(/,/g, '')) * 100) / 100;
}

/**
 * Ledger amounts are always KES (withdrawals are recorded in shillings) and
 * keep cents when there are any, so the "available" shown is exactly the
 * most the form accepts.
 */
export function formatLedgerKES(kes: number): string {
  const value = Number.isFinite(kes) ? Math.round(kes * 100) / 100 : 0;
  const cents = Math.round(value * 100) % 100 !== 0;
  return `KES ${value.toLocaleString('en-KE', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}
