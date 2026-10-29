import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { translate } from '../i18n';
import { FR } from '../locales/fr';
import {
  canToggleExpiredRedirect,
  expiredRedirectDescription,
  expiredRedirectErrorMessage,
  expiredRedirectResultMessage,
} from '../pppoeExpiredRedirect';
import type { AuthUser } from '../types';

const en = (text: string, vars?: Record<string, string | number>) => translate('en', text, vars);
const fr = (text: string, vars?: Record<string, string | number>) => translate('fr', text, vars);

const OWNER: AuthUser = { id: 652, email: 'owner@example.test', role: 'reseller', organization_name: 'Kwetu WiFi' };
function staff(permissions: string[]): AuthUser {
  return {
    ...OWNER,
    staff: {
      id: 12, name: 'Jane', email: 'jane@example.test', phone: null, permissions,
      parent_reseller_id: 652, business_name: 'Kwetu WiFi',
    },
  };
}

describe('who can toggle the expired PPPoE payment page', () => {
  it('owners always; staff only with Manage routers', () => {
    expect(canToggleExpiredRedirect(OWNER)).toBe(true);
    expect(canToggleExpiredRedirect(staff(['routers.view', 'routers.manage']))).toBe(true);
    expect(canToggleExpiredRedirect(staff(['routers.view', 'customers.manage']))).toBe(false);
    expect(canToggleExpiredRedirect(null)).toBe(false);
  });
});

describe('messages', () => {
  it('describes both states', () => {
    expect(expiredRedirectDescription(en, true)).toContain('payment page');
    expect(expiredRedirectDescription(en, false)).toContain('disconnected');
  });

  it('reports how many waiting customers were released when turned off', () => {
    expect(expiredRedirectResultMessage(en, true)).toContain('will now see the payment page');
    expect(expiredRedirectResultMessage(en, false, 3)).toContain('3 expired customers');
    expect(expiredRedirectResultMessage(en, false, 0)).toContain('disconnected again');
  });

  it('turns router errors into something a reseller can act on', () => {
    expect(expiredRedirectErrorMessage(en, new Error('Router not updated: Failed to connect to router'))).toContain('Could not reach the router');
    expect(expiredRedirectErrorMessage(en, new Error('Router not updated: No free subnet for the expired-customer pool'))).toContain('no free address range');
    expect(expiredRedirectErrorMessage(en, new Error('Router not updated: /ip/pool/add: bad range'))).toBe('The router did not accept the change: /ip/pool/add: bad range');
  });

  it('speaks French', () => {
    expect(fr('Redirect expired PPPoE users to payment page')).toBe('Rediriger les clients PPPoE expirés vers la page de paiement');
    expect(expiredRedirectResultMessage(fr, false, 2)).toContain('2 clients expirés');
  });
});

describe('French coverage', () => {
  it('every t() string in the toggle has a French translation', () => {
    const files = [
      join(__dirname, '..', 'pppoeExpiredRedirect.ts'),
      join(__dirname, '..', '..', 'components', 'PppoeExpiredRedirectToggle.tsx'),
    ];
    const keys = files.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'")),
    );
    expect(keys.length).toBeGreaterThanOrEqual(10);
    expect(keys.filter((key) => !(key in FR))).toEqual([]);
  });
});
