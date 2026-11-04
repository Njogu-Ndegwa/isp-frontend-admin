/**
 * Pure helpers for selling an ad through Bitwave: the money split, the terms
 * check, and the words for the payment prompt's status. Contract: isp-billing
 * ADS_API.md, "Selling ads through Bitwave".
 *
 * The split must match the backend (app/services/ad_sales.py split_amount):
 * Bitwave's 20% is rounded DOWN to a whole shilling and the reseller gets the
 * rest, so the two always add up to what the shop paid.
 */
import type { AdPromptStatus, AdSaleState, AdSaleSummary } from '../lib/types';

export const FEE_PERCENT = 20;
export const MIN_PRICE_PER_WEEK = 200;
export const MAX_PRICE_PER_WEEK = 12_500;
export const MIN_WEEKS = 1;
export const MAX_WEEKS = 12;

export interface SaleSplit {
  amount: number;
  fee: number;
  share: number;
}

export function splitAmount(amount: number): SaleSplit {
  const whole = Math.max(0, Math.floor(amount));
  const fee = Math.floor((whole * FEE_PERCENT) / 100);
  return { amount: whole, fee, share: whole - fee };
}

export function saleSplit(weeks: number, pricePerWeek: number): SaleSplit {
  return splitAmount((Number(weeks) || 0) * (Number(pricePerWeek) || 0));
}

/** Kenyan mobile number (07.., 01.., 7.., +254.., 254..), as M-Pesa needs it. */
export function normalizeKenyanMobile(raw: string): string | null {
  let d = (raw || '').replace(/[\s\-()]/g, '').replace(/^\+/, '');
  if (!/^\d+$/.test(d)) return null;
  if (d.startsWith('2540')) d = `254${d.slice(4)}`;
  else if (d.startsWith('0')) d = `254${d.slice(1)}`;
  else if (d.length === 9) d = `254${d}`;
  return /^254[17]\d{8}$/.test(d) ? d : null;
}

/** "254722111222" -> "0722 111 222". */
export function displayPhone(msisdn: string | null | undefined): string {
  if (!msisdn) return '';
  const m = /^254(\d{3})(\d{3})(\d{3})$/.exec(msisdn);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : msisdn;
}

export interface SaleTermsForm {
  business_name: string;
  business_phone: string;
  weeks: string;
  price_per_week: string;
}

export type SaleTermsErrors = Partial<Record<keyof SaleTermsForm, string>>;

export function emptySaleTerms(): SaleTermsForm {
  return { business_name: '', business_phone: '', weeks: '2', price_per_week: String(MIN_PRICE_PER_WEEK) };
}

/** Same rules as the backend's validate_terms, as messages for the form. */
export function validateSaleTerms(form: SaleTermsForm, needName = true): SaleTermsErrors {
  const e: SaleTermsErrors = {};
  if (needName && !form.business_name.trim()) e.business_name = 'Add the business’s name.';
  if (!normalizeKenyanMobile(form.business_phone)) e.business_phone = 'Enter the business’s M-Pesa number, e.g. 0712 345 678.';
  const weeks = Number(form.weeks);
  if (!Number.isInteger(weeks) || weeks < MIN_WEEKS || weeks > MAX_WEEKS) {
    e.weeks = `Choose ${MIN_WEEKS} to ${MAX_WEEKS} weeks.`;
  }
  const price = Number(form.price_per_week);
  if (!Number.isInteger(price) || price < MIN_PRICE_PER_WEEK) {
    e.price_per_week = `At least KES ${MIN_PRICE_PER_WEEK} a week, in whole shillings.`;
  } else if (price > MAX_PRICE_PER_WEEK) {
    e.price_per_week = `At most KES ${MAX_PRICE_PER_WEEK.toLocaleString('en-US')} a week.`;
  }
  return e;
}

export function kes(n: number | null | undefined): string {
  return `KES ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
}

// ─── Prompt status ───────────────────────────────────────────────────

export const PROMPT_META: Record<AdPromptStatus, { label: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral'; busy: boolean }> = {
  sending: { label: 'Prompt sent', tone: 'info', busy: true },
  waiting_for_pin: { label: 'Waiting for PIN', tone: 'info', busy: true },
  paid: { label: 'Paid', tone: 'success', busy: false },
  cancelled: { label: 'Cancelled', tone: 'warning', busy: false },
  failed: { label: 'Failed', tone: 'danger', busy: false },
  timed_out: { label: 'Timed out', tone: 'warning', busy: false },
};

/** Keep polling while the newest prompt is still on the shop's phone. */
export function promptInFlight(sale: Pick<AdSaleSummary, 'prompt'> | null | undefined): boolean {
  const s = sale?.prompt?.status;
  return s === 'sending' || s === 'waiting_for_pin';
}

// ─── Sale state ──────────────────────────────────────────────────────

export const SALE_STATE_META: Record<AdSaleState, { label: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  awaiting_payment: { label: 'Waiting for payment', tone: 'warning' },
  payment_failed: { label: 'Payment not received', tone: 'danger' },
  in_review: { label: 'Paid, in review', tone: 'info' },
  live: { label: 'Live', tone: 'success' },
  paused: { label: 'Paused', tone: 'neutral' },
  ended: { label: 'Ended', tone: 'neutral' },
  rejected: { label: 'Rejected', tone: 'danger' },
  taken_down: { label: 'Taken down', tone: 'danger' },
  deleted: { label: 'Deleted', tone: 'neutral' },
};

export const PAYOUT_META: Record<AdSaleSummary['payout_status'], string> = {
  none: 'Not paid yet',
  waiting_to_run: 'Paid, credited when it goes live',
  credited: 'Credited to payout',
  refund_due: 'Refund due',
  refunded: 'Refunded',
};

/** Whole days left in the paid period, or null. */
export function daysLeft(liveUntil: string | null | undefined, now = Date.now()): number | null {
  if (!liveUntil) return null;
  const hasZone = /[zZ]$|[+-]\d\d:?\d\d$/.test(liveUntil);
  const end = Date.parse(hasZone ? liveUntil : `${liveUntil}Z`);
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - now) / 86_400_000));
}
