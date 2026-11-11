'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAlert } from '../../context/AlertContext';
import { usePermissions } from '../../hooks/usePermissions';

/** Owner setting: lock each PPPoE login to the router it was first put on. Off by default. */
export default function PppoeRouterLockCard() {
  const { isStaff } = usePermissions();
  const { showAlert } = useAlert();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isStaff) return;
    api.getPppoeRouterLock()
      .then((s) => { setEnabled(s.enabled); setLocked(s.locked_customers); })
      .catch(() => setEnabled(null));
  }, [isStaff]);

  if (isStaff || enabled === null) return null;

  const toggle = async () => {
    try {
      setSaving(true);
      const s = await api.setPppoeRouterLock(!enabled);
      setEnabled(s.enabled);
      setLocked(s.locked_customers);
      showAlert('success', s.enabled
        ? `PPPoE router lock on. ${s.newly_locked ?? 0} account(s) locked to their current router.`
        : 'PPPoE router lock off. Accounts can be moved between routers again.');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to change the setting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden" data-testid="pppoe-router-lock-card">
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Lock PPPoE accounts to their first router</h2>
          <p className="text-xs text-foreground-muted mt-1">
            When on, a PPPoE login stays on the router it was first set up on and cannot be moved to
            another of your routers. You can release one customer from their page when you really need to move them.
          </p>
          {enabled && (
            <p className="text-xs text-foreground-muted mt-2">{locked} account(s) locked.</p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Lock PPPoE accounts to their first router"
          disabled={saving}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-accent-primary' : 'bg-background-tertiary border border-border'}`}
        >
          <span className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
    </section>
  );
}
