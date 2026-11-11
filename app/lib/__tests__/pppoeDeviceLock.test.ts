import { describe, expect, it } from 'vitest';
import { translate } from '../i18n';
import {
  allowNewRouterConfirm,
  deviceLockPendingNote,
  deviceLockResultMessage,
  deviceLockSummary,
} from '../pppoeDeviceLock';
import type { PppoeDeviceLockState } from '../types';

const en = (text: string, vars?: Record<string, string | number>) => translate('en', text, vars);
const fr = (text: string, vars?: Record<string, string | number>) => translate('fr', text, vars);

const MAC = '04:95:E6:11:22:33';

function state(over: Partial<PppoeDeviceLockState> = {}): PppoeDeviceLockState {
  return {
    customer_id: 7,
    pppoe_device_lock: false,
    pppoe_bound_mac: null,
    pppoe_bound_at: null,
    pppoe_lock_learn_after: null,
    pppoe_lock_applied_mac: null,
    pppoe_lock_router_pending: false,
    pppoe_lock_state: 'off',
    recent_rejections: [],
    ...over,
  };
}

describe('deviceLockSummary', () => {
  it('says the login works anywhere when off', () => {
    expect(deviceLockSummary(en, state())).toMatch(/any router/);
    expect(deviceLockSummary(en, null)).toMatch(/any router/);
  });

  it('says it is waiting while learning', () => {
    expect(deviceLockSummary(en, state({ pppoe_device_lock: true, pppoe_lock_state: 'learning' })))
      .toMatch(/first router that connects/);
  });

  it('names the bound MAC when locked, in English and French', () => {
    const locked = state({ pppoe_device_lock: true, pppoe_lock_state: 'locked', pppoe_bound_mac: MAC });
    expect(deviceLockSummary(en, locked)).toContain(MAC);
    const french = deviceLockSummary(fr, locked);
    expect(french).toContain(MAC);
    expect(french).toMatch(/Verrouillé/);
  });
});

describe('deviceLockPendingNote', () => {
  it('only shows while the router has not taken the change', () => {
    expect(deviceLockPendingNote(en, state())).toBeNull();
    expect(deviceLockPendingNote(en, state({ pppoe_lock_router_pending: true }))).toMatch(/automatically/);
  });
});

describe('deviceLockResultMessage', () => {
  it('reports the locked MAC, learning, off and new router', () => {
    const locked = state({ pppoe_device_lock: true, pppoe_lock_state: 'locked', pppoe_bound_mac: MAC });
    expect(deviceLockResultMessage(en, 'on', locked)).toBe(`Locked to router ${MAC}`);
    expect(deviceLockResultMessage(en, 'on', state({ pppoe_device_lock: true, pppoe_lock_state: 'learning' })))
      .toMatch(/locks in when/);
    expect(deviceLockResultMessage(en, 'off', state())).toBe('Device lock turned off');
    expect(deviceLockResultMessage(en, 'new-router', state())).toMatch(/next router/);
  });
});

describe('allowNewRouterConfirm', () => {
  it('names the device being released', () => {
    expect(allowNewRouterConfirm(en, state({ pppoe_bound_mac: MAC }))).toContain(MAC);
    expect(allowNewRouterConfirm(en, state())).toContain('the current router');
  });
});
