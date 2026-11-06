import { describe, expect, it } from 'vitest';
import { isAdminAllowedPath } from '../adminPaths';

describe('reseller-side pages an admin can open', () => {
  it('lets an admin open Diagnostics, for the Access points tab', () => {
    expect(isAdminAllowedPath('/diagnostics')).toBe(true);
  });

  it('keeps the pages admins could already open', () => {
    for (const path of ['/shop', '/routers', '/routers/563/live', '/ads', '/ads/12', '/advertisers']) {
      expect(isAdminAllowedPath(path)).toBe(true);
    }
  });

  it('still sends other reseller pages to /admin', () => {
    for (const path of ['/dashboard', '/customers', '/plans', '/settings']) {
      expect(isAdminAllowedPath(path)).toBe(false);
    }
  });
});
