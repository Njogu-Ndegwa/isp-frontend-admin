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
