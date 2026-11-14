'use client';

import { useT } from '../lib/i18n';
import type { AccessCredential } from '../lib/types';

/**
 * A credential change the router has not received yet (backend
 * `access_credentials.router_sync`, 2026-11-14): the router was unreachable
 * when the credential was created, changed or revoked. The backend retries
 * when the router answers again, or sends it over the router's check-in.
 */
export const PENDING_LABEL = 'Pending: router unreachable';

export function routerSyncDetail(cred: Pick<AccessCredential, 'router_sync'>): string | null {
  switch (cred.router_sync) {
    case 'add':
      return 'It will be added to the router as soon as the router is reachable.';
    case 'remove':
      return 'Revoked here. The login is removed from the router as soon as the router is reachable.';
    case 'delete':
      return 'Revoked here. It is removed from the router, then deleted, as soon as the router is reachable.';
    default:
      return null;
  }
}

export default function RouterSyncBadge({
  cred,
  showDetail = false,
}: {
  cred: Pick<AccessCredential, 'router_sync' | 'router_sync_error'>;
  showDetail?: boolean;
}) {
  const t = useT();
  const detail = routerSyncDetail(cred);
  if (!detail) return null;
  return (
    <span className="inline-flex flex-col gap-0.5" data-testid="router-sync-pending">
      <span
        className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"
        title={cred.router_sync_error || undefined}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
        {t(PENDING_LABEL)}
      </span>
      {showDetail && <span className="text-xs text-foreground-muted">{t(detail)}</span>}
    </span>
  );
}

/** The warning to show after a create / change / revoke / delete the router could not take. */
export function pendingWarning(result: { pending?: boolean; warning?: string | null } | null | undefined): string | null {
  if (!result?.pending) return null;
  return result.warning || PENDING_LABEL;
}
