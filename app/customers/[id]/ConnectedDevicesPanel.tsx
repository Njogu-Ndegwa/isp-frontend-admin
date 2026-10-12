'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { PPPoECustomerPresenceResponse } from '../../lib/types';
import PPPoEDeviceList from '../../components/PPPoEDeviceList';
import PPPoEDiagnoseDialog from '../../components/PPPoEDiagnoseDialog';

// Verdict codes from /api/pppoe/customers/{id}/presence. Anything not listed
// as fine is a problem on our side that support should fix before blaming the
// customer's equipment.
const ACCOUNT_OK = new Set(['present_and_online', 'router_account_exists_but_customer_offline']);
const ACCOUNT_UNKNOWN = new Set(['present_session_unknown']);

const ACCOUNT_PROBLEM: Record<string, string> = {
  missing_from_mikrotik: 'This username is not on the router, so no device can log in. Re-save the customer to provision it again.',
  present_but_disabled: 'The login is disabled on the router, so no device can log in.',
  present_but_profile_missing: 'The login points at a speed profile that no longer exists on the router.',
  rate_limit_mismatch: 'The speed on the router does not match the plan the customer paid for.',
  active_queue_rate_mismatch: 'The connected device is still on an old speed. It changes the next time it reconnects.',
};

// Asks the customer's router directly whether their PPPoE login is set up
// correctly and which devices are using it — one row per device, with its IP
// and MAC — and, when nobody is connected, why the last one dropped.
export default function ConnectedDevicesPanel({ customerId }: { customerId: number }) {
  const [presence, setPresence] = useState<PPPoECustomerPresenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);

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
  const verdictCode = presence?.verdict.code ?? '';
  const accountOk = ACCOUNT_OK.has(verdictCode);
  const accountUnknown = ACCOUNT_UNKNOWN.has(verdictCode);
  const lastDisconnect = presence?.last_disconnect;
  const showDevices = mikrotik && mikrotik.present_on_router && !mikrotik.secret?.disabled;

  return (
    <div className="card p-4 space-y-3" data-testid="connected-devices">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Connection</h3>
          {presence && (
            <p className="text-xs text-foreground-muted truncate">
              <span className="font-mono">{presence.customer.pppoe_username}</span> on {presence.router.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {presence && (
            <button
              type="button"
              onClick={() => setDiagnosing(true)}
              className="text-xs font-medium text-accent-primary hover:underline whitespace-nowrap"
            >
              Diagnose
            </button>
          )}
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading}
            className="text-xs font-medium text-accent-primary hover:underline disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? 'Checking…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && loading && !presence && (
        <p className="text-sm text-foreground-muted">Asking the router…</p>
      )}

      {!error && presence && (
        <>
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
                  : ACCOUNT_PROBLEM[verdictCode] ?? presence.verdict.message}
            </span>
          </div>

          {showDevices && (
            <PPPoEDeviceList
              devices={devices}
              onlyOne={mikrotik.profile_detail?.only_one}
              planSpeed={presence.customer.plan_speed}
            />
          )}

          {devices.length === 0 && lastDisconnect && (
            <div className="rounded-lg border border-border p-3 space-y-1 text-sm" data-testid="pppoe-last-disconnect">
              <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Why they&apos;re offline</p>
              <p className="text-foreground">{lastDisconnect.probable_cause}</p>
              <p className="text-foreground-muted text-xs">{lastDisconnect.technician_action}</p>
              <p className="text-foreground-muted text-xs">
                Router said <span className="font-mono">{lastDisconnect.reason}</span>
                {lastDisconnect.at && <> at {lastDisconnect.at}</>}
                {lastDisconnect.caller_id && (
                  <> · last device <span className="font-mono">{lastDisconnect.caller_id}</span></>
                )}
              </p>
            </div>
          )}
        </>
      )}

      {diagnosing && presence && (
        <PPPoEDiagnoseDialog
          username={presence.customer.pppoe_username}
          routerId={presence.router.id}
          onClose={() => setDiagnosing(false)}
        />
      )}
    </div>
  );
}
