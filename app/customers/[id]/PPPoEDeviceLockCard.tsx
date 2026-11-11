'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Customer, PppoeDeviceLockState } from '../../lib/types';
import { useAlert } from '../../context/AlertContext';
import { useT } from '../../lib/i18n';
import { formatDateGMT3 } from '../../lib/dateUtils';
import {
  allowNewRouterConfirm,
  deviceLockPendingNote,
  deviceLockResultMessage,
  deviceLockSummary,
} from '../../lib/pppoeDeviceLock';

const DATE_FMT: Intl.DateTimeFormatOptions = {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
};

/**
 * "Lock to this router" for a PPPoE customer: the login only works from the
 * customer's own router, so the username and password can't be reused on a
 * different one. Saved on its own endpoint and applied to the router at once.
 */
export default function PPPoEDeviceLockCard({ customer }: { customer: Customer }) {
  const t = useT();
  const { showAlert } = useAlert();
  const [state, setState] = useState<PppoeDeviceLockState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setState(await api.getPppoeDeviceLock(customer.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Could not load the device lock'));
    } finally {
      setLoading(false);
    }
  }, [customer.id, t]);

  useEffect(() => { load(); }, [load]);

  const enabled = !!state?.pppoe_device_lock;

  const toggle = async () => {
    const next = !enabled;
    setSaving(true);
    setError(null);
    try {
      const res = await api.setPppoeDeviceLock(customer.id, next);
      setState(res);
      showAlert(res.router_updated ? 'success' : 'warning',
        res.router_note ?? deviceLockResultMessage(t, next ? 'on' : 'off', res));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Could not change the device lock'));
    } finally {
      setSaving(false);
    }
  };

  const allowNewRouter = async () => {
    if (!window.confirm(allowNewRouterConfirm(t, state))) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.allowNewPppoeRouter(customer.id);
      setState(res);
      showAlert(res.router_updated ? 'success' : 'warning',
        res.router_note ?? deviceLockResultMessage(t, 'new-router', res));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Could not allow a new router'));
    } finally {
      setSaving(false);
    }
  };

  const pending = deviceLockPendingNote(t, state);
  const rejections = state?.recent_rejections ?? [];

  return (
    <div className="card p-5 space-y-3" data-testid="pppoe-device-lock-card">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`pppoe-device-lock-${customer.id}`}
            className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
            {t('Lock to this router')}
          </h3>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby={`pppoe-device-lock-${customer.id}`}
          disabled={saving || loading || !state}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${enabled ? 'bg-accent-primary' : 'bg-background-tertiary border border-border'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <p className="text-xs text-foreground-muted">
        {t('Stops this PPPoE username and password from being used on a different router.')}
      </p>

      {loading ? (
        <p className="text-xs text-foreground-muted">{t('Loading...')}</p>
      ) : (
        <div className="bg-background-tertiary rounded-lg p-3 text-sm space-y-1" data-testid="pppoe-device-lock-status">
          <p className="text-foreground">{deviceLockSummary(t, state)}</p>
          {state?.pppoe_bound_at && state.pppoe_lock_state === 'locked' && (
            <p className="text-xs text-foreground-muted">
              {t('Locked since {date}', { date: formatDateGMT3(state.pppoe_bound_at, DATE_FMT) })}
            </p>
          )}
        </div>
      )}

      {saving && <p className="text-xs text-foreground-muted">{t('Updating the router...')}</p>}
      {pending && <p className="text-xs text-warning" role="status">{pending}</p>}
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}

      {enabled && (
        <button
          type="button"
          onClick={allowNewRouter}
          disabled={saving || state?.pppoe_lock_state !== 'locked'}
          className="btn-secondary w-full disabled:opacity-50"
          data-testid="pppoe-allow-new-router"
        >
          {t('Allow new router')}
        </button>
      )}

      {rejections.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">{t('Refused logins seen in the router log')}</p>
          <ul className="text-xs text-foreground-muted space-y-0.5">
            {rejections.map((r, i) => (
              <li key={`${r.occurred_at}-${i}`} className="break-words">
                {r.occurred_at ? `${formatDateGMT3(r.occurred_at, DATE_FMT)} · ` : ''}{r.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
