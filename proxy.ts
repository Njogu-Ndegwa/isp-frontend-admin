import { NextRequest, NextResponse } from 'next/server';

const CANONICAL_HOST = 'bitwavetechnologies.com';

const LEGACY_HOSTS = new Set([
  'isp-admin.bitwavetechnologies.com',
  'isp-admin.bitwavetechnologies.net',
  'www.bitwavetechnologies.com',
  'www.bitwavetechnologies.net',
]);

// Only public, indexable pages are redirected to the canonical host so search
// engines consolidate ranking signals there. App routes (/dashboard, /admin,
// …) stay reachable on the legacy hosts — resellers with old bookmarks and
// host-scoped sessions must not be logged out by a blanket redirect.
export function proxy(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0];
  if (!LEGACY_HOSTS.has(host)) return NextResponse.next();

  const url = new URL(req.nextUrl.pathname + req.nextUrl.search, `https://${CANONICAL_HOST}`);
  return NextResponse.redirect(url, 301);
}

export const config = {
  matcher: ['/', '/landing', '/signup', '/blog/:path*', '/robots.txt', '/sitemap.xml'],
};
