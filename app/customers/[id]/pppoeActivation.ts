import type { Customer, UpdateCustomerResponse } from '../../lib/types';
import { gmt3InputToISO } from '../../lib/dateUtils';

// Verdict codes from /api/pppoe/customers/{id}/presence that mean the login
// on the router is wrong. Anything not listed falls back to the API message.
const ACCOUNT_PROBLEM: Record<string, string> = {
  missing_from_mikrotik: 'This username is not on the router, so no device can log in. Re-save the customer to provision it again.',
  present_but_disabled: 'The login is disabled on the router, so no device can log in.',
  present_but_profile_missing: 'The login points at a speed profile that no longer exists on the router.',
  rate_limit_mismatch: 'The speed on the router does not match the plan the customer paid for.',
  active_queue_rate_mismatch: 'The connected device is still on an old speed. It changes the next time it reconnects.',
};

export const INACTIVE_NOT_ON_ROUTER =
  'Customer is inactive – press Activate to put them on the router.';

/**
 * What to tell the reseller when the router check found a problem.
 *
 * An INACTIVE customer is never on the router (the system removes their
 * login on purpose), so "Re-save" is wrong advice there: saving does not
 * activate. Only an ACTIVE customer whose login went missing is fixed by a
 * re-save.
 */
export function pppoeAccountProblem(
  verdictCode: string,
  customerStatus: string | null | undefined,
  fallback: string,
): string {
  if (verdictCode === 'missing_from_mikrotik' && customerStatus && customerStatus !== 'active') {
    return INACTIVE_NOT_ON_ROUTER;
  }
  return ACCOUNT_PROBLEM[verdictCode] ?? fallback;
}

/**
 * The edit form offers "Activate now – already paid until <date>" for a PPPoE
 * customer who is not active and whose expiry field holds a future date.
 * (`expiryInput` is the form's GMT+3 "YYYY-MM-DDTHH:MM" value.)
 */
export function canActivatePaidUntil(
  customer: Pick<Customer, 'status'> | null | undefined,
  isPPPoE: boolean,
  expiryInput: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!customer || !isPPPoE || customer.status === 'active' || !expiryInput) return false;
  const expiry = new Date(gmt3InputToISO(expiryInput));
  return !Number.isNaN(expiry.getTime()) && expiry.getTime() > now.getTime();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-20T09:00" (the form's GMT+3 value) -> "20 Nov 2026, 09:00". */
export function formatPaidUntil(expiryInput: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(expiryInput ?? '');
  if (!m) return expiryInput ?? '';
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return expiryInput ?? '';
  return `${Number(m[3])} ${month} ${m[1]}, ${m[4]}:${m[5]}`;
}

export type SaveNoticeTone = 'success' | 'warning';

/** Follow-up message about the router after saving a PPPoE customer. */
export function pppoeSaveNotice(
  result: Pick<UpdateCustomerResponse, 'pppoe_reprovisioned' | 'activated_paid_until'>,
): { tone: SaveNoticeTone; text: string } | null {
  const status = result.pppoe_reprovisioned;
  if (result.activated_paid_until) {
    if (status === 'ok') {
      return { tone: 'success', text: 'Activated without a payment and added to the router.' };
    }
    return {
      tone: 'warning',
      text: 'Activated without a payment. The router was not updated yet; it retries automatically.',
    };
  }
  if (status === 'retry_pending' || status === 'failed') {
    return {
      tone: 'warning',
      text: status === 'retry_pending'
        ? 'Saved, but the router was not updated yet. It retries automatically.'
        : 'Saved, but the router could not be updated. Check that the router is online and save again.',
    };
  }
  if (status === 'in_progress') {
    return { tone: 'success', text: 'Saved. The router is already being updated for this customer.' };
  }
  return null;
}
