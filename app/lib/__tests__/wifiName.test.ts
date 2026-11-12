import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api';
import { translate } from '../i18n';
import { FR } from '../locales/fr';
import type { AuthUser } from '../types';
import {
  canRenameWifi,
  defaultWifiName,
  sanitizeWifiName,
  wifiErrorMessage,
  wifiNameError,
  wifiReasonLabel,
} from '../wifiName';

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

describe('who can rename the Wi-Fi', () => {
  it('owners always; staff only with Manage routers', () => {
    expect(canRenameWifi(OWNER)).toBe(true);
    expect(canRenameWifi(staff(['routers.view', 'routers.manage']))).toBe(true);
    expect(canRenameWifi(staff(['routers.view']))).toBe(false);
    expect(canRenameWifi(null)).toBe(false);
  });
});

describe('Wi-Fi name rules (same as the backend)', () => {
  it('accepts 1-32 printable ASCII characters', () => {
    expect(wifiNameError(en, 'Mama Mboga WiFi')).toBeNull();
    expect(wifiNameError(en, `Joe's "Free" $Wi-Fi\\`)).toBeNull();
    expect(wifiNameError(en, 'A'.repeat(32))).toBeNull();
  });

  it('rejects empty, too long and non-ASCII names', () => {
    expect(wifiNameError(en, '   ')).toBe('Type a Wi-Fi name.');
    expect(wifiNameError(en, 'A'.repeat(33))).toContain('32');
    expect(wifiNameError(en, 'Café')).toContain('English letters');
  });

  it('sanitizes names for new routers like the setup script does', () => {
    expect(sanitizeWifiName("  Joe's   Café  ")).toBe("Joe's Cafe");
    expect(sanitizeWifiName('Kevo "The Boss" $Net\\')).toBe('Kevo The Boss Net');
    expect(sanitizeWifiName('Ñandú Señor Networks Limited Company Kenya')).toBe('Nandu Senor Networks Limited Com');
    expect(sanitizeWifiName('中文')).toBe('');
  });

  it('defaults to the business name, then organisation, then Bitwave WiFi', () => {
    expect(defaultWifiName({ business_name: 'Dreamplug Networks', organization_name: 'Dennis' })).toBe('Dreamplug Networks');
    expect(defaultWifiName({ business_name: '', organization_name: 'Kamau Hotspot' })).toBe('Kamau Hotspot');
    expect(defaultWifiName({ business_name: null, organization_name: 'x@example.com' })).toBe('Bitwave WiFi');
    expect(defaultWifiName(null)).toBe('Bitwave WiFi');
  });
});

describe('messages', () => {
  it('explains a router without built-in Wi-Fi', () => {
    const err = new ApiError('no wifi', 409, { code: 'no_wireless', message: 'no wifi' });
    expect(wifiErrorMessage(en, err)).toContain('separate access point');
  });

  it('explains an unreachable router and a rename that did not stick', () => {
    expect(wifiErrorMessage(en, new ApiError('Could not reach router R1.', 503))).toContain('Could not reach the router');
    expect(wifiErrorMessage(en, new ApiError('x', 502, { code: 'not_verified' }))).toContain('did not keep');
  });

  it('labels the interfaces it leaves alone', () => {
    expect(wifiReasonLabel(en, 'client_mode')).toContain('internet link');
    expect(wifiReasonLabel(en, 'virtual')).toContain('own name');
    expect(wifiReasonLabel(en, null)).toBe('');
  });

  it('speaks French', () => {
    expect(fr('Wi-Fi name')).toBe('Nom du Wi-Fi');
    expect(fr('Wi-Fi renamed to "{name}". Devices must now join "{name}".', { name: 'Kwetu' })).toContain('« Kwetu »');
  });
});

describe('French coverage', () => {
  it('every t() string in the Wi-Fi name UI has a French translation', () => {
    const files = [
      join(__dirname, '..', 'wifiName.ts'),
      join(__dirname, '..', '..', 'components', 'RouterWifiName.tsx'),
    ];
    const keys = files.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'")),
    );
    expect(keys.length).toBeGreaterThanOrEqual(20);
    expect(keys.filter((key) => !(key in FR))).toEqual([]);
  });
});
