'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import type { CustomerDevice, CustomerDevicesResponse } from '../../lib/types';
import { formatBps } from '../../lib/live';
import { useAlert } from '../../context/AlertContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatUsageMb } from './usageFormat';
import DeviceLimitEditor from './DeviceLimitEditor';

const MAC_PATTERN = /^([0-9A-Fa-f]{2}[:-]?){5}[0-9A-Fa-f]{2}$/;

function deviceLabel(device: CustomerDevice): string {
  if (device.device_name && device.device_name.trim()) return device.device_name;
  return device.is_main_device ? 'Main device' : 'Device';
}

// Every device on a hotspot customer's plan: the paying device plus the extra
// devices sharing it. Lists each with its MAC, IP, online state and usage, and
// lets the reseller add a device by MAC, remove one, or give this customer a
// different number of devices than their plan.
export default function HotspotDevicesPanel({ customerId }: { customerId: number }) {
  const { showAlert } = useAlert();
  const [data, setData] = useState<CustomerDevicesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [mac, setMac] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingLimit, setEditingLimit] = useState(false);

  const [removing, setRemoving] = useState<CustomerDevice | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await api.getCustomerDevices(customerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load devices');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  const used = data?.devices.length ?? 0;
  const full = data ? used >= data.max_devices : false;
  const ownerId = data?.owner_customer_id ?? customerId;

  const addDevice = async () => {
    if (!MAC_PATTERN.test(mac.trim())) {
      showAlert('error', 'Enter a MAC address like AA:BB:CC:DD:EE:FF');
      return;
    }
    try {
      setSaving(true);
      const result = await api.addCustomerDevice(ownerId, {
        mac_address: mac.trim(),
        device_name: name.trim() || undefined,
      });
      showAlert('success', result.message);
      setMac('');
      setName('');
      setAdding(false);
      await load();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Could not add the device');
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing?.pairing_id) return;
    try {
      setRemoveBusy(true);
      const result = await api.removeCustomerDevice(ownerId, removing.pairing_id);
      showAlert(result.cleanup_status === 'removed' ? 'success' : 'warning', result.message);
      setRemoving(null);
      await load();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Could not remove the device');
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <div className="card p-4 space-y-3" data-testid="hotspot-devices">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Devices</h3>
          {data && (
            <p className="text-xs text-foreground-muted">
              <span className="font-semibold text-foreground">{used}</span> of {data.max_devices} device{data.max_devices === 1 ? '' : 's'}
              {data.max_devices_override !== null
                ? <> · set for this customer (plan allows {data.plan_max_devices})</>
                : <> · from the plan</>}
              {data.pooled_usage_mb !== null && <> · {formatUsageMb(data.pooled_usage_mb)} used together this period</>}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="text-xs font-medium text-accent-primary hover:underline disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? 'Checking…' : 'Refresh'}
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && loading && !data && <p className="text-sm text-foreground-muted">Loading devices…</p>}

      {data && data.owner_customer_id !== customerId && (
        <p className="text-xs text-foreground-muted">
          This device shares{' '}
          <Link href={`/customers/${data.owner_customer_id}`} className="text-accent-primary hover:underline">
            {data.owner_name}
          </Link>
          &apos;s plan.
        </p>
      )}

      {data && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {data.devices.map((d) => (
            <li key={d.pairing_id ?? `main-${d.device_mac}`} className="p-3 flex items-center gap-3 text-sm">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${d.live?.online ? 'bg-emerald-500' : 'bg-foreground-muted/40'}`}
                title={d.live ? (d.live.online ? 'Online' : 'Offline') : 'No live data'}
              />
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate">
                  {deviceLabel(d)}
                  {d.is_main_device && (
                    <span className="ml-2 align-middle px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-accent-primary/10 text-accent-primary">
                      Pays
                    </span>
                  )}
                </p>
                <p className="font-mono text-xs text-foreground-muted flex flex-wrap gap-x-2">
                  <span>{d.device_mac}</span>
                  {d.live?.ip && <span>{d.live.ip}</span>}
                </p>
                <p className="text-xs text-foreground-muted">
                  {d.live
                    ? d.live.online
                      ? <span className="text-emerald-500">Online{d.live.uptime ? ` · up ${d.live.uptime}` : ''}</span>
                      : 'Offline'
                    : 'Live status unavailable'}
                  {d.live?.online && d.live.rate_down_bps !== null && (
                    <> · <span className="text-accent-primary whitespace-nowrap">↓ {formatBps(d.live.rate_down_bps)}</span>{' '}
                      <span className="text-teal-500 whitespace-nowrap">↑ {formatBps(d.live.rate_up_bps)}</span></>
                  )}
                  {d.period_usage_mb !== null && <> · {formatUsageMb(d.period_usage_mb)} this period</>}
                </p>
              </div>
              {!d.is_main_device && d.pairing_id !== null && (
                <button
                  type="button"
                  onClick={() => setRemoving(d)}
                  className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-danger/30 text-danger hover:bg-danger/10 transition-colors active:opacity-70"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {data?.live_error && (
        <p className="text-xs text-warning">The router did not answer, so online status is not shown.</p>
      )}

      {data && !adding && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={full || !data.subscription_active}
            className="text-sm font-medium text-accent-primary hover:underline disabled:opacity-50 disabled:no-underline"
          >
            + Add device
          </button>
          {!editingLimit && (
            <button
              type="button"
              onClick={() => setEditingLimit(true)}
              className="text-sm font-medium text-foreground-muted hover:text-foreground hover:underline"
            >
              Change device limit
            </button>
          )}
          {full && data.subscription_active && (
            <span className="text-xs text-foreground-muted">All slots used — remove a device or raise the limit.</span>
          )}
          {!data.subscription_active && (
            <span className="text-xs text-foreground-muted">Plan not active — record a payment to add devices.</span>
          )}
        </div>
      )}

      {adding && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="input font-mono"
              placeholder="MAC address, e.g. AA:BB:CC:DD:EE:FF"
              value={mac}
              onChange={(e) => setMac(e.target.value)}
              autoFocus
            />
            <input
              className="input"
              placeholder="Name (optional), e.g. Living room TV"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <p className="text-xs text-foreground-muted">
            The device gets internet on this plan until it expires, and renews with it.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={addDevice} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Adding…' : 'Add device'}
            </button>
            <button type="button" onClick={() => setAdding(false)} disabled={saving} className="btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {editingLimit && data && (
        <DeviceLimitEditor
          customerId={ownerId}
          planMaxDevices={data.plan_max_devices}
          overrideMaxDevices={data.max_devices_override}
          maxDevices={data.max_devices}
          note="Lowering it does not disconnect anyone now; extra devices are released at the next renewal, newest first."
          onSaved={() => { setEditingLimit(false); load(); }}
          onCancel={() => setEditingLimit(false)}
        />
      )}

      <ConfirmDialog
        isOpen={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        title="Remove device"
        message={removing ? `${deviceLabel(removing)} (${removing.device_mac}) will be disconnected and taken off this plan.` : ''}
        confirmLabel="Remove"
        variant="danger"
        loading={removeBusy}
      />
    </div>
  );
}
