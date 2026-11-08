import type { Customer, PPPoECustomerPresenceResponse, UpdateCustomerResponse } from '../../lib/types';
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

/**
 * True when the router was read and no port runs a PPPoE server, so this
 * login cannot connect however correct it is (router 599, 8 Nov 2026).
 * Older backends send no `pppoe_server` block; treat that as "don't know".
 */
export function routerHasNoPPPoEServer(
  presence: Pick<PPPoECustomerPresenceResponse, 'verdict' | 'pppoe_server'> | null | undefined,
): boolean {
  if (!presence) return false;
  return presence.verdict?.code === 'no_pppoe_server' || presence.pppoe_server?.available === false;
}

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

export const NOT_ACTIVE_WITH_ACCOUNT =
  "Not active yet: this login won't work until the customer pays to account {account} or you press Activate.";
export const NOT_ACTIVE_NO_ACCOUNT =
  "Not active yet: this login won't work until the customer pays or you press Activate.";
export const EXPIRED_WITH_ACCOUNT =
  "Expired: this login won't work until the customer pays to account {account} or you press Activate.";
export const EXPIRED_NO_ACCOUNT =
  "Expired: this login won't work until the customer pays or you press Activate.";
export const AUTH_FAILURES_MESSAGE =
  'Their router has tried this login {count} times recently and was refused because the customer is not active (last try {time}).';
export const AUTH_FAILURES_MESSAGE_NO_TIME =
  'Their router has tried this login {count} times recently and was refused because the customer is not active.';
export const NOW_ACTIVE_MESSAGE = 'Active: this login now works on the router.';

export interface NotActiveNotice {
  /** English i18n key; render through t(key, vars). */
  key: string;
  vars: Record<string, string>;
}

/**
 * The "this login won't work yet" notice for a PPPoE customer who is not
 * active, or null when none is needed. Saving a PPPoE customer only creates
 * the login in our database; it goes onto the router when the customer pays
 * or is activated. Resellers handed the login out straight away and the
 * client router got "authentication failed" hundreds of times (LKR0101,
 * 8 Nov 2026). Paused customers have their own card, so no notice for them.
 */
export function pppoeNotActiveNotice(
  customer: {
    status?: string | null;
    account_number?: string | null;
    is_paused?: boolean | null;
    expiry?: string | null;
  } | null | undefined,
  now: Date = new Date(),
): NotActiveNotice | null {
  if (!customer || !customer.status || customer.status === 'active' || customer.is_paused) return null;
  const account = (customer.account_number ?? '').trim();
  // A customer who had a plan that ran out, as opposed to one never activated.
  // The API sends naive UTC ("2026-12-09T16:14:47"); read it as UTC.
  const raw = customer.expiry ?? '';
  const expiry = raw ? new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}Z`) : null;
  const expired = !!expiry && !Number.isNaN(expiry.getTime()) && expiry.getTime() <= now.getTime();
  if (account) {
    return { key: expired ? EXPIRED_WITH_ACCOUNT : NOT_ACTIVE_WITH_ACCOUNT, vars: { account } };
  }
  return { key: expired ? EXPIRED_NO_ACCOUNT : NOT_ACTIVE_NO_ACCOUNT, vars: {} };
}

/** "The router refused this login N times" line, or null when there were none / we can't tell. */
export function authFailuresNotice(
  authFailures: PPPoECustomerPresenceResponse['auth_failures'],
): NotActiveNotice | null {
  if (!authFailures || !authFailures.lookup_success || !(authFailures.count > 0)) return null;
  const count = String(authFailures.count);
  return authFailures.last_at
    ? { key: AUTH_FAILURES_MESSAGE, vars: { count, time: authFailures.last_at } }
    : { key: AUTH_FAILURES_MESSAGE_NO_TIME, vars: { count } };
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
