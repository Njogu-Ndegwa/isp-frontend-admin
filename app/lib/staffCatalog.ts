/**
 * Local copy of the staff permission catalog, used in demo mode only. Real
 * accounts always load it from GET /api/staff/permissions, which is the
 * source of truth (the backend may add keys this list doesn't know).
 */
import type { StaffPermissionCatalog, StaffPermissionDef } from './types';
import { SENSITIVE_PERMISSIONS } from './permissions';

const def = (key: string, label: string, description: string, group: string): StaffPermissionDef => ({
  key, label, description, group, sensitive: SENSITIVE_PERMISSIONS.includes(key),
});

const PERMISSION_DEFS: StaffPermissionDef[] = [
  def('dashboard.view', 'View dashboard', 'See revenue and network totals on the dashboard, and portal ad stats.', 'General'),
  def('customers.view', 'View customers', 'See customers, their plans and status.', 'Customers'),
  def('customers.manage', 'Manage customers', 'Add, edit and delete customers, change expiry and grace.', 'Customers'),
  def('plans.manage', 'Manage plans', 'Create and edit plans.', 'Customers'),
  def('vouchers.generate', 'Generate vouchers', 'Create hotspot vouchers.', 'Customers'),
  def('routers.view', 'View routers', 'See routers, diagnostics and walled garden.', 'Network'),
  def('routers.manage', 'Manage routers', 'Add, edit, reboot and configure routers.', 'Network'),
  def('transactions.view', 'View transactions', 'See customer payments.', 'Money'),
  def('transactions.manage', 'Manage transactions', 'Attribute unmatched payments and change transactions.', 'Money'),
  def('account_statement.view', 'View account statement', 'See payouts and charges.', 'Money'),
  def('money.withdraw', 'Withdraw money', 'Withdraw the Bitwave balance.', 'Money'),
  def('payment_methods.manage', 'Manage payment methods', 'Change where customer payments and payouts go.', 'Money'),
  def('settlement.manage', 'Change settlement mode', 'Switch between direct payments and Bitwave collection.', 'Money'),
  def('subscription.manage', 'Manage subscription', 'Pay and manage the Bitwave subscription.', 'Account'),
  def('messaging.send', 'Send messages', 'Send SMS to customers.', 'Messaging'),
  def('messaging.settings', 'Messaging settings', 'Change SMS settings and templates.', 'Messaging'),
  def('portal.manage', 'Customize portal', 'Change the captive portal look and manage portal ads.', 'Account'),
];

export const DEMO_STAFF_CATALOG: StaffPermissionCatalog = {
  permissions: PERMISSION_DEFS,
  presets: [
    {
      key: 'technician',
      label: 'Technician',
      description: 'Routers and read-only customers.',
      permissions: ['routers.view', 'routers.manage', 'customers.view'],
    },
    {
      key: 'cashier',
      label: 'Cashier',
      description: 'Customers, vouchers and payments (read-only).',
      permissions: ['customers.view', 'vouchers.generate', 'transactions.view'],
    },
    {
      key: 'manager',
      label: 'Manager',
      description: 'Everything except money and account settings.',
      permissions: PERMISSION_DEFS.filter((p) => !p.sensitive).map((p) => p.key),
    },
  ],
  owner_only: ['staff.manage'],
};
