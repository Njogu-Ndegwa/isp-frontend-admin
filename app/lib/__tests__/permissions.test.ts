import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../types';
import {
  OWNER_ONLY,
  canAccessPath,
  errorCodeFromBody,
  filterNavGroups,
  firstAccessiblePath,
  hasPermission,
  isAccountOwner,
  isStaffUser,
  loginReasonForAuthCode,
  requiredPermissionForPath,
  staffBusinessName,
} from '../permissions';

const OWNER: AuthUser = { id: 652, email: 'owner@example.test', role: 'reseller', organization_name: 'Kwetu WiFi' };
const OLD_BACKEND_OWNER: AuthUser = { ...OWNER, staff: undefined };
const ADMIN: AuthUser = { id: 1, email: 'admin@example.test', role: 'admin', organization_name: 'Bitwave' };

function staff(permissions: string[], over: Partial<NonNullable<AuthUser['staff']>> = {}): AuthUser {
  return {
    ...OWNER,
    email: 'jane@example.test',
    staff: {
      id: 12,
      name: 'Jane',
      email: 'jane@example.test',
      phone: null,
      permissions,
      parent_reseller_id: 652,
      business_name: 'Kwetu WiFi',
      ...over,
    },
  };
}

describe('who is signed in', () => {
  it('treats a null or absent staff block as the owner', () => {
    expect(isStaffUser({ ...OWNER, staff: null })).toBe(false);
    expect(isStaffUser(OLD_BACKEND_OWNER)).toBe(false);
    expect(isAccountOwner(OWNER)).toBe(true);
  });

  it('recognises staff and never treats admins as staff or owners', () => {
    expect(isStaffUser(staff([]))).toBe(true);
    expect(isAccountOwner(staff([]))).toBe(false);
    expect(isStaffUser(ADMIN)).toBe(false);
    expect(isAccountOwner(ADMIN)).toBe(false);
  });
});

describe('hasPermission', () => {
  it('lets owners and admins do everything, including owner-only things', () => {
    for (const user of [OWNER, OLD_BACKEND_OWNER, ADMIN]) {
      expect(hasPermission(user, 'money.withdraw')).toBe(true);
      expect(hasPermission(user, 'staff.manage')).toBe(true);
      expect(hasPermission(user, OWNER_ONLY)).toBe(true);
    }
  });

  it('lets staff do only what is in their list', () => {
    const tech = staff(['routers.view', 'routers.manage', 'customers.view']);
    expect(hasPermission(tech, 'routers.manage')).toBe(true);
    expect(hasPermission(tech, 'customers.view')).toBe(true);
    expect(hasPermission(tech, 'customers.manage')).toBe(false);
    expect(hasPermission(tech, 'money.withdraw')).toBe(false);
  });

  it('never gives staff owner-only permissions, even if the list says so', () => {
    const sneaky = staff(['staff.manage', OWNER_ONLY]);
    expect(hasPermission(sneaky, 'staff.manage')).toBe(false);
    expect(hasPermission(sneaky, OWNER_ONLY)).toBe(false);
  });

  it('denies when signed out or the list is malformed', () => {
    expect(hasPermission(null, 'customers.view')).toBe(false);
    const broken = staff([]);
    (broken.staff as unknown as { permissions: unknown }).permissions = 'customers.view';
    expect(hasPermission(broken, 'customers.view')).toBe(false);
  });

  it('accepts permission keys the frontend does not know yet', () => {
    expect(hasPermission(staff(['reports.export']), 'reports.export')).toBe(true);
  });
});

describe('page access', () => {
  it('maps pages and their sub-pages to permissions', () => {
    expect(requiredPermissionForPath('/dashboard')).toBe('dashboard.view');
    expect(requiredPermissionForPath('/customers/42')).toBe('customers.view');
    expect(requiredPermissionForPath('/customers/register')).toBe('customers.manage');
    expect(requiredPermissionForPath('/unmatched-payments')).toBe('transactions.view');
    expect(requiredPermissionForPath('/access-credentials')).toBe('customers.view');
    expect(requiredPermissionForPath('/access-credentials/create')).toBe('customers.manage');
    expect(requiredPermissionForPath('/access-credentials/9')).toBe('customers.view');
    expect(requiredPermissionForPath('/ratings')).toBe('customers.view');
    expect(requiredPermissionForPath('/settings/subscription/invoices')).toBe('subscription.manage');
    expect(requiredPermissionForPath('/settings/staff')).toBe(OWNER_ONLY);
    // Everyone signed in has a profile: staff get their own page there.
    expect(requiredPermissionForPath('/settings/profile')).toBeUndefined();
    expect(requiredPermissionForPath('/routers/')).toBe('routers.view');
    expect(requiredPermissionForPath('/customers-archive')).toBeUndefined();
    expect(requiredPermissionForPath('/shop')).toBeUndefined();
  });

  it('opens every page for owners', () => {
    expect(canAccessPath(OWNER, '/settings/staff')).toBe(true);
    expect(canAccessPath(OWNER, '/settings/profile')).toBe(true);
  });

  it('keeps staff out of pages they lack and owner-only pages', () => {
    const cashier = staff(['customers.view', 'vouchers.generate', 'transactions.view']);
    expect(canAccessPath(cashier, '/customers')).toBe(true);
    expect(canAccessPath(cashier, '/customers/7')).toBe(true);
    expect(canAccessPath(cashier, '/customers/register')).toBe(false);
    expect(canAccessPath(cashier, '/vouchers')).toBe(true);
    expect(canAccessPath(cashier, '/routers')).toBe(false);
    expect(canAccessPath(cashier, '/dashboard')).toBe(false);
    expect(canAccessPath(cashier, '/settings/profile')).toBe(true);
    expect(canAccessPath(cashier, '/unmatched-payments')).toBe(true);
    expect(canAccessPath(cashier, '/access-credentials')).toBe(true);
    expect(canAccessPath(cashier, '/access-credentials/create')).toBe(false);
    expect(canAccessPath(cashier, '/settings/staff')).toBe(false);
    expect(canAccessPath(cashier, '/setup')).toBe(false);
  });

  it('opens the settings hub for every staff member (their profile lives there)', () => {
    expect(canAccessPath(staff([]), '/settings')).toBe(true);
    expect(canAccessPath(staff(['customers.view']), '/settings')).toBe(true);
    expect(canAccessPath(staff(['customers.view']), '/settings/staff')).toBe(false);
    expect(canAccessPath(staff(['customers.view']), '/settings/payment-methods')).toBe(false);
  });

  it('picks the dashboard, else the first page staff can open, else none', () => {
    expect(firstAccessiblePath(OWNER)).toBe('/dashboard');
    expect(firstAccessiblePath(staff(['dashboard.view', 'routers.view']))).toBe('/dashboard');
    expect(firstAccessiblePath(staff(['routers.view', 'customers.view']))).toBe('/customers');
    expect(firstAccessiblePath(staff(['vouchers.generate']))).toBe('/vouchers');
    expect(firstAccessiblePath(staff([]))).toBeNull();
    expect(firstAccessiblePath(null)).toBeNull();
  });
});

describe('filterNavGroups', () => {
  const groups = [
    { id: 'a', items: [{ href: '/dashboard' }] },
    { id: 'b', items: [{ href: '/customers' }, { href: '/plans' }] },
    { id: 'c', items: [{ href: '/settings/profile' }, { href: '/settings/staff' }] },
  ];

  it('returns everything for owners', () => {
    expect(filterNavGroups(groups, OWNER)).toEqual(groups);
  });

  it('drops items staff cannot open and groups left empty', () => {
    const result = filterNavGroups(groups, staff(['customers.view']));
    expect(result).toEqual([
      { id: 'b', items: [{ href: '/customers' }] },
      { id: 'c', items: [{ href: '/settings/profile' }] },
    ]);
    expect(filterNavGroups([groups[0], groups[1]], staff(['customers.view'])))
      .toEqual([{ id: 'b', items: [{ href: '/customers' }] }]);
  });
});

describe('session error codes', () => {
  it('reads the code at the top level or inside detail', () => {
    expect(errorCodeFromBody({ detail: 'x', code: 'staff_session_revoked' })).toBe('staff_session_revoked');
    expect(errorCodeFromBody({ detail: { code: 'staff_permission_denied' } })).toBe('staff_permission_denied');
    expect(errorCodeFromBody({ detail: 'Not authenticated' })).toBeUndefined();
    expect(errorCodeFromBody(null)).toBeUndefined();
  });

  it('turns revocation codes into a login-page reason', () => {
    expect(loginReasonForAuthCode('staff_session_revoked')).toBe('access_changed');
    expect(loginReasonForAuthCode('session_revoked')).toBe('session_revoked');
    expect(loginReasonForAuthCode('impersonation_ended')).toBeNull();
    expect(loginReasonForAuthCode(undefined)).toBeNull();
  });
});

describe('staffBusinessName', () => {
  it('prefers the staff block, then the owner business', () => {
    expect(staffBusinessName(staff([]))).toBe('Kwetu WiFi');
    expect(staffBusinessName(staff([], { business_name: null }))).toBe('Kwetu WiFi');
    expect(staffBusinessName({ ...staff([], { business_name: null }), organization_name: 'Org' })).toBe('Org');
  });
});
