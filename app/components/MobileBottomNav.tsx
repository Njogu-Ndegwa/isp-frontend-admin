'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

type NavIconFn = (active: boolean) => React.ReactNode;
interface BottomNavItem {
  name: string;
  href: string;
  icon: NavIconFn;
  activeMatch?: (pathname: string) => boolean;
}

const resellerNavItems: BottomNavItem[] = [
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
  {
    name: 'Shop',
    href: '/shop',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-accent-primary' : 'text-foreground-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    activeMatch: (p: string) => p === '/shop' || p.startsWith('/shop/'),
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const mainNavItems = isAdmin ? adminNavItems : resellerNavItems;

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
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
