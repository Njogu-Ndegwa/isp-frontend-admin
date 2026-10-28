import { describe, expect, it } from 'vitest';
import type { StaffPermissionCatalog } from '../types';
import {
  activityResult,
  applyPreset,
  grantablePermissions,
  groupPermissions,
  matchingPreset,
  togglePermission,
} from '../staffEditor';
import { DEMO_STAFF_CATALOG } from '../staffCatalog';

const CATALOG: StaffPermissionCatalog = {
  permissions: [
    { key: 'customers.view', label: 'View customers', description: '', group: 'Customers', sensitive: false },
    { key: 'routers.view', label: 'View routers', description: '', group: 'Network', sensitive: false },
    { key: 'customers.manage', label: 'Manage customers', description: '', group: 'Customers', sensitive: false },
    { key: 'money.withdraw', label: 'Withdraw', description: '', group: 'Money', sensitive: true },
    { key: 'staff.manage', label: 'Manage staff', description: '', group: 'Account', sensitive: true },
  ],
  presets: [
    { key: 'tech', label: 'Technician', description: '', permissions: ['routers.view', 'customers.view'] },
    { key: 'bad', label: 'Bad', description: '', permissions: ['customers.view', 'staff.manage'] },
  ],
  owner_only: ['staff.manage'],
};

describe('staff permission editor helpers', () => {
  it('never offers owner-only permissions', () => {
    expect(grantablePermissions(CATALOG).map((p) => p.key)).not.toContain('staff.manage');
    expect(grantablePermissions(null)).toEqual([]);
  });

  it('groups permissions in catalog order', () => {
    const groups = groupPermissions(CATALOG);
    expect(groups.map((g) => g.group)).toEqual(['Customers', 'Network', 'Money']);
    expect(groups[0].permissions.map((p) => p.key)).toEqual(['customers.view', 'customers.manage']);
  });

  it('replaces the selection with a preset, dropping owner-only keys', () => {
    expect(applyPreset(CATALOG.presets[0], CATALOG)).toEqual(['routers.view', 'customers.view']);
    expect(applyPreset(CATALOG.presets[1], CATALOG)).toEqual(['customers.view']);
  });

  it('toggles a permission on and off', () => {
    expect(togglePermission(['a'], 'b')).toEqual(['a', 'b']);
    expect(togglePermission(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('finds the preset matching the selection exactly, in any order', () => {
    expect(matchingPreset(['customers.view', 'routers.view'], CATALOG.presets)?.key).toBe('tech');
    expect(matchingPreset(['customers.view'], CATALOG.presets)).toBeUndefined();
    expect(matchingPreset([], undefined)).toBeUndefined();
  });

  it('labels activity results by status code', () => {
    expect(activityResult(200)).toBe('success');
    expect(activityResult(204)).toBe('success');
    expect(activityResult(403)).toBe('denied');
    expect(activityResult(500)).toBe('failed');
    expect(activityResult(null)).toBe('unknown');
  });
});

describe('demo catalog', () => {
  it('keeps sensitive permissions out of the manager preset', () => {
    const sensitive = DEMO_STAFF_CATALOG.permissions.filter((p) => p.sensitive).map((p) => p.key);
    expect(sensitive).toEqual(expect.arrayContaining([
      'money.withdraw', 'payment_methods.manage', 'settlement.manage', 'subscription.manage', 'transactions.manage',
    ]));
    const manager = DEMO_STAFF_CATALOG.presets.find((p) => p.key === 'manager')!;
    expect(manager.permissions.some((k) => sensitive.includes(k))).toBe(false);
    expect(DEMO_STAFF_CATALOG.permissions.map((p) => p.key)).not.toContain('staff.manage');
  });
});
