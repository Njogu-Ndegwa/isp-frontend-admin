'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { PPPoECustomerPresenceResponse } from '../../lib/types';
import PPPoEDeviceList from '../../components/PPPoEDeviceList';

const STATE_MESSAGE: Record<string, string> = {
  missing: 'This customer’s PPPoE username is not on the router.',
  disabled: 'The PPPoE secret is disabled on the router, so no device can log in.',
  session_unknown: 'The router did not say which devices are connected. Try refreshing.',
};

// Asks the customer's router directly which devices are logged in with their
// PPPoE username — one row per device, with its IP and MAC — so a reseller can
// see a shared login instead of a single "online" flag.
export default function ConnectedDevicesPanel({ customerId }: { customerId: number }) {
  const [presence, setPresence] = useState<PPPoECustomerPresenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh: boolean) => {
    try {
      setLoading(true);
      setError(null);
      setPresence(await api.getPPPoECustomerPresence(customerId, refresh));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the router');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { load(false); }, [load]);

  const mikrotik = presence?.mikrotik;
  const devices = mikrotik?.active_sessions ?? [];
  const stateMessage = mikrotik ? STATE_MESSAGE[mikrotik.state] : undefined;

  return (
    <div className="card p-4 space-y-3" data-testid="connected-devices">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Connected Devices</h3>
          {presence && (
            <p className="text-xs text-foreground-muted">
              <span className="font-mono">{presence.customer.pppoe_username}</span> on {presence.router.name}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading}
          className="text-xs font-medium text-accent-primary hover:underline disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? 'Checking…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}
      {!error && loading && !presence && (
        <p className="text-sm text-foreground-muted">Asking the router…</p>
      )}
      {!error && mikrotik && (stateMessage ? (
        <p className="text-sm text-warning">{stateMessage}</p>
      ) : (
        <PPPoEDeviceList
          devices={devices}
          onlyOne={mikrotik.profile_detail?.only_one}
          planSpeed={presence?.customer.plan_speed}
        />
      ))}
    </div>
  );
}
