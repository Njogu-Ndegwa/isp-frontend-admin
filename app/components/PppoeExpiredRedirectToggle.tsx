'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import { useAlert } from '../context/AlertContext';
import { useT } from '../lib/i18n';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../lib/permissions';
import {
  expiredRedirectDescription,
  expiredRedirectErrorMessage,
  expiredRedirectResultMessage,
} from '../lib/pppoeExpiredRedirect';

/**
 * Router settings switch: "Redirect expired PPPoE users to payment page".
 * Changes the router straight away (the flag only flips once the router
 * accepted it), independent of the Edit Router form's Save button.
 */
export default function PppoeExpiredRedirectToggle({
  routerId,
  initialEnabled,
  onChanged,
}: {
  routerId: number;
  initialEnabled: boolean;
  onChanged?: (enabled: boolean) => void;
}) {
  const t = useT();
  const { showAlert } = useAlert();
  const { can } = usePermissions();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!can(PERMISSIONS.routersManage)) return null;

  const toggle = async () => {
    const next = !enabled;
    setSaving(true);
    setError(null);
    try {
      const res = await api.setPppoeExpiredRedirect(routerId, next);
      setEnabled(res.pppoe_expired_redirect);
      onChanged?.(res.pppoe_expired_redirect);
      showAlert('success', expiredRedirectResultMessage(t, next, res.result?.secrets_removed?.length ?? 0));
    } catch (err) {
      setError(expiredRedirectErrorMessage(t, err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-2 border-t border-border" data-testid="pppoe-expired-redirect">
      <div className="flex items-center justify-between gap-3">
        <div>
          <label id={`pppoe-expired-redirect-${routerId}`} className="block text-sm font-medium text-foreground">
            {t('Redirect expired PPPoE users to payment page')}
          </label>
          <p className="text-xs text-foreground-muted mt-0.5">{expiredRedirectDescription(t, enabled)}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby={`pppoe-expired-redirect-${routerId}`}
          disabled={saving}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${enabled ? 'bg-accent-primary' : 'bg-background-tertiary border border-border'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      {saving && (
        <p className="text-xs text-foreground-muted mt-2">{t('Updating the router...')}</p>
      )}
      {error && (
        <p className="text-xs text-danger mt-2" role="alert">{error}</p>
      )}
    </div>
  );
}
