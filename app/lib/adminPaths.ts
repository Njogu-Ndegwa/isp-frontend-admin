/** Reseller-side pages a Bitwave admin can open. Any other one sends them to /admin. */
export const ADMIN_ALLOWED_NON_ADMIN_PATHS = ['/shop', '/routers', '/ads', '/advertisers', '/diagnostics'];

export function isAdminAllowedPath(pathname: string): boolean {
  return ADMIN_ALLOWED_NON_ADMIN_PATHS.some((p) => pathname.startsWith(p));
}
