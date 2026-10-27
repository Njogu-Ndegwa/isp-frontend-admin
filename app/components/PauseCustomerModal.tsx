'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import { useAlert } from '../context/AlertContext';
import { useT, type TFunction } from '../lib/i18n';
import { formatDateGMT3, gmt3InputToISO } from '../lib/dateUtils';
import { formatPausedRemaining } from '../lib/customerPause';
import type { Customer, PauseCustomerResponse } from '../lib/types';
import DateTimePicker from './DateTimePicker';

const DATE_FMT: Intl.DateTimeFormatOptions = {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
};

function secondsLeft(expiry: string | null | undefined): number {
  if (!expiry) return 0;
  const hasZone = expiry.endsWith('Z') || expiry.includes('+');
  const ms = Date.parse(hasZone ? expiry : `${expiry}Z`);
  return Number.isNaN(ms) ? 0 : Math.max(0, Math.floor((ms - Date.now()) / 1000));
}

/** Toast after a resume, worded from what the router did. */
export function resumeAlert(
  t: TFunction,
  name: string,
  result: PauseCustomerResponse,
): { tone: 'success' | 'warning'; text: string } {
  const until = result.expiry ? formatDateGMT3(result.expiry, DATE_FMT) : '-';
  if (result.already_active) {
    return { tone: 'success', text: t('{name} is already active', { name }) };
  }
  if (result.router_result === 'ok' || result.router_result === 'skipped') {
    return { tone: 'success', text: t('{name} resumed until {date}. They connect again with the same login.', { name, date: until }) };
  }
  if (result.router_result === 'fup_blocked') {
    return { tone: 'warning', text: t('{name} resumed until {date}, but this period\'s data cap is used up, so they stay offline until it resets or they renew.', { name, date: until }) };
  }
  return {
    tone: 'warning',
    text: t('{name} resumed until {date}, but the router was not updated yet: {error}. It retries automatically.', {
      name, date: until, error: result.router_error || t('unreachable'),
    }),
  };
}

/**
 * Confirm a pause. Optional auto-resume date. The backend refuses anything it
 * cannot pause (expired, hotspot, router unreachable) with a reason we show.
 */
export default function PauseCustomerModal({
  customer,
  onClose,
  onPaused,
}: {
  customer: Customer;
  onClose: () => void;
  onPaused: (result: PauseCustomerResponse) => void;
}) {
  const t = useT();
  const { showAlert } = useAlert();
  const [autoResume, setAutoResume] = useState(false);
  const [resumeAt, setResumeAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = customer.name || t('Customer');
  const isStatic = (customer.connection_type ?? customer.plan?.connection_type) === 'static_ip';
  const left = formatPausedRemaining(secondsLeft(customer.expiry), t);

  const submit = async () => {
    if (autoResume && !resumeAt) {
      setError(t('Pick the date to resume on, or untick auto-resume.'));
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const result = await api.pauseCustomer(customer.id, autoResume ? gmt3InputToISO(resumeAt) : null);
      showAlert(
        'success',
        result.already_paused
          ? t('{name} was already paused', { name })
          : t('{name} paused with {time} left', {
              name, time: formatPausedRemaining(result.paused_remaining_seconds, t),
            }),
      );
      onPaused(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Pause failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="card p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()} data-testid="pause-customer-modal">
        <h3 className="text-lg font-semibold text-foreground">{t('Pause subscription')}</h3>
        <p className="text-sm text-foreground-muted">
          {t('{name} goes offline now. The {time} of paid time left is kept and starts counting again when you resume.', { name, time: left })}
        </p>
        <p className="text-sm text-foreground-muted">
          {isStatic
            ? t('Their static IP stays reserved for them.')
            : t('Their PPPoE username and password stay the same, so their router just reconnects on resume.')}
        </p>

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={autoResume}
            onChange={(e) => { setAutoResume(e.target.checked); setError(null); }}
            className="w-4 h-4 rounded"
          />
          {t('Resume automatically on a date')}
        </label>
        {autoResume && (
          <DateTimePicker label={t('Resume on')} value={resumeAt} onChange={setResumeAt} />
        )}

        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">{t('Cancel')}</button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-warning text-white hover:bg-warning/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : t('Pause')}
          </button>
        </div>
      </div>
    </div>
  );
}
