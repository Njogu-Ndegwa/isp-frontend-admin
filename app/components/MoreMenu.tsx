'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BottomSheet from './BottomSheet';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

interface MoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const managementItems = [
  {
    name: 'Plans',
    href: '/plans',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    name: 'Vouchers',
    href: '/vouchers',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
  {
    name: 'Access Logins',
    href: '/access-credentials',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    name: 'Diagnostics',
    href: '/diagnostics',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    name: 'Walled Garden',
    href: '/walled-garden',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    name: 'Statement',
    href: '/account-statement',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    ),
  },
];

const settingsItems = [
  {
    name: 'Profile',
    href: '/settings/profile',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    name: 'Subscription',
    href: '/settings/subscription',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    name: 'Payments',
    href: '/settings/payment-methods',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
  },
];

/* Advertising items hidden - not yet functional
const advertisingItems = [...];
*/

const adminItems = [
  {
    name: 'Admin Dashboard',
    href: '/admin',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    name: 'Resellers',
    href: '/admin/resellers',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    name: 'Subscriptions',
    href: '/admin/subscriptions',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    name: 'Shop',
    href: '/shop',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

export default function MoreMenu({ isOpen, onClose }: MoreMenuProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    logout();
    onClose();
  };

  const NavItem = ({ item }: { item: { name: string; href: string; icon: React.ReactNode } }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all duration-200 ${
          isActive 
            ? 'bg-accent-primary/10 text-accent-primary' 
            : 'text-foreground-muted hover:bg-background-tertiary hover:text-foreground'
        }`}
      >
        <div className={`mb-1.5 ${isActive ? 'text-accent-primary' : ''}`}>
          {item.icon}
        </div>
        <span className={`text-[11px] font-medium leading-tight ${isActive ? 'text-accent-primary' : ''}`}>
          {item.name}
        </span>
      </Link>
    );
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Scrollable nav items */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-2 pb-3">
        {isAdmin ? (
          /* Admin sees only admin navigation */
          <div className="mb-4">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted/60 mb-2 px-1">
              Admin
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {adminItems.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>
          </div>
        ) : (
          /* Reseller sees management + advertising */
          <>
            <div className="mb-4">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted/60 mb-2 px-1">
                Management
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {managementItems.map((item) => (
                  <NavItem key={item.href} item={item} />
                ))}
              </div>
            </div>

            {/* Advertising section hidden - not yet functional */}

            <div className="mt-4">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted/60 mb-2 px-1">
                Settings
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {settingsItems.map((item) => (
                  <NavItem key={item.href} item={item} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pinned footer - always visible */}
      <div className="shrink-0 border-t border-border px-4 pt-3 pb-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 16px))' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-danger bg-danger/5 hover:bg-danger/10 active:bg-danger/15 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
