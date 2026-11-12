import type { TFunction } from './i18n';
import { hasPermission, PERMISSIONS } from './permissions';
import type { RouterWifiReason } from './types';

/**
 * Router Wi-Fi name (SSID).
 *
 * Backend: GET /api/routers/{id}/wifi (routers.view) reads the hotspot Wi-Fi
 * names live from the router; PUT /api/routers/{id}/wifi/ssid (routers.manage)
 * renames only access-point interfaces in the hotspot bridge, keeps security
 * as is, and reads the name back to confirm.
 */

export const WIFI_NAME_MAX = 32;
export const DEFAULT_WIFI_NAME = 'Bitwave WiFi';

export function canRenameWifi(user: Parameters<typeof hasPermission>[0]): boolean {
  return hasPermission(user, PERMISSIONS.routersManage);
}

/** Same rule as the backend's validate_ssid: 1-32 printable ASCII characters. */
export function wifiNameError(t: TFunction, value: string): string | null {
  const name = value.trim();
  if (!name) return t('Type a Wi-Fi name.');
  if (/[^\x20-\x7e]/.test(name)) {
    return t('Use only English letters, numbers, spaces and common symbols in the Wi-Fi name.');
  }
  if (name.length > WIFI_NAME_MAX) {
    return t('A Wi-Fi name can be at most {max} characters.', { max: WIFI_NAME_MAX });
  }
  return null;
}

/**
 * Mirror of the backend's sanitize_wifi_ssid, used to prefill Add Router:
 * accents folded to ASCII, characters RouterOS scripts can't carry dropped,
 * spaces collapsed, cut to 32.
 */
export function sanitizeWifiName(raw: string | null | undefined): string {
  const folded = (raw ?? '').normalize('NFKD').replace(/[^\x00-\x7f]/g, '');
  const cleaned = folded.replace(/[^\x20-\x7e]/g, '').replace(/["\\$?;{}[\]`]/g, '');
  return cleaned.split(/\s+/).filter(Boolean).join(' ').slice(0, WIFI_NAME_MAX).trim();
}

/** Default Wi-Fi name for a new router: business name, then organisation name. */
export function defaultWifiName(
  user: { business_name?: string | null; organization_name?: string | null } | null | undefined,
): string {
  for (const raw of [user?.business_name, user?.organization_name]) {
    const name = sanitizeWifiName(raw);
    if (name && !name.includes('@') && name.toUpperCase() !== 'N/A') return name;
  }
  return DEFAULT_WIFI_NAME;
}

export function wifiReasonLabel(t: TFunction, reason: RouterWifiReason | null | undefined): string {
  switch (reason) {
    case 'disabled':
      return t('turned off');
    case 'client_mode':
      return t('client mode (may be the internet link), left alone');
    case 'not_hotspot':
      return t('not in the hotspot network, left alone');
    case 'virtual':
      return t('extra (virtual) network, keeps its own name');
    default:
      return '';
  }
}

/** Errors from the rename/read calls in words a reseller can act on. */
export function wifiErrorMessage(t: TFunction, error: unknown): string {
  const status = (error as { status?: number } | null)?.status;
  const details = (error as { detail?: { code?: string; message?: string } } | null)?.detail;
  const raw = error instanceof Error ? error.message : String(error ?? '');
  if (details?.code === 'no_wireless') {
    return t('This router has no built-in Wi-Fi. Change the name on your separate access point (for example a Tenda).');
  }
  if (details?.code === 'no_eligible_wifi') {
    return t('No hotspot Wi-Fi on this router can be renamed safely.');
  }
  if (details?.code === 'not_verified') {
    return t('The router did not keep the new name. Refresh and try again.');
  }
  if (status === 503 || /could not reach|connect/i.test(raw)) {
    return t('Could not reach the router. Check that it is online and try again.');
  }
  if (status === 429) return raw || t('Too many renames. Try again later.');
  if (status === 504) return t('The router was slow to answer. Refresh in a minute to see the Wi-Fi name.');
  return raw || t('Could not change the Wi-Fi name.');
}
