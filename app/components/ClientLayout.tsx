'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import CollapsibleSidebar from './CollapsibleSidebar';
import MobileBottomNav from './MobileBottomNav';
import SubscriptionBlockedModal from './SubscriptionBlockedModal';

const PUBLIC_PATHS = ['/', '/login', '/landing', '/signup'];
const PUBLIC_PREFIXES = ['/store'];
const FULLSCREEN_AUTH_PATHS = ['/setup'];

function DemoBanner() {
  const { logout } = useAuth();
  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-b border-amber-500/20">
      <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-xs sm:text-sm text-amber-200/90 truncate">
            <span className="font-medium text-amber-400">Demo Mode</span>
            <span className="hidden sm:inline"> &mdash; You&apos;re viewing sample data</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/signup" className="text-xs font-semibold px-3 py-1 rounded-lg bg-amber-500 text-[#09090b] hover:bg-amber-400 transition-colors">
            Sign Up
          </Link>
          <button onClick={logout} className="text-xs font-medium px-3 py-1 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors">
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, isDemo, user } = useAuth();

  const isPublicPage = PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some(p => pathname.startsWith(p));

  if (isPublicPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-sm text-foreground-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  const isAdmin = user?.role === 'admin';
  const isOnAdminPage = pathname.startsWith('/admin');
  const isOnResellerPage = !isOnAdminPage;

  const ADMIN_ALLOWED_NON_ADMIN_PATHS = ['/shop'];
  const isOnAdminAllowedPath = ADMIN_ALLOWED_NON_ADMIN_PATHS.some(p => pathname.startsWith(p));

  if (isAdmin && isOnResellerPage && !isOnAdminAllowedPath) {
    router.replace('/admin');
    return null;
  }

  if (!isAdmin && isOnAdminPage) {
    router.replace('/dashboard');
    return null;
  }

  const isFullscreenAuth = FULLSCREEN_AUTH_PATHS.includes(pathname);
  if (isFullscreenAuth) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      {isDemo && <DemoBanner />}
      <CollapsibleSidebar />
      <MobileBottomNav />
      <SubscriptionBlockedModal />
      <main className="min-h-screen p-4 md:p-8 md:ml-16 lg:ml-64 pb-24 md:pb-8">
        {children}
      </main>
    </>
  );
}
