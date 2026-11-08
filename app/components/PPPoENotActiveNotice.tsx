'use client';

import { useState } from 'react';
import type { Customer, PPPoECustomerPresenceResponse } from '../lib/types';
import { useT } from '../lib/i18n';
import { authFailuresNotice, pppoeNotActiveNotice } from '../customers/[id]/pppoeActivation';
import ActivateCustomerModal from './ActivateCustomerModal';

type NoticeCustomer = Pick<Customer, 'id' | 'name' | 'status' | 'connection_type' | 'account_number' | 'expiry'>
  & Partial<Pick<Customer, 'is_paused' | 'plan'>>;

/**
 * Amber "Not active yet" note for a PPPoE customer whose login is not on the
 * router yet, with an Activate button that opens the usual Activate dialog
 * (which records the payment, or "Activate without payment"). Renders nothing
 * for an active or paused customer.
 */
export default function PPPoENotActiveNotice({
  customer,
  canActivate,
  authFailures,
  onActivated,
}: {
  customer: NoticeCustomer;
  canActivate: boolean;
  authFailures?: PPPoECustomerPresenceResponse['auth_failures'];
  onActivated: () => void;
}) {
  const t = useT();
  const [activating, setActivating] = useState(false);
  const notice = pppoeNotActiveNotice(customer);
  if (!notice) return null;
  const failures = authFailuresNotice(authFailures);

  return (
    <>
    <div
      className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning"
      data-testid="pppoe-not-active"
      role="status"
    >
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
      <div className="space-y-2 min-w-0 flex-1">
        <p>{t(notice.key, notice.vars)}</p>
        {failures && (
          <p className="text-xs" data-testid="pppoe-auth-failures">{t(failures.key, failures.vars)}</p>
        )}
        {canActivate && (
          <button
            type="button"
            onClick={() => setActivating(true)}
            className="btn-primary text-xs px-3 py-1.5"
            data-testid="pppoe-not-active-activate"
          >
            {t('Activate')}
          </button>
        )}
      </div>
    </div>
    {activating && (
      <ActivateCustomerModal
        customer={customer}
        canManageCustomers={canActivate}
        onClose={() => setActivating(false)}
        onActivated={() => { setActivating(false); onActivated(); }}
      />
    )}
    </>
  );
}
