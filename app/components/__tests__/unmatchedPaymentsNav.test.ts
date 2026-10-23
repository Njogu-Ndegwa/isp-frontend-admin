import { describe, expect, it } from 'vitest';
import { navGroups, adminNavGroups } from '../CollapsibleSidebar';
import { resellerGroups, adminGroups } from '../MobileSidebar';
import { FR } from '../../lib/locales/fr';

type Group = { items: { name: string; href: string }[] };
const hrefs = (groups: Group[]) => groups.flatMap((g) => g.items.map((i) => i.href));

describe('Unmatched Payments navigation', () => {
  it('appears in the reseller desktop sidebar right after Transactions', () => {
    const billing = navGroups.find((g) => g.id === 'billing')!;
    const order = billing.items.map((i) => i.href);
    expect(order.indexOf('/unmatched-payments')).toBe(order.indexOf('/transactions') + 1);
  });

  it('appears in the reseller mobile More menu under Billing & Customers', () => {
    const billing = resellerGroups.find((g) => g.label === 'Billing & Customers')!;
    expect(billing.items.map((i) => i.href)).toContain('/unmatched-payments');
  });

  it('is listed once per menu and not in the admin menus', () => {
    expect(hrefs(navGroups).filter((h) => h === '/unmatched-payments')).toHaveLength(1);
    expect(hrefs(resellerGroups).filter((h) => h === '/unmatched-payments')).toHaveLength(1);
    expect(hrefs(adminNavGroups)).not.toContain('/unmatched-payments');
    expect(hrefs(adminGroups)).not.toContain('/unmatched-payments');
  });

  it('has a French label', () => {
    expect(FR['Unmatched Payments']).toBeTruthy();
  });
});
