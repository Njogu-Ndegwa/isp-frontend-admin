'use client';

import { useState } from 'react';
import { api } from '../../lib/api';
import { useAlert } from '../../context/AlertContext';
import { useT } from '../../lib/i18n';
import { formatDateGMT3 } from '../../lib/dateUtils';
import { canPause, canResume, formatPausedRemaining, supportsPause } from '../../lib/customerPause';
import type { Customer, PauseCustomerResponse } from '../../lib/types';
import PauseCustomerModal, { resumeAlert } from '../../components/PauseCustomerModal';

const DATE_FMT: Intl.DateTimeFormatOptions = {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
};

/**
 * Pause / resume for PPPoE and static-IP customers: freeze the subscription
 * (customer offline, paid time kept) and continue it later.
 */
export default function SubscriptionPauseCard({
  customer,
  onChanged,
}: {
  customer: Customer;
  onChanged: (result: PauseCustomerResponse) => void;
}) {
  const t = useT();
  const { showAlert } = useAlert();
  const [confirming, setConfirming] = useState(false);
  const [resuming, setResuming] = useState(false);

  if (!supportsPause(customer)) return null;
  const paused = canResume(customer);
  const name = customer.name || t('Customer');

  const resume = async () => {
    try {
      setResuming(true);
      const result = await api.resumeCustomer(customer.id);
      const alert = resumeAlert(t, name, result);
      showAlert(alert.tone, alert.text);
      onChanged(result);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Resume failed'));
    } finally {
      setResuming(false);
    }
  };

  return (
    <div className="card p-5 space-y-3" data-testid="subscription-pause-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">{t('Pause subscription')}</h3>
        {paused && <span className="badge badge-warning">{t('Paused')}</span>}
      </div>

      {paused ? (
        <>
          <p className="text-sm text-foreground">
            {t('{time} of paid time left, kept while paused.', {
              time: formatPausedRemaining(customer.paused_remaining_seconds, t),
            })}
          </p>
          <p className="text-xs text-foreground-muted">
            {customer.paused_at && t('Paused since {date}.', { date: formatDateGMT3(customer.paused_at, DATE_FMT) })}{' '}
            {customer.pause_resume_at
              ? t('Resumes automatically on {date}.', { date: formatDateGMT3(customer.pause_resume_at, DATE_FMT) })
              : t('Not charged and no expiry reminders while paused.')}
          </p>
          <button onClick={resume} disabled={resuming} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
            {resuming
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : t('Resume')}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-foreground-muted">
            {t('Travelling or away? Pause to take them offline and keep the paid time for later, instead of deactivating.')}
          </p>
          <button
            onClick={() => setConfirming(true)}
            disabled={!canPause(customer)}
            title={canPause(customer) ? undefined : t('Only an active customer with paid time left can be paused')}
            className="btn-secondary w-full disabled:opacity-50"
          >
            {t('Pause')}
          </button>
        </>
      )}

      {confirming && (
        <PauseCustomerModal
          customer={customer}
          onClose={() => setConfirming(false)}
          onPaused={(result) => { setConfirming(false); onChanged(result); }}
        />
      )}
    </div>
  );
}
