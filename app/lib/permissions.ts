/**
 * Staff sub-user permissions.
 *
 * The backend is the source of truth and refuses anything a staff member may
 * not do (403 `staff_permission_denied`). The frontend only hides what they
 * can't use so they aren't shown buttons and pages that will fail.
 *
 * Owners (resellers) and admins can do everything. A staff member can do what
 * is in `user.staff.permissions`. `staff.manage` and owner-only pages are never
 * available to staff.
 *
 * Pure functions only, so they can be unit tested without React.
 */
import type { AuthUser } from './types';

/** Pseudo-permission for pages only the account owner may open. */
export const OWNER_ONLY = 'owner';

export const PERMISSIONS = {
  customersView: 'customers.view',
  customersManage: 'customers.manage',
  plansManage: 'plans.manage',
  vouchersGenerate: 'vouchers.generate',
  routersView: 'routers.view',
  routersManage: 'routers.manage',
  transactionsView: 'transactions.view',
  transactionsManage: 'transactions.manage',
  dashboardView: 'dashboard.view',
  accountStatementView: 'account_statement.view',
  messagingSend: 'messaging.send',
  messagingSettings: 'messaging.settings',
  portalManage: 'portal.manage',
  moneyWithdraw: 'money.withdraw',
  paymentMethodsManage: 'payment_methods.manage',
  settlementManage: 'settlement.manage',
  subscriptionManage: 'subscription.manage',
  staffManage: 'staff.manage',
} as const;

/** Never grantable to staff. */
export const OWNER_ONLY_PERMISSIONS: readonly string[] = [PERMISSIONS.staffManage];

/** Shown with a warning style in the staff editor; off by default. */
export const SENSITIVE_PERMISSIONS: readonly string[] = [
  PERMISSIONS.moneyWithdraw,
  PERMISSIONS.paymentMethodsManage,
  PERMISSIONS.settlementManage,
  PERMISSIONS.subscriptionManage,
  PERMISSIONS.transactionsManage,
];

type UserLike = Pick<AuthUser, 'role' | 'staff'> | null | undefined;

/** True when the signed-in user is a staff sub-user (not the owner or an admin). */
export function isStaffUser(user: UserLike): boolean {
  return !!user && user.role !== 'admin' && !!user.staff;
}

/** True for the account owner (reseller) — not staff, not admin. */
export function isAccountOwner(user: UserLike): boolean {
  return !!user && user.role !== 'admin' && !user.staff;
}

/**
 * Can this user do `permission`? Owners and admins: always. Staff: only when
 * it is in their list, and never for owner-only permissions.
 */
export function hasPermission(user: UserLike, permission: string): boolean {
  if (!user) return false;
  if (!isStaffUser(user)) return true;
  if (permission === OWNER_ONLY || OWNER_ONLY_PERMISSIONS.includes(permission)) return false;
  const granted = user.staff?.permissions;
  return Array.isArray(granted) && granted.includes(permission);
}

/** A page's requirement: one permission, or a list where any one is enough. */
export type PageRequirement = string | readonly string[];

/** Can this user do at least one of `requirement`? */
export function hasAnyPermission(user: UserLike, requirement: PageRequirement): boolean {
  return typeof requirement === 'string'
    ? hasPermission(user, requirement)
    : requirement.some((p) => hasPermission(user, p));
}

/** Ads: reading the list and stats needs either of these; changing ads needs portal.manage. */
export const ADS_VIEW_PERMISSIONS: readonly string[] = [PERMISSIONS.portalManage, PERMISSIONS.dashboardView];

/**
 * Reseller pages and the permission each one needs. Sub-paths inherit; the
 * first match wins, so specific paths go first. A `*` segment matches any one
 * segment (e.g. an id).
 */
export const PAGE_PERMISSIONS: ReadonlyArray<readonly [string, PageRequirement]> = [
  ['/dashboard', PERMISSIONS.dashboardView],
  ['/customers/register', PERMISSIONS.customersManage],
  ['/customers', PERMISSIONS.customersView],
  ['/plans', PERMISSIONS.plansManage],
  ['/transactions', PERMISSIONS.transactionsView],
  ['/unmatched-payments', PERMISSIONS.transactionsView],
  ['/vouchers', PERMISSIONS.vouchersGenerate],
  ['/compensation', PERMISSIONS.customersManage],
  ['/access-credentials/create', PERMISSIONS.customersManage],
  ['/access-credentials', PERMISSIONS.customersView],
  ['/ratings', PERMISSIONS.customersView],
  ['/account-statement', PERMISSIONS.accountStatementView],
  ['/messaging', PERMISSIONS.messagingSend],
  ['/routers', PERMISSIONS.routersView],
  ['/diagnostics', PERMISSIONS.routersView],
  ['/walled-garden', PERMISSIONS.routersView],
  // '/settings/profile' is open to everyone signed in: staff get their own
  // profile there (details, password, log out), owners the business profile.
  ['/settings/subscription', PERMISSIONS.subscriptionManage],
  ['/settings/payment-methods', PERMISSIONS.paymentMethodsManage],
  ['/settings/portal-customization', PERMISSIONS.portalManage],
  ['/settings/staff', OWNER_ONLY],
  ['/setup', OWNER_ONLY],
  ['/ads/new', PERMISSIONS.portalManage],
  ['/ads/*/edit', PERMISSIONS.portalManage],
  ['/ads', ADS_VIEW_PERMISSIONS],
  // Advertiser contacts are Bitwave-admin only (the API refuses resellers too).
  ['/advertisers', OWNER_ONLY],
];

/** Settings sub-pages, in the order the settings hub lists them. */
export const SETTINGS_PAGES: readonly string[] = [
  '/settings/profile',
  '/settings/subscription',
  '/settings/payment-methods',
  '/settings/portal-customization',
  '/settings/staff',
];

/** Where a staff member lands, in order of preference. */
export const LANDING_ORDER: readonly string[] = [
  '/dashboard',
  '/customers',
  '/routers',
  '/transactions',
  '/vouchers',
  '/plans',
  '/account-statement',
  '/messaging',
  '/access-credentials',
  '/diagnostics',
  '/walled-garden',
  '/unmatched-payments',
  '/compensation',
  '/settings/subscription',
  '/settings/payment-methods',
  '/settings/portal-customization',
  '/ads',
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  if (!prefix.includes('*')) return pathname === prefix || pathname.startsWith(`${prefix}/`);
  const want = prefix.split('/');
  const have = pathname.split('/');
  return have.length >= want.length && want.every((seg, i) => seg === '*' ? have[i] !== '' : seg === have[i]);
}

/** The permission a path needs, or undefined when it is not gated. */
export function requiredPermissionForPath(pathname: string): PageRequirement | undefined {
  const path = (pathname.split(/[?#]/)[0] || '/').replace(/\/+$/, '') || '/';
  for (const [prefix, permission] of PAGE_PERMISSIONS) {
    if (matchesPrefix(path, prefix)) return permission;
  }
  return undefined;
}

/**
 * Can this user open `pathname`? The settings hub (`/settings`) is open when
 * at least one settings page is. Ungated paths are open.
 */
export function canAccessPath(user: UserLike, pathname: string): boolean {
  if (!user) return false;
  if (!isStaffUser(user)) return true;
  const path = (pathname.split(/[?#]/)[0] || '/').replace(/\/+$/, '') || '/';
  if (path === '/settings') {
    return SETTINGS_PAGES.some((p) => canAccessPath(user, p));
  }
  const permission = requiredPermissionForPath(path);
  return permission === undefined || hasAnyPermission(user, permission);
}

/** First page this user can open, or null when a staff member has none. */
export function firstAccessiblePath(user: UserLike): string | null {
  if (!user) return null;
  if (!isStaffUser(user)) return '/dashboard';
  return LANDING_ORDER.find((p) => canAccessPath(user, p)) ?? null;
}

/** Drop nav items the user can't open. */
export function filterNavItems<T extends { href: string }>(items: readonly T[], user: UserLike): T[] {
  return items.filter((item) => canAccessPath(user, item.href));
}

/** Drop nav items the user can't open, and any group left empty. */
export function filterNavGroups<G extends { items: readonly { href: string }[] }>(
  groups: readonly G[],
  user: UserLike,
): G[] {
  return groups
    .map((group) => ({ ...group, items: filterNavItems(group.items, user) }))
    .filter((group) => group.items.length > 0);
}

/**
 * Mobile bottom-nav items: the main items the user can open, then (for staff
 * who lost some) extra pages they can open, up to `max` so the bar stays full.
 */
export function buildBottomNavItems<T extends { href: string }>(
  main: readonly T[],
  backfill: readonly T[],
  user: UserLike,
  max = 5,
): T[] {
  const visible = filterNavItems(main, user);
  if (!isStaffUser(user)) return visible.slice(0, max);
  const hrefs = new Set(visible.map((i) => i.href));
  for (const item of filterNavItems(backfill, user)) {
    if (visible.length >= max) break;
    if (hrefs.has(item.href)) continue;
    // Keep Settings (when present) as the last tab.
    const settingsIndex = visible.findIndex((i) => i.href === '/settings');
    if (settingsIndex >= 0) visible.splice(settingsIndex, 0, item);
    else visible.push(item);
    hrefs.add(item.href);
  }
  return visible.slice(0, max);
}

/** The label shown for a staff session, e.g. in the banner and account menu. */
export function staffBusinessName(user: Pick<AuthUser, 'staff' | 'business_name' | 'organization_name'> | null | undefined): string {
  if (!user) return '';
  return user.staff?.business_name || user.business_name || user.organization_name || '';
}

/** Window event the API client fires on a 403 `staff_permission_denied`;
 *  `detail` is `{ message, permission }`. */
export const STAFF_PERMISSION_DENIED_EVENT = 'staff-permission-denied';

/** `?reason=` values the login page explains after a forced sign-out. */
export const LOGIN_REASON_ACCESS_CHANGED = 'access_changed';
export const LOGIN_REASON_SESSION_REVOKED = 'session_revoked';

/** Login-page reason for a 401 error code, or null when it isn't a revocation. */
export function loginReasonForAuthCode(code: string | undefined | null): string | null {
  if (code === 'staff_session_revoked') return LOGIN_REASON_ACCESS_CHANGED;
  if (code === 'session_revoked') return LOGIN_REASON_SESSION_REVOKED;
  return null;
}

/** The `code` of an API error body: top level, or inside an object `detail`. */
export function errorCodeFromBody(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as { code?: unknown; detail?: unknown };
  if (typeof b.code === 'string') return b.code;
  if (b.detail && typeof b.detail === 'object' && !Array.isArray(b.detail)) {
    const code = (b.detail as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}
