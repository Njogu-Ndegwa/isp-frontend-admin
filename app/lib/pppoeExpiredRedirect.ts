import type { TFunction } from './i18n';
import { hasPermission, PERMISSIONS } from './permissions';

/**
 * "Redirect expired PPPoE users to payment page" (backend:
 * PUT /api/routers/{id}/pppoe-expired-redirect, staff permission routers.manage).
 *
 * The toggle applies or removes the walled state on the router itself, so it
 * acts immediately instead of waiting for the Edit Router form's Save.
 */
export function canToggleExpiredRedirect(user: Parameters<typeof hasPermission>[0]): boolean {
  return hasPermission(user, PERMISSIONS.routersManage);
}

/** What the switch's helper text says in each state. */
export function expiredRedirectDescription(t: TFunction, enabled: boolean): string {
  return enabled
    ? t('Expired PPPoE customers stay connected, but every website opens your payment page until they renew. They reconnect automatically after paying.')
    : t('Off: expired PPPoE customers are disconnected and cannot connect until they pay.');
}

/** Toast after the router accepted the change. */
export function expiredRedirectResultMessage(t: TFunction, enabled: boolean, released = 0): string {
  if (enabled) return t('Expired PPPoE customers will now see the payment page');
  if (released > 0) {
    return t('Payment page turned off. {count} expired customers waiting on it were disconnected.', { count: released });
  }
  return t('Payment page turned off. Expired PPPoE customers are disconnected again.');
}

/** The backend's 502 detail is "Router not updated: <reason>". */
export function expiredRedirectErrorMessage(t: TFunction, error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  if (/connect|timed? ?out|unreachable/i.test(raw)) {
    return t('Could not reach the router. Check that it is online and try again.');
  }
  if (/No free subnet/i.test(raw)) {
    return t('The router has no free address range for expired customers. Contact Bitwave support.');
  }
  return t('The router did not accept the change: {error}', { error: raw.replace(/^Router not updated:\s*/i, '') || t('unknown error') });
}
