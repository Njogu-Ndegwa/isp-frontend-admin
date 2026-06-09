export const WIDTHS = [320, 375, 768, 834, 1024, 1280];

// Reachable as the reseller demo user (role: 'reseller')
export const RESELLER_PAGES = [
  '/dashboard', '/customers', '/customers/register', '/transactions',
  '/routers', '/pppoe-monitor', '/diagnostics', '/plans', '/plans/create',
  '/vouchers', '/access-credentials', '/access-credentials/create',
  '/account-statement', '/walled-garden', '/unmatched-payments',
  '/settings', '/settings/profile', '/settings/subscription',
  '/settings/subscription/payments', '/settings/subscription/invoices',
  '/settings/payment-methods', '/settings/portal-customization',
];

// Require the admin demo user (role: 'admin')
export const ADMIN_PAGES = [
  '/admin', '/admin/leads', '/admin/leads/followups', '/admin/leads/analytics',
  '/admin/leads/sources', '/admin/resellers', '/admin/subscriptions',
  '/admin/subscriptions/revenue', '/admin/subscription-collections', '/shop',
];

// Public pages (own layouts, no sidebar) — lighter pass
export const PUBLIC_PAGES = ['/login', '/signup', '/landing'];
