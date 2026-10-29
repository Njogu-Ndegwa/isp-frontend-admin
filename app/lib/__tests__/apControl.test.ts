import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { translate } from '../i18n';
import { FR } from '../locales/fr';
import {
  apActionState, canManageAccessPoints, canViewAccessPoints, modeLabel, safeApReason,
} from '../apControl';
import type { AccessPoint, AuthUser } from '../types';

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

function ap(over: Partial<AccessPoint> = {}): AccessPoint {
  return {
    mac: 'C8:3A:35:AA:10:01', ip: '192.168.88.50', hostname: 'Tenda', vendor: 'Tenda',
    sources: ['arp'], router_mode_suspect: false, on_gateway: false,
    credential: {
      ap_mac: 'C8:3A:35:AA:10:01', vendor: 'Tenda', model: 'OAP1200V2', username: 'admin',
      has_password: true, login_method: 'md5', last_login_ok: true, locked: false,
      failed_login_count: 0, last_error: null, last_status: null, last_status_at: null,
      last_action: null, last_action_at: null,
    },
    detector: { needs_safe_ap: false, in_router_mode: false, dhcp_server_on: false, on_gateway: false },
    ...over,
  };
}

describe('who can see and control access points', () => {
  it('view is owner/admin/staff-with-view; manage needs routers.manage', () => {
    expect(canViewAccessPoints(OWNER)).toBe(true);
    expect(canViewAccessPoints(ADMIN)).toBe(true);
    expect(canViewAccessPoints(staff(['routers.view']))).toBe(true);
    expect(canViewAccessPoints(staff(['customers.view']))).toBe(false);
    expect(canManageAccessPoints(staff(['routers.view']))).toBe(false);
    expect(canManageAccessPoints(staff(['routers.view', 'routers.manage']))).toBe(true);
    expect(canViewAccessPoints(null)).toBe(false);
  });
});

describe('safe-AP reasoning', () => {
  it('flags router mode, own DHCP and on-gateway, else nothing', () => {
    expect(safeApReason(en, ap({ detector: { needs_safe_ap: true, in_router_mode: true, dhcp_server_on: false, on_gateway: false } }))).toContain('router mode');
    expect(safeApReason(en, ap({ detector: { needs_safe_ap: true, in_router_mode: false, dhcp_server_on: true, on_gateway: false } }))).toContain('DHCP');
    expect(safeApReason(en, ap({ on_gateway: true, detector: { needs_safe_ap: true, in_router_mode: false, dhcp_server_on: false, on_gateway: true } }))).toContain('on site');
    expect(safeApReason(en, ap())).toBeNull();
  });
});

describe('action button state', () => {
  it('is ready with a saved password', () => {
    expect(apActionState(en, ap())).toEqual({ disabled: false, hint: null });
  });
  it('needs a password first', () => {
    const state = apActionState(en, ap({ credential: null }));
    expect(state.disabled).toBe(true);
    expect(state.hint).toContain('password');
  });
  it('is disabled when locked, when busy, and when on the gateway', () => {
    expect(apActionState(en, ap({ credential: { ...ap().credential!, locked: true } })).hint).toContain('Locked');
    expect(apActionState(en, ap(), { busy: true }).hint).toContain('already running');
    expect(apActionState(en, ap({ on_gateway: true })).hint).toContain('gateway');
  });
  it('speaks French', () => {
    expect(modeLabel(fr, 'router')).toBe('Mode routeur');
    expect(fr('Make it a safe AP')).toBe('En faire un AP sûr');
  });
});

describe('French coverage', () => {
  it('every t() string in the access-point UI has a French translation', () => {
    const files = [
      join(__dirname, '..', 'apControl.ts'),
      join(__dirname, '..', '..', 'diagnostics', 'AccessPointsTab.tsx'),
    ];
    const keys = files.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'")),
    );
    expect(keys.length).toBeGreaterThan(20);
    const missing = keys.filter((key) => !(key in FR));
    expect(missing).toEqual([]);
  });
});
