import { NextRequest, NextResponse } from 'next/server';
import { ASSISTANT_PATH, isAssistantHost } from './app/lib/standalone';

const CANONICAL_HOST = 'bitwavetechnologies.com';

const LEGACY_HOSTS = new Set([
  'isp-admin.bitwavetechnologies.com',
  'isp-admin.bitwavetechnologies.net',
  'www.bitwavetechnologies.com',
  'www.bitwavetechnologies.net',
]);

// Pages that sign a person in or get them back in: the assistant's own address
// keeps these, everything else on the matcher list sends people to the chat.
const ASSISTANT_KEEPS = new Set(['/signup']);

export function proxy(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0];
  const path = req.nextUrl.pathname;

  // Bitwave AI's own address is the assistant and nothing else: the marketing
  // site and the classic dashboard are not shown there, and it is kept out of
  // search results (the main site is what people should find).
  if (isAssistantHost(host)) {
    if (path === '/robots.txt') {
      return new NextResponse('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain', 'x-robots-tag': 'noindex' } });
    }
    if (path === ASSISTANT_PATH || ASSISTANT_KEEPS.has(path)) {
      const res = NextResponse.next();
      res.headers.set('x-robots-tag', 'noindex, nofollow');
      return res;
    }
    const url = req.nextUrl.clone();
    url.pathname = ASSISTANT_PATH;
    // a deep link to a chat (/?c=...) keeps its chat
    url.search = req.nextUrl.searchParams.get('c') ? `?c=${encodeURIComponent(req.nextUrl.searchParams.get('c')!)}` : '';
    return NextResponse.redirect(url, 307);
  }

  // A short address for the assistant on the main site: bitwavetechnologies.com/ai
  if (path === '/ai') {
    const url = req.nextUrl.clone();
    url.pathname = ASSISTANT_PATH;
    return NextResponse.redirect(url, 307);
  }

  // Only public, indexable pages are redirected to the canonical host so search
  // engines consolidate ranking signals there. App routes (/dashboard, /admin,
  // …) stay reachable on the legacy hosts — resellers with old bookmarks and
  // host-scoped sessions must not be logged out by a blanket redirect.
  if (!LEGACY_HOSTS.has(host) || path === ASSISTANT_PATH || path === '/dashboard' || path === '/admin') return NextResponse.next();

  const url = new URL(req.nextUrl.pathname + req.nextUrl.search, `https://${CANONICAL_HOST}`);
  return NextResponse.redirect(url, 301);
}

export const config = {
  // Static by Next's rules, so the solution pages are listed by hand: keep in
  // step with app/solutions/paths.ts. /ai, /assistant, /dashboard and /admin are
  // here for the assistant's own address (see above).
  matcher: [
    '/', '/demo', '/landing', '/pricing', '/signup', '/blog/:path*', '/robots.txt', '/sitemap.xml', '/llms.txt',
    '/hotspot-billing-system-kenya', '/pppoe-billing-system-kenya', '/mpesa-wifi-billing-kenya', '/wifi-billing-system-kenya',
    '/ai', '/assistant', '/dashboard', '/admin',
  ],
};
