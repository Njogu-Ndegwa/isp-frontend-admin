'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useT } from '../lib/i18n';
import { buildBottomNavItems } from '../lib/permissions';

type NavIconFn = (active: boolean) => React.ReactNode;
interface BottomNavItem {
  name: string;
  href: string;
  icon: NavIconFn;
  activeMatch?: (pathname: string) => boolean;
}

export const resellerNavItems: BottomNavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-accent-primary' : 'text-foreground-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: 'Customers',
    href: '/customers',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-accent-primary' : 'text-foreground-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-accent-primary' : 'text-foreground-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    name: 'Routers',
    href: '/routers',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-accent-primary' : 'text-foreground-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    ),
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-accent-primary' : 'text-foreground-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    activeMatch: (p: string) => p.startsWith('/settings'),
  },
];

const navIcon = (d: string): NavIconFn => function NavIcon(active: boolean) {
  return (
    <svg className={`w-6 h-6 ${active ? 'text-accent-primary' : 'text-foreground-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
    </svg>
  );
};

/** Staff who can't open some of the main tabs get these instead (when they
 *  can open them), so the bar keeps up to five useful tabs. */
export const staffBackfillNavItems: BottomNavItem[] = [
  {
    name: 'Vouchers',
    href: '/vouchers',
    icon: navIcon('M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z'),
    activeMatch: (p: string) => p === '/vouchers' || p.startsWith('/vouchers/'),
  },
  {
    name: 'Plans',
    href: '/plans',
    icon: navIcon('M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z'),
    activeMatch: (p: string) => p === '/plans' || p.startsWith('/plans/'),
  },
  {
    name: 'Statement',
    href: '/account-statement',
    icon: navIcon('M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z'),
  },
  {
    name: 'Messaging',
    href: '/messaging',
    icon: navIcon('M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z'),
    activeMatch: (p: string) => p === '/messaging' || p.startsWith('/messaging/'),
  },
  {
    name: 'Diagnostics',
    href: '/diagnostics',
    icon: navIcon('M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z'),
  },
];

const adminNavItems: BottomNavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-accent-primary' : 'text-foreground-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: 'Leads',
    href: '/admin/leads',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-accent-primary' : 'text-foreground-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    activeMatch: (p: string) => p === '/admin/leads' || p.startsWith('/admin/leads/'),
  },
  {
    name: 'Resellers',
    href: '/admin/resellers',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-accent-primary' : 'text-foreground-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    activeMatch: (p: string) => p === '/admin/resellers' || p.startsWith('/admin/resellers/'),
  },
  {
    name: 'Subs',
    href: '/admin/subscriptions',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-accent-primary' : 'text-foreground-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    activeMatch: (p) => p === '/admin/subscriptions' || p.startsWith('/admin/subscriptions/'),
  },
  // Shop lives in the sidebar for admins — it's the reseller-facing storefront,
  // so Earnings earns the tab instead.
  {
    name: 'Earnings',
    href: '/admin/earnings',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-accent-primary' : 'text-foreground-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    activeMatch: (p: string) => p === '/admin/earnings',
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const t = useT();

  const isAdmin = user?.role === 'admin';
  // Staff only get tabs for pages the owner granted; missing ones are
  // backfilled so the bar stays evenly filled (see AGENTS.md checklist).
  const mainNavItems = isAdmin
    ? adminNavItems
    : buildBottomNavItems(resellerNavItems, staffBackfillNavItems, user);

  if (mainNavItems.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden">
      <div 
        className="bg-background-secondary/95 backdrop-blur-xl border-t border-border"
        style={{ 
          minHeight: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        <div className="flex items-center justify-around h-16">
          {mainNavItems.map((item) => {
            const isActive = item.activeMatch ? item.activeMatch(pathname) : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center flex-1 h-full relative active:opacity-70"
              >
                {isActive && (
                  <span className="absolute top-1 w-1 h-1 rounded-full bg-accent-primary" />
                )}
                
                <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  {item.icon(isActive)}
                </div>
                
                <span className={`text-[10px] mt-1 font-medium transition-colors ${
                  isActive ? 'text-accent-primary' : 'text-foreground-muted'
                }`}>
                  {t(item.name)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
