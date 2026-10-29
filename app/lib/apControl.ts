import type { TFunction } from './i18n';
import { hasPermission, PERMISSIONS } from './permissions';
import type { AccessPoint, ApStatus } from './types';

/** Whether AP control is switched on for this user by the backend
 *  (AP_CONTROL_ENABLED_FOR). Admins always; others only once it is opened to
 *  "all". The backend reports this per-user in feature_flags.ap_control. */
export function apControlEnabled(user: { role?: string; feature_flags?: { ap_control?: boolean } | null } | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.feature_flags?.ap_control === true;
}

/** Reading or controlling an access point is a router "manage"/"view" action,
 *  and the feature must be switched on for this user. */
export function canViewAccessPoints(user: Parameters<typeof hasPermission>[0]): boolean {
  if (!apControlEnabled(user as { role?: string; feature_flags?: { ap_control?: boolean } | null })) return false;
  return hasPermission(user, PERMISSIONS.routersView) || hasPermission(user, PERMISSIONS.routersManage);
}

export function canManageAccessPoints(user: Parameters<typeof hasPermission>[0]): boolean {
  return hasPermission(user, PERMISSIONS.routersManage);
}

/** Human label for the AP's working mode. */
export function modeLabel(t: TFunction, mode: ApStatus['mode'] | null | undefined): string {
  switch (mode) {
    case 'ap': return t('AP mode');
    case 'router': return t('Router mode');
    case 'repeater': return t('Repeater mode');
    case 'wisp': return t('WISP mode');
    case 'client': return t('Client mode');
    default: return t('Unknown');
  }
}

/** One short line saying why this AP should be made safe (or that it is fine). */
export function safeApReason(t: TFunction, ap: AccessPoint): string | null {
  const d = ap.detector;
  if (ap.on_gateway || d.on_gateway) {
    return t('This AP sits on the router gateway address and cannot be reached through the router. Fix on site.');
  }
  if (d.in_router_mode) {
    return t('This AP is in router mode behind the hotspot, which breaks logins. Make it a plain AP.');
  }
  if (d.dhcp_server_on) {
    return t('This AP is running its own DHCP server, which fights the router. Turn it off.');
  }
  return null;
}

/** Can we attempt a control action on this AP right now? */
export function apActionState(
  t: TFunction,
  ap: AccessPoint,
  opts: { busy?: boolean } = {},
): { disabled: boolean; hint: string | null } {
  if (opts.busy) return { disabled: true, hint: t('An access-point action is already running on this router.') };
  if (ap.on_gateway || ap.detector.on_gateway) {
    return { disabled: true, hint: t('This AP is on the router gateway and must be fixed on site.') };
  }
  if (!ap.credential?.has_password) {
    return { disabled: true, hint: t('Save the AP admin password first.') };
  }
  if (ap.credential.locked) {
    return { disabled: true, hint: t('Locked after too many wrong passwords. Save the password again.') };
  }
  return { disabled: false, hint: null };
}
