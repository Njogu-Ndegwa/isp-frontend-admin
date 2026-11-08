'use client';

import type { PPPoECustomerPresenceResponse } from '../../lib/types';
import NoPPPoEPortNotice from '../../components/NoPPPoEPortNotice';
import { NO_PPPOE_SERVER_MESSAGE } from '../../lib/pppoePorts';
import { pppoeAccountProblem, routerHasNoPPPoEServer } from './pppoeActivation';

// Verdict codes from /api/pppoe/customers/{id}/presence. Anything not listed
// as fine is a problem on our side that support should fix before blaming the
// customer's equipment.
const ACCOUNT_OK = new Set(['present_and_online', 'router_account_exists_but_customer_offline']);
const ACCOUNT_UNKNOWN = new Set(['present_session_unknown']);

/** The one-line router verdict at the top of the Connection & devices card. */
export default function PPPoEAccountCheck({ presence }: { presence: PPPoECustomerPresenceResponse }) {
  const verdictCode = presence.verdict.code;

  // Never say "set up correctly" when no port on the router runs PPPoE.
  if (routerHasNoPPPoEServer(presence) && verdictCode !== 'present_and_online') {
    return (
      <NoPPPoEPortNotice
        routerId={presence.router.id}
        message={NO_PPPOE_SERVER_MESSAGE}
        testId="pppoe-account-check"
      />
    );
  }

  const accountOk = ACCOUNT_OK.has(verdictCode);
  const accountUnknown = ACCOUNT_UNKNOWN.has(verdictCode);
  return (
    <div
      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
        accountOk
          ? 'bg-success/10 text-success'
          : accountUnknown
            ? 'bg-background-tertiary text-foreground-muted'
            : 'bg-danger/10 text-danger'
      }`}
      data-testid="pppoe-account-check"
    >
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
      <span>
        {accountOk
          ? `Login is set up correctly on the router${presence.speed_enforcement.expected_rate_limit ? ', at the plan speed' : ''}.`
          : accountUnknown
            ? 'The router did not say which devices are connected. Try Refresh.'
            : pppoeAccountProblem(verdictCode, presence.customer.status, presence.verdict.message)}
      </span>
    </div>
  );
}
