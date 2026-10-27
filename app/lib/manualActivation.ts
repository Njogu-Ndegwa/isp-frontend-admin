import { formatDateGMT3 } from './dateUtils';
import type { ManualPaymentMethod } from './types';

/**
 * Payment methods for a manual activation (Activate PPPoE / static IP, and
 * Record payment). A manual activation records money taken outside the
 * system, so the options say exactly that. M-Pesa paid to the reseller's
 * paybill activates the customer by itself, and the backend refuses
 * "mpesa"/"voucher" here instead of quietly saving them as cash.
 */
export const MANUAL_PAYMENT_OPTIONS: { value: ManualPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash received' },
  { value: 'other', label: 'Paid outside the system' },
];

/** The 409 the backend returns when an activation would double-renew. */
export interface ActivationConflict {
  code: 'customer_already_paid' | 'customer_already_active';
  message: string;
  expiry: string | null;
  last_payment_at: string | null;
  last_payment_amount: number | null;
  last_payment_method: string | null;
}

const CONFLICT_CODES = new Set(['customer_already_paid', 'customer_already_active']);

/** Reads an ApiError (status + structured detail) without importing the API client. */
export function activationConflict(err: unknown): ActivationConflict | null {
  const e = err as { status?: unknown; detail?: Record<string, unknown> } | null;
  if (!e || typeof e !== 'object' || e.status !== 409 || !e.detail || typeof e.detail !== 'object') return null;
  const code = e.detail.code;
  if (typeof code !== 'string' || !CONFLICT_CODES.has(code)) return null;
  return e.detail as unknown as ActivationConflict;
}

/** Backend datetimes are naive UTC; shown in GMT+3 like the rest of the app. */
function formatUtc(value: string | null): string | null {
  if (!value) return null;
  try {
    return formatDateGMT3(value, {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return null;
  }
}

const METHOD_LABEL: Record<string, string> = {
  mobile_money: 'M-Pesa',
  cash: 'cash',
  other: 'outside the system',
  bank_transfer: 'bank transfer',
  card: 'card',
};

/** "This customer already paid (M-Pesa) at 27 Oct 2026, 15:49 and is active until 26 Nov 2026, 15:49." */
export function activationConflictMessage(conflict: ActivationConflict): string {
  const until = formatUtc(conflict.expiry);
  if (conflict.code === 'customer_already_paid') {
    const at = formatUtc(conflict.last_payment_at);
    const method = conflict.last_payment_method ? METHOD_LABEL[conflict.last_payment_method] : undefined;
    let text = 'This customer already paid';
    if (method) text += ` (${method})`;
    if (at) text += ` at ${at}`;
    if (until) text += ` and is active until ${until}`;
    return `${text}.`;
  }
  return until ? `This customer is already active until ${until}.` : conflict.message;
}

export const ACTIVATION_CONFLICT_HINT =
  'Activating again records another payment and adds another period. Only continue if you really received a second payment.';
