import { CustomerOutageCredit, MpesaTransaction } from '../../lib/types';

export interface PaymentHistorySummary {
  totalPaid: number;
  paidCount: number;
  lastPaidAt: string | null;
}

// Only completed payments that count as revenue add to "total paid" — failed
// or abandoned STK prompts, and comped/free-trial rows, stay in the list but
// never inflate what the customer actually paid. Used only when the server
// summary is unavailable.
export function summarizePayments(rows: MpesaTransaction[]): PaymentHistorySummary {
  let totalPaid = 0;
  let paidCount = 0;
  let lastPaidAt: string | null = null;
  for (const tx of rows) {
    if (tx.status !== 'completed' || tx.counts_as_revenue === false) continue;
    totalPaid += Number(tx.amount) || 0;
    paidCount += 1;
    const at = tx.transaction_date || tx.created_at;
    if (at && (!lastPaidAt || at > lastPaidAt)) lastPaidAt = at;
  }
  return { totalPaid, paidCount, lastPaidAt };
}

const SOURCE_LABELS: Record<string, string> = {
  mpesa_stk: 'M-Pesa',
  c2b_paybill: 'M-Pesa Paybill',
  voucher: 'Voucher',
  free_trial: 'Free trial',
  zenopay: 'ZenoPay',
  mtn_momo: 'MTN MoMo',
  fapshi: 'Fapshi',
};

const METHOD_LABELS: Record<string, string> = {
  mobile_money: 'Mobile money',
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank',
  other: 'Other',
};

export type PaymentTag =
  | { kind: 'status'; status: string }
  | { kind: 'underpaid' }
  | { kind: 'not_charged' }
  | { kind: 'activating' }
  | { kind: 'not_delivered'; error: string | null };

export interface PaymentDescription {
  label: string;
  tags: PaymentTag[];
  counted: boolean;
  canProvision: boolean;
}

export function describePayment(tx: MpesaTransaction): PaymentDescription {
  const label = (tx.source && SOURCE_LABELS[tx.source]) || METHOD_LABELS[tx.payment_method] || tx.payment_method;
  const tags: PaymentTag[] = [];
  const status = String(tx.status);
  const completed = status === 'completed';

  if (tx.source === 'c2b_paybill' && status === 'unmatched') {
    // The paybill handler parks money below the plan price against the
    // customer without applying it (it is not added to the wallet either).
    tags.push({ kind: 'underpaid' });
  } else if (!completed) {
    tags.push({ kind: 'status', status });
  }
  if (completed && tx.counts_as_revenue === false) tags.push({ kind: 'not_charged' });

  const delivery = tx.delivery?.delivery_status;
  if (completed && delivery === 'activating') tags.push({ kind: 'activating' });
  if (completed && delivery === 'needs_attention') {
    tags.push({ kind: 'not_delivered', error: tx.delivery?.last_error ?? null });
  }

  return {
    label,
    tags,
    counted: completed && tx.counts_as_revenue !== false,
    canProvision: tx.manual_provision_supported
      && (status === 'pending' || delivery === 'needs_attention'),
  };
}

export function formatCreditedTime(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const rest = mins % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (!days && rest) parts.push(`${rest}m`);
  return parts.join(' ');
}

export type TimelineEntry =
  | { kind: 'payment'; at: string; tx: MpesaTransaction }
  | { kind: 'credit'; at: string; credit: CustomerOutageCredit };

// Payments and outage compensation, newest first, so an expiry that moved
// without a payment is explained right where it happened.
export function buildTimeline(
  payments: MpesaTransaction[],
  credits: CustomerOutageCredit[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...payments.map((tx) => ({ kind: 'payment' as const, at: tx.transaction_date || tx.created_at || '', tx })),
    ...credits.map((credit) => ({ kind: 'credit' as const, at: credit.credited_at || '', credit })),
  ];
  return entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

// Last 9 digits identify a Kenyan number whatever prefix it was saved with
// (0712…, 254712…, +254712…).
export function phoneKey(phone: string | null | undefined): string | null {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-9) : null;
}
