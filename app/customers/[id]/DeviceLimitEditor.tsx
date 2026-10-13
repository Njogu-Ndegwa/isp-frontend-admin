'use client';

import { useState } from 'react';
import { api } from '../../lib/api';
import { useAlert } from '../../context/AlertContext';

// How many devices one customer may use at once: the plan's number, or a
// number set for this customer only. Shared by the hotspot Devices card and
// the PPPoE Connection card.
export default function DeviceLimitEditor({
  customerId,
  planMaxDevices,
  overrideMaxDevices,
  maxDevices,
  note,
  onSaved,
  onCancel,
}: {
  customerId: number;
  planMaxDevices: number;
  overrideMaxDevices: number | null;
  maxDevices: number;
  note: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { showAlert } = useAlert();
  const [value, setValue] = useState(String(maxDevices));
  const [saving, setSaving] = useState(false);

  const save = async (limit: number | null) => {
    try {
      setSaving(true);
      const result = await api.setCustomerDeviceLimit(customerId, limit);
      if (result.router_update === 'failed') {
        showAlert('warning', 'Limit saved, but the router could not be updated. It applies at the next renewal.');
      } else {
        showAlert(
          'success',
          limit === null
            ? 'Back to the plan’s device limit'
            : `This customer can now use ${limit} device${limit === 1 ? '' : 's'}`,
        );
      }
      onSaved();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Could not change the limit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <label className="block text-xs text-foreground-muted" htmlFor={`device-limit-${customerId}`}>
        Devices this customer can use at once (plan allows {planMaxDevices})
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-24">
          <input
            id={`device-limit-${customerId}`}
            type="number"
            min={1}
            max={50}
            className="input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            const n = Math.max(1, Math.min(50, parseInt(value, 10) || 1));
            save(n === planMaxDevices ? null : n);
          }}
          className="btn-primary text-sm"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {overrideMaxDevices !== null && (
          <button type="button" disabled={saving} onClick={() => save(null)} className="btn-secondary text-sm">
            Use plan limit
          </button>
        )}
        <button type="button" disabled={saving} onClick={onCancel} className="text-sm text-foreground-muted hover:underline">
          Cancel
        </button>
      </div>
      <p className="text-xs text-foreground-muted">{note}</p>
    </div>
  );
}
