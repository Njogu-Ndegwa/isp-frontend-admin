import { describe, expect, it } from 'vitest';
import { staffPermissionLabels, validateNewPassword } from '../staffProfile';

describe('staffPermissionLabels', () => {
  it('labels known permissions in catalog order', () => {
    expect(staffPermissionLabels(['routers.manage', 'customers.view', 'routers.view']))
      .toEqual(['View customers', 'View routers', 'Manage routers']);
  });

  it('keeps unknown keys from a newer backend and never shows staff.manage', () => {
    expect(staffPermissionLabels(['ads.manage', 'staff.manage', 'customers.view']))
      .toEqual(['View customers', 'ads.manage']);
    expect(staffPermissionLabels([])).toEqual([]);
  });
});

describe('validateNewPassword', () => {
  const ok = { current_password: 'old-pass', new_password: 'new-pass1', confirm_password: 'new-pass1' };

  it('accepts a valid change', () => {
    expect(validateNewPassword(ok)).toBeNull();
  });

  it('mirrors the backend rules', () => {
    expect(validateNewPassword({ ...ok, current_password: '' })).toBe('Please fill in all password fields');
    expect(validateNewPassword({ ...ok, new_password: 'abc', confirm_password: 'abc' }))
      .toBe('New password must be at least 6 characters');
    expect(validateNewPassword({ ...ok, new_password: 'é'.repeat(40), confirm_password: 'é'.repeat(40) }))
      .toBe('New password is too long');
    expect(validateNewPassword({ ...ok, new_password: 'old-pass', confirm_password: 'old-pass' }))
      .toBe('New password must be different from the current password');
    expect(validateNewPassword({ ...ok, confirm_password: 'other-pass' })).toBe('New passwords do not match');
  });
});
