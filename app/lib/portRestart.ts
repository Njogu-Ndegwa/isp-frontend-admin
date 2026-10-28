import type { TFunction } from './i18n';
import { hasPermission, PERMISSIONS } from './permissions';
import type { PortRestartOption, PortRestartReasonCode } from './types';

/** Restarting a port is a router "manage" action (backend: routers.manage). */
export function canRestartPorts(user: Parameters<typeof hasPermission>[0]): boolean {
  return hasPermission(user, PERMISSIONS.routersManage);
}

/** Why a port can't be restarted, in the reseller's language. */
export function restartBlockedReason(t: TFunction, code: PortRestartReasonCode | null | undefined): string {
  switch (code) {
    case 'wan':
      return t('This is the internet (WAN) port. Restarting it would take the whole router offline.');
    case 'management':
      return t('This is the management connection to Bitwave. Restarting it would cut the router off.');
    case 'api_ingress':
      return t('Bitwave reaches the router through this port, so it cannot be restarted remotely.');
    case 'not_ethernet':
      return t('Only ethernet ports can be restarted.');
    case 'not_lan':
      return t('Only ports in a hotspot, plain or PPPoE network can be restarted.');
    case 'disabled':
      return t('This port is turned off on the router.');
    case 'not_found':
      return t('This port was not found on the router.');
    default:
      return t('Could not check this port. Refresh and try again.');
  }
}

export interface RestartButtonState {
  disabled: boolean;
  /** Tooltip / helper text; null when the button is ready. */
  hint: string | null;
}

export function restartButtonState(
  t: TFunction,
  option: PortRestartOption | undefined,
  opts: { loadingOptions?: boolean; busy?: boolean } = {},
): RestartButtonState {
  if (opts.busy) return { disabled: true, hint: t('A port restart is already running on this router.') };
  if (opts.loadingOptions) return { disabled: true, hint: t('Checking which ports can be restarted...') };
  if (!option) return { disabled: true, hint: restartBlockedReason(t, null) };
  if (!option.eligible) return { disabled: true, hint: restartBlockedReason(t, option.reason_code) };
  return {
    disabled: false,
    hint: option.method === 'poe'
      ? t('Turns the PoE power on this port off and on again.')
      : t('Turns this port off and on again.'),
  };
}
