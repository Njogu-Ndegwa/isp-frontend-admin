'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import { useAlert } from '../context/AlertContext';
import { useT } from '../lib/i18n';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../lib/permissions';

/**
 * Router settings switch: "Lock new PPPoE customers to their first router".
 * Only customers registered after it is turned on start locked; existing
 * customers are never changed. Saves straight away, like the other switches
 * here, independent of the Edit Router form's Save button.
 */
export default function PppoeLockDefaultToggle({
  routerId,
  initialEnabled,
}: {
  routerId: number;
  initialEnabled: boolean;
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
      const res = await api.setPppoeLockDefault(routerId, next);
      setEnabled(res.pppoe_lock_new_customers);
      showAlert('success', res.pppoe_lock_new_customers
        ? t('New PPPoE customers on this router will be locked to their first router')
        : t('New PPPoE customers on this router will not be locked'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Could not save the setting'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-2 border-t border-border" data-testid="pppoe-lock-default">
      <div className="flex items-center justify-between gap-3">
        <div>
          <label id={`pppoe-lock-default-${routerId}`} className="block text-sm font-medium text-foreground">
            {t('Lock new PPPoE customers to their first router')}
          </label>
          <p className="text-xs text-foreground-muted mt-0.5">
            {enabled
              ? t('New PPPoE customers can only log in from the first router they connect with. Existing customers are not changed.')
              : t('Off: new PPPoE customers can log in from any router. You can still lock a customer on their page.')}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby={`pppoe-lock-default-${routerId}`}
          disabled={saving}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${enabled ? 'bg-accent-primary' : 'bg-background-tertiary border border-border'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      {error && <p className="text-xs text-danger mt-2" role="alert">{error}</p>}
    </div>
  );
}
