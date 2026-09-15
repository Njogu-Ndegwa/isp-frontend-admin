'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { trackContact } from '../lib/analytics';
import { WHATSAPP_DEFAULT_MESSAGE, whatsappHref } from '../landing/contact';
import ErrorBoundary from './ErrorBoundary';

const CollapsibleSidebar = dynamic(() => import('./CollapsibleSidebar'), { ssr: false });
const MobileBottomNav = dynamic(() => import('./MobileBottomNav'), { ssr: false });
const SubscriptionBlockedModal = dynamic(() => import('./SubscriptionBlockedModal'), { ssr: false });

const PUBLIC_PATHS = ['/', '/demo', '/login', '/landing', '/pricing', '/signup', '/forgot-password', '/reset-password'];
const PUBLIC_PREFIXES = ['/store', '/r', '/blog'];
const FULLSCREEN_AUTH_PATHS = ['/setup'];

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function DemoBanner() {
  const { logout } = useAuth();

  const exitDemo = () => {
    logout();
    // Use a hard navigation so the authenticated-layout guard cannot win a
    // race and send the just-logged-out visitor to /login first.
    window.location.assign('/');
  };

  return (
    <div
      className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-b border-amber-500/20 transition-[margin] duration-300 ease-in-out"
      style={{ marginLeft: 'var(--app-sidebar-w, 0px)' }}
    >
      <div className="max-w-7xl mx-auto px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-xs sm:text-sm text-amber-200/90 truncate">
            <span className="font-medium text-amber-400">Demo Mode</span>
            <span className="hidden sm:inline"> &mdash; You&apos;re viewing sample data</span>
          </p>
        </div>
        <nav aria-label="Demo actions" className="grid grid-cols-5 sm:flex items-center gap-1 sm:gap-2 w-full sm:w-auto sm:flex-shrink-0">
          <Link href="/" className="text-center text-xs font-medium px-2 py-1 rounded-lg text-amber-200/90 hover:text-amber-300 hover:bg-amber-500/10 transition-colors">
            Home
          </Link>
          <Link href="/pricing" className="text-center text-xs font-medium px-2 py-1 rounded-lg text-amber-200/90 hover:text-amber-300 hover:bg-amber-500/10 transition-colors">
            Pricing
          </Link>
          <a
            href={whatsappHref(WHATSAPP_DEFAULT_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackContact('whatsapp', 'demo_banner')}
            className="text-center text-xs font-semibold px-2 sm:px-3 py-1 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
            aria-label="Chat with Bitwave on WhatsApp"
          >
            <span className="hidden sm:inline">WhatsApp</span>
            <span className="sm:hidden">Chat</span>
          </a>
          <Link href="/signup" className="text-center text-xs font-semibold px-2 sm:px-3 py-1 rounded-lg bg-amber-500 text-[#09090b] hover:bg-amber-400 transition-colors">
            Sign Up
          </Link>
          <button onClick={exitDemo} className="text-center text-xs font-medium px-2 sm:px-3 py-1 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors">
            Exit
          </button>
        </nav>
      </div>
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, isDemo, user } = useAuth();

  const isPublicPage = PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some(p => matchesPathPrefix(pathname, p));
  const isDemoEntry = pathname === '/demo';

  const isAdmin = user?.role === 'admin';
  const isOnAdminPage = pathname.startsWith('/admin');
  const isOnResellerPage = !isOnAdminPage;
  const ADMIN_ALLOWED_NON_ADMIN_PATHS = ['/shop', '/routers'];
  const isOnAdminAllowedPath = ADMIN_ALLOWED_NON_ADMIN_PATHS.some(p => pathname.startsWith(p));

  const needsRedirect = !isPublicPage && !isLoading && (
    !isAuthenticated
    || (isAdmin && isOnResellerPage && !isOnAdminAllowedPath)
    || (!isAdmin && isOnAdminPage)
  );

  const redirectTarget = !isAuthenticated
    ? '/login'
    : (isAdmin && isOnResellerPage && !isOnAdminAllowedPath)
      ? '/admin'
      : '/dashboard';

  useEffect(() => {
    if (needsRedirect) {
      router.replace(redirectTarget);
    }
  }, [needsRedirect, redirectTarget, router]);

  if (isPublicPage && !isDemoEntry) {
    return <main className="min-h-screen">{children}</main>;
  }

  if (needsRedirect) {
    return null;
  }

  const isFullscreenAuth = FULLSCREEN_AUTH_PATHS.includes(pathname);
  if (isFullscreenAuth) {
    return <main className="min-h-screen">{children}</main>;
  }

  // Keep the `/demo` child mounted in one stable tree while demo auth starts
  // or exits. Only its surrounding app chrome needs to wait for demo mode.
  const showAppChrome = !isDemoEntry || (!isLoading && isDemo);

  return (
    <>
      {!isLoading && isDemo && <DemoBanner />}
      <main
        className="min-h-screen p-4 md:p-8 pb-24 md:pb-8 transition-[margin] duration-300 ease-in-out"
        style={{ marginLeft: showAppChrome ? 'var(--app-sidebar-w, 0px)' : 0 }}
      >
        <ErrorBoundary key={pathname}>
          {children}
        </ErrorBoundary>
      </main>
      {showAppChrome && (
        <>
          <CollapsibleSidebar />
          <MobileBottomNav />
          <SubscriptionBlockedModal />
        </>
      )}
    </>
  );
}
