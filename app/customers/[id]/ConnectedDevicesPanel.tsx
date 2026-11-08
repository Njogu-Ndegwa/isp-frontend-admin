'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Customer, PPPoECustomerPresenceResponse } from '../../lib/types';
import PPPoEDeviceList from '../../components/PPPoEDeviceList';
import PPPoEDiagnoseDialog from '../../components/PPPoEDiagnoseDialog';
import DeviceLimitEditor from './DeviceLimitEditor';
import PPPoEAccountCheck from './PPPoEAccountCheck';
import PPPoENotActiveNotice from '../../components/PPPoENotActiveNotice';
import { pppoeNotActiveNotice, routerHasNoPPPoEServer } from './pppoeActivation';

// Asks the customer's router directly whether their PPPoE login is set up
// correctly and which devices are using it — one row per device, with its IP
// and MAC — and, when nobody is connected, why the last one dropped.
export default function ConnectedDevicesPanel({
  customerId,
  customer,
  canActivate = false,
  onActivated,
}: {
  customerId: number;
  /** When given and not active, the card leads with "Not active yet" + Activate. */
  customer?: Customer;
  canActivate?: boolean;
  onActivated?: () => void;
}) {
  const [presence, setPresence] = useState<PPPoECustomerPresenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [editingLimit, setEditingLimit] = useState(false);

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
  const lastDisconnect = presence?.last_disconnect;
  const noPPPoEServer = routerHasNoPPPoEServer(presence);
  const showDevices = mikrotik && mikrotik.present_on_router && !mikrotik.secret?.disabled;
  const notActive = !!customer && !!pppoeNotActiveNotice(customer);
  // The "Not active yet" note already says why the login is not on the
  // router; don't repeat it, but keep the no-PPPoE-port warning.
  const hideAccountCheck = notActive && !noPPPoEServer
    && presence?.verdict.code === 'missing_from_mikrotik';

  return (
    <div className="card p-4 space-y-3" data-testid="connected-devices">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Connection &amp; devices</h3>
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

      {customer && notActive && (
        <PPPoENotActiveNotice
          customer={customer}
          canActivate={canActivate}
          authFailures={presence?.auth_failures}
          onActivated={() => { onActivated?.(); void load(true); }}
        />
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && loading && !presence && (
        <p className="text-sm text-foreground-muted">Asking the router…</p>
      )}

      {!error && presence && (
        <>
          {!hideAccountCheck && <PPPoEAccountCheck presence={presence} />}

          {showDevices && devices.length === 0 && !noPPPoEServer && (
            <p className="text-sm text-foreground-muted">No device is connected with this login right now.</p>
          )}
          {showDevices && devices.length > 0 && (
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

          {presence.device_limit && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-muted">
              <span>
                Up to <span className="font-semibold text-foreground">{presence.device_limit.max_devices}</span>{' '}
                device{presence.device_limit.max_devices === 1 ? '' : 's'} on this login
                {presence.device_limit.max_devices_override !== null
                  ? ` (set for this customer; plan allows ${presence.device_limit.plan_max_devices})`
                  : ' (from the plan)'}
              </span>
              {!editingLimit && (
                <button
                  type="button"
                  onClick={() => setEditingLimit(true)}
                  className="font-medium text-accent-primary hover:underline"
                >
                  Change device limit
                </button>
              )}
            </div>
          )}
          {editingLimit && presence.device_limit && (
            <DeviceLimitEditor
              customerId={customerId}
              planMaxDevices={presence.device_limit.plan_max_devices}
              overrideMaxDevices={presence.device_limit.max_devices_override}
              maxDevices={presence.device_limit.max_devices}
              note="Saving updates the router now; the customer's devices reconnect once. A device beyond the limit is refused when it dials, and devices already online stay on."
              onSaved={() => { setEditingLimit(false); load(true); }}
              onCancel={() => setEditingLimit(false)}
            />
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
