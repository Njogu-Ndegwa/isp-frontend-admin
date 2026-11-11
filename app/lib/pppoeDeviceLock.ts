import type { TFunction } from './i18n';
import type { PppoeDeviceLockState } from './types';

/**
 * PPPoE device lock (backend: app/services/pppoe_device_lock.py).
 *
 * With the lock on, the customer's PPPoE login only works from one router: the
 * router's MAC is written to the PPP secret's caller-id, so the same username
 * and password are refused on any other device. The MAC is learned from the
 * customer's first connection after the lock is turned on, or after "Allow new
 * router" clears it.
 */

/** One line under the card title, in each state. */
export function deviceLockSummary(t: TFunction, state: PppoeDeviceLockState | null): string {
  if (!state || state.pppoe_lock_state === 'off') {
    return t('Off: this PPPoE login works from any router.');
  }
  if (state.pppoe_lock_state === 'learning') {
    return t('Waiting for the customer\'s router to connect. The first router that connects will be locked in.');
  }
  return t('Locked to router {mac}. The login is refused on any other router.', {
    mac: state.pppoe_bound_mac ?? '',
  });
}

/** Shown while the router has not taken the change yet (it was unreachable). */
export function deviceLockPendingNote(t: TFunction, state: PppoeDeviceLockState | null): string | null {
  if (!state?.pppoe_lock_router_pending) return null;
  return t('The router has not been updated yet. It will be updated automatically when it is reachable.');
}

/** Toast after a change. */
export function deviceLockResultMessage(
  t: TFunction,
  action: 'on' | 'off' | 'new-router',
  state: PppoeDeviceLockState,
): string {
  if (action === 'off') return t('Device lock turned off');
  if (action === 'new-router') {
    return t('New router allowed. The next router that connects will be locked in.');
  }
  if (state.pppoe_lock_state === 'locked' && state.pppoe_bound_mac) {
    return t('Locked to router {mac}', { mac: state.pppoe_bound_mac });
  }
  return t('Device lock on. It locks in when the customer\'s router connects.');
}

/** Confirmation text for "Allow new router". */
export function allowNewRouterConfirm(t: TFunction, state: PppoeDeviceLockState | null): string {
  return t(
    'Allow a new router for this customer? The lock to {mac} is cleared and the next router that connects is locked in instead.',
    { mac: state?.pppoe_bound_mac ?? t('the current router') },
  );
}
