import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../../lib/types';
import { navGroups } from '../CollapsibleSidebar';
import { resellerGroups } from '../MobileSidebar';
import { resellerNavItems, staffBackfillNavItems } from '../MobileBottomNav';
import { settingsNav } from '../../settings/nav';
import { buildBottomNavItems, filterNavGroups, filterNavItems } from '../../lib/permissions';
import { FR } from '../../lib/locales/fr';

const OWNER: AuthUser = { id: 652, email: 'owner@example.test', role: 'reseller', organization_name: 'Kwetu WiFi' };

const staff = (permissions: string[]): AuthUser => ({
  ...OWNER,
  staff: { id: 12, name: 'Jane', email: 'jane@example.test', permissions },
});

type Group = { items: { href: string }[] };
const hrefs = (groups: Group[]) => groups.flatMap((g) => g.items.map((i) => i.href));

describe('Staff settings link', () => {
  it('is in the sidebars and the settings hub for owners', () => {
    expect(hrefs(filterNavGroups(navGroups, OWNER))).toContain('/settings/staff');
    expect(hrefs(filterNavGroups(resellerGroups, OWNER))).toContain('/settings/staff');
    expect(filterNavItems(settingsNav, OWNER).map((s) => s.href)).toContain('/settings/staff');
  });

  it('is hidden from staff, even ones with every other permission', () => {
    const manager = staff([
      'dashboard.view', 'customers.view', 'customers.manage', 'plans.manage', 'vouchers.generate',
      'routers.view', 'routers.manage', 'transactions.view', 'transactions.manage', 'account_statement.view',
      'messaging.send', 'portal.manage', 'payment_methods.manage', 'subscription.manage',
    ]);
    expect(hrefs(filterNavGroups(navGroups, manager))).not.toContain('/settings/staff');
    expect(hrefs(filterNavGroups(navGroups, manager))).not.toContain('/settings/profile');
    expect(filterNavItems(settingsNav, manager).map((s) => s.href)).not.toContain('/settings/staff');
    expect(filterNavItems(settingsNav, manager).map((s) => s.href)).toContain('/settings/payment-methods');
  });

  it('has a French label', () => {
    expect(FR['Staff']).toBeTruthy();
  });
});

describe('Sidebar filtering for a technician', () => {
  const tech = staff(['routers.view', 'routers.manage', 'customers.view']);

  it('shows only their pages', () => {
    const visible = hrefs(filterNavGroups(navGroups, tech));
    expect(visible).toEqual(expect.arrayContaining(['/customers', '/access-credentials', '/routers', '/diagnostics', '/walled-garden']));
    for (const hidden of ['/dashboard', '/plans', '/transactions', '/account-statement', '/messaging', '/settings/payment-methods']) {
      expect(visible).not.toContain(hidden);
    }
  });

  it('drops the Settings group entirely', () => {
    expect(filterNavGroups(navGroups, tech).some((g) => g.id === 'settings')).toBe(false);
  });
});

describe('Mobile bottom nav', () => {
  it('keeps the five standard tabs for owners', () => {
    const items = buildBottomNavItems(resellerNavItems, staffBackfillNavItems, OWNER);
    expect(items.map((i) => i.href)).toEqual(['/dashboard', '/customers', '/transactions', '/routers', '/settings']);
  });

  it('backfills tabs staff can open, never more than five, never duplicates', () => {
    const cashier = staff(['customers.view', 'vouchers.generate', 'transactions.view', 'account_statement.view']);
    const items = buildBottomNavItems(resellerNavItems, staffBackfillNavItems, cashier).map((i) => i.href);
    expect(items).toEqual(['/customers', '/transactions', '/vouchers', '/account-statement']);
    expect(new Set(items).size).toBe(items.length);
    expect(items.length).toBeLessThanOrEqual(5);
  });

  it('keeps Settings as the last tab when backfilling', () => {
    const tech = staff(['routers.view', 'customers.view', 'portal.manage', 'messaging.send', 'plans.manage', 'vouchers.generate']);
    const items = buildBottomNavItems(resellerNavItems, staffBackfillNavItems, tech).map((i) => i.href);
    expect(items).toHaveLength(5);
    expect(items[items.length - 1]).toBe('/settings');
    expect(items.slice(0, 2)).toEqual(['/customers', '/routers']);
  });

  it('is empty for staff with no pages', () => {
    expect(buildBottomNavItems(resellerNavItems, staffBackfillNavItems, staff([]))).toEqual([]);
  });
});

describe('Ads link', () => {
  it('shows for owners and for staff who manage the portal or view the dashboard', () => {
    for (const user of [OWNER, staff(['portal.manage']), staff(['dashboard.view'])]) {
      expect(hrefs(filterNavGroups(navGroups, user))).toContain('/ads');
      expect(hrefs(filterNavGroups(resellerGroups, user))).toContain('/ads');
    }
  });

  it('is hidden from staff without either permission', () => {
    const tech = staff(['routers.view', 'routers.manage', 'customers.view']);
    expect(hrefs(filterNavGroups(navGroups, tech))).not.toContain('/ads');
    expect(hrefs(filterNavGroups(resellerGroups, tech))).not.toContain('/ads');
  });
});
