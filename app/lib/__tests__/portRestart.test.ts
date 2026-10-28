import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { translate } from '../i18n';
import { FR } from '../locales/fr';
import { canRestartPorts, restartBlockedReason, restartButtonState } from '../portRestart';
import type { AuthUser, PortRestartOption, PortRestartReasonCode } from '../types';

const en = (text: string, vars?: Record<string, string | number>) => translate('en', text, vars);
const fr = (text: string, vars?: Record<string, string | number>) => translate('fr', text, vars);

const OWNER: AuthUser = { id: 652, email: 'owner@example.test', role: 'reseller', organization_name: 'Kwetu WiFi' };
const ADMIN: AuthUser = { id: 1, email: 'admin@example.test', role: 'admin', organization_name: 'Bitwave' };
function staff(permissions: string[]): AuthUser {
  return {
    ...OWNER,
    staff: {
      id: 12, name: 'Jane', email: 'jane@example.test', phone: null, permissions,
      parent_reseller_id: 652, business_name: 'Kwetu WiFi',
    },
  };
}

function option(over: Partial<PortRestartOption> = {}): PortRestartOption {
  return {
    name: 'ether3', eligible: true, reason_code: null, reason: null,
    method: 'bounce', poe_out: null, bridge: 'bridge', ...over,
  };
}

describe('who sees the Restart action', () => {
  it('owners and admins always; staff only with Manage routers', () => {
    expect(canRestartPorts(OWNER)).toBe(true);
    expect(canRestartPorts(ADMIN)).toBe(true);
    expect(canRestartPorts(staff(['routers.view', 'routers.manage']))).toBe(true);
    expect(canRestartPorts(staff(['routers.view']))).toBe(false);
    expect(canRestartPorts(null)).toBe(false);
  });
});

describe('restart button state', () => {
  it('is ready for an eligible port and says how it restarts', () => {
    expect(restartButtonState(en, option())).toEqual({ disabled: false, hint: 'Turns this port off and on again.' });
    expect(restartButtonState(en, option({ method: 'poe', poe_out: 'auto-on' })).hint).toContain('PoE');
  });

  it.each<[PortRestartReasonCode, string]>([
    ['wan', 'internet (WAN) port'],
    ['management', 'management connection'],
    ['api_ingress', 'Bitwave reaches the router'],
    ['not_ethernet', 'Only ethernet'],
    ['not_lan', 'hotspot, plain or PPPoE'],
    ['disabled', 'turned off'],
    ['not_found', 'not found'],
  ])('disables a %s port with a reason', (code, text) => {
    const state = restartButtonState(en, option({ eligible: false, reason_code: code, method: null }));
    expect(state.disabled).toBe(true);
    expect(state.hint).toContain(text);
  });

  it('stays disabled while checking, when unknown, and while another restart runs', () => {
    expect(restartButtonState(en, option(), { loadingOptions: true }).disabled).toBe(true);
    expect(restartButtonState(en, undefined).hint).toContain('Could not check');
    expect(restartButtonState(en, option(), { busy: true }).hint).toContain('already running');
  });

  it('speaks French', () => {
    expect(restartBlockedReason(fr, 'wan')).toContain('port internet (WAN)');
    expect(fr('Devices on this port will drop for about 10 seconds')).toContain('10 secondes');
    expect(fr('Restart {port}?', { port: 'ether3' })).toBe('Redémarrer ether3 ?');
  });
});

describe('French coverage', () => {
  it('every t() string in the port restart UI has a French translation', () => {
    const files = [
      join(__dirname, '..', 'portRestart.ts'),
      join(__dirname, '..', '..', 'diagnostics', 'PortRestartButton.tsx'),
    ];
    const keys = files.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'")),
    );
    expect(keys.length).toBeGreaterThan(15);
    const missing = keys.filter((key) => !(key in FR));
    expect(missing).toEqual([]);
  });
});
