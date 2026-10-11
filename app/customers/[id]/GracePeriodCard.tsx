'use client';

import { useState } from 'react';
import { api } from '../../lib/api';
import { Customer, SetCustomerGraceResponse } from '../../lib/types';
import { useAlert } from '../../context/AlertContext';
import { formatDateGMT3 } from '../../lib/dateUtils';
import {
  GRACE_PRESETS, GraceUnit, MAX_GRACE_MINUTES, formatGrace, graceDeadlineISO, graceToMinutes, splitGraceMinutes,
} from '../../lib/grace';

const DATE_FMT: Intl.DateTimeFormatOptions = {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
};

/**
 * Standing grace period for one customer: access continues for this long after
 * every expiry, without moving the expiry itself. Saved on its own endpoint,
 * separately from the customer form.
 */
export default function GracePeriodCard({
  customer,
  onSaved,
}: {
  customer: Customer;
  onSaved: (result: SetCustomerGraceResponse) => void;
}) {
  const { showAlert } = useAlert();
  const current = customer.grace_period_minutes ?? 0;
  const initial = splitGraceMinutes(current);
  const [value, setValue] = useState<string>(String(initial.value));
  const [unit, setUnit] = useState<GraceUnit>(initial.unit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minutes = value.trim() === '' ? null : graceToMinutes(Number(value), unit);
  const dirty = minutes !== null && minutes !== current;
  const rangeHint = `Enter a grace period between 0 and ${MAX_GRACE_MINUTES / (24 * 60)} days`;
  // Say why Save is disabled instead of leaving the button silently grey.
  const invalid = value.trim() !== '' && minutes === null;
  const shownError = error ?? (invalid ? rangeHint : null);
  const preview = dirty && minutes > 0 ? graceDeadlineISO(customer.expiry, minutes) : null;

  const applyPreset = (presetMinutes: number) => {
    const split = splitGraceMinutes(presetMinutes);
    setValue(String(split.value));
    setUnit(presetMinutes === 0 ? unit : split.unit);
    setError(null);
  };

  const save = async () => {
    if (minutes === null) {
      setError(rangeHint);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const result = await api.setCustomerGracePeriod(customer.id, minutes);
      onSaved(result);
      if (result.restored && result.access_until) {
        showAlert('success', `Grace saved. ${customer.name || 'Customer'} is being reconnected until ${formatDateGMT3(result.access_until, DATE_FMT)}`);
      } else if (minutes === 0) {
        showAlert('success', 'Grace period removed');
      } else {
        showAlert('success', `Grace period set to ${formatGrace(minutes)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save grace period');
    } finally {
      setSaving(false);
    }
  };

  const accessUntil = customer.effective_expiry || customer.expiry;

  return (
    <div className="card p-4 space-y-3" data-testid="grace-period-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Grace Period</h3>
        {customer.in_grace && <span className="badge badge-warning whitespace-nowrap">In grace</span>}
      </div>
      <p className="text-xs text-foreground-muted">
        Keep this customer connected for a while after their plan expires. Their expiry date
        stays the same, and when they pay, the new plan starts from the payment time.
      </p>

      {current > 0 && accessUntil && (
        <div className="bg-background-tertiary rounded-lg p-3 text-sm">
          <span className="text-foreground-muted">Current grace: </span>
          <span className="font-medium text-foreground">{formatGrace(current)}</span>
          <span className="text-foreground-muted"> · access until </span>
          <span className="font-medium text-foreground">{formatDateGMT3(accessUntil, DATE_FMT)}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {GRACE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.minutes)}
            className={`min-h-9 px-3.5 py-1.5 rounded-full text-xs border transition-colors active:opacity-70 ${
              minutes === p.minutes
                ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                : 'border-border text-foreground-muted hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          className="input min-w-0 flex-1"
          aria-label="Grace period length"
        />
        {/* .select is full-width; the wrapper fixes its size. */}
        <div className="w-28 shrink-0">
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as GraceUnit)}
            className="select"
            aria-label="Grace period unit"
          >
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </div>
      </div>

      {shownError && <p className="text-xs text-danger">{shownError}</p>}
      {!shownError && preview && (
        <p className="text-xs text-foreground-muted">
          After saving, access ends on{' '}
          <span className="font-medium text-foreground">{formatDateGMT3(preview, DATE_FMT)}</span>
          {' '}if they don&apos;t pay.
        </p>
      )}
      {!shownError && dirty && minutes === 0 && current > 0 && (
        <p className="text-xs text-foreground-muted">
          After saving, access ends at the plan expiry.{customer.in_grace ? ' This customer is in grace now and will be disconnected within a minute.' : ''}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving || !dirty}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving ? (
          <>
            <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            Saving...
          </>
        ) : (
          'Save Grace Period'
        )}
      </button>
    </div>
  );
}
