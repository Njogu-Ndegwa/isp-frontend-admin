'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

interface NavItem {
  name: string;
  href: string;
  icon: ReactNode;
}

interface NavGroup {
  id: string;
  label?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: 'standalone',
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'billing',
    label: 'Billing & Customers',
    items: [
      {
        name: 'Customers',
        href: '/customers',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
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
        name: 'Transactions',
        href: '/transactions',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
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
        name: 'Account Statement',
        href: '/account-statement',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'network',
    label: 'Network',
    items: [
      {
        name: 'Routers',
        href: '/routers',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
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
    ],
  },
  {
    id: 'engagement',
    label: 'Engagement',
    items: [
      {
        name: 'Ratings',
        href: '/ratings',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'advertising',
    label: 'Advertising',
    items: [
      {
        name: 'Advertisers',
        href: '/advertisers',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
      },
      {
        name: 'Ads',
        href: '/ads',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        ),
      },
      {
        name: 'Ad Analytics',
        href: '/ads/analytics',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
    ],
  },
];

const STORAGE_KEY_COLLAPSED = 'sidebarCollapsed';
const STORAGE_KEY_GROUPS = 'sidebarGroupState';

function isItemActive(pathname: string, href: string): boolean {
  if (href === '/ads') {
    return pathname === '/ads' || (pathname.startsWith('/ads/') && pathname !== '/ads/analytics');
  }
  if (href === '/customers') {
    return pathname === '/customers' || pathname.startsWith('/customers/');
  }
  if (href === '/admin/resellers') {
    return pathname === '/admin/resellers' || pathname.startsWith('/admin/resellers/');
  }
  if (href === '/admin') {
    return pathname === '/admin';
  }
  return pathname === href;
}

function groupHasActiveItem(pathname: string, group: NavGroup): boolean {
  return group.items.some((item) => isItemActive(pathname, item.href));
}

const adminNavGroups: NavGroup[] = [
  {
    id: 'admin-standalone',
    items: [
      {
        name: 'Dashboard',
        href: '/admin',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'admin-management',
    label: 'Management',
    items: [
      {
        name: 'Resellers',
        href: '/admin/resellers',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
      },
    ],
  },
];

export default function CollapsibleSidebar() {
  const pathname = usePathname();
  const { isAuthenticated, logout, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const allNavGroups = isAdmin ? adminNavGroups : navGroups;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    navGroups.forEach((g) => { if (g.label) defaults[g.id] = true; });
    return defaults;
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_COLLAPSED);
    if (saved) setIsCollapsed(saved === 'true');

    const savedGroups = localStorage.getItem(STORAGE_KEY_GROUPS);
    if (savedGroups) {
      try {
        setExpandedGroups(JSON.parse(savedGroups));
      } catch { /* use defaults */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLLAPSED, isCollapsed.toString());
  }, [isCollapsed]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  useEffect(() => {
    allNavGroups.forEach((group) => {
      if (group.label && groupHasActiveItem(pathname, group) && !expandedGroups[group.id]) {
        setExpandedGroups((prev) => ({ ...prev, [group.id]: true }));
      }
    });
  }, [pathname, allNavGroups]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  if (pathname === '/login') return null;

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';

  const renderNavItem = (item: NavItem) => {
    const isActive = isItemActive(pathname, item.href);
    return (
      <div
        key={item.href}
        className="relative"
        onMouseEnter={() => setHoveredItem(item.href)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <Link
          href={item.href}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
            isActive
              ? 'bg-amber-500/10 text-amber-500'
              : 'text-foreground-muted hover:text-foreground hover:bg-background-tertiary'
          } ${isCollapsed ? 'justify-center' : ''}`}
        >
          <span className={`transition-colors ${isActive ? 'text-amber-500' : 'group-hover:text-amber-500'}`}>
            {item.icon}
          </span>
          {!isCollapsed && (
            <>
              <span className="font-medium text-sm truncate">{item.name}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              )}
            </>
          )}
        </Link>

        {isCollapsed && hoveredItem === item.href && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-background-tertiary border border-border rounded-lg text-sm text-foreground whitespace-nowrap z-50 shadow-lg">
            {item.name}
            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-background-tertiary border-l border-b border-border rotate-45" />
          </div>
        )}
      </div>
    );
  };

  const renderGroup = (group: NavGroup, index: number) => {
    const isStandalone = !group.label;
    const isExpanded = expandedGroups[group.id] ?? true;
    const hasActive = groupHasActiveItem(pathname, group);
    const showDivider = index > 0;

    if (isStandalone) {
      return (
        <div key={group.id} className="space-y-1">
          {group.items.map(renderNavItem)}
        </div>
      );
    }

    return (
      <div key={group.id}>
        {showDivider && isCollapsed && (
          <div className="my-2 border-t border-border" />
        )}

        {!isCollapsed && (
          <>
            {showDivider && <div className={`mt-3 pt-3 border-t border-border`} />}
            <button
              onClick={() => toggleGroup(group.id)}
              className={`flex items-center w-full px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                !showDivider ? 'mt-1' : ''
              } ${
                hasActive && !isExpanded
                  ? 'bg-amber-500/8 text-amber-500/80 hover:bg-amber-500/12'
                  : 'text-foreground-muted/60 hover:text-foreground-muted hover:bg-background-tertiary/50'
              }`}
            >
              <svg
                className={`w-3 h-3 mr-2 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
              <span className="truncate">{group.label}</span>
            </button>
          </>
        )}

        <div
          className={`space-y-1 overflow-hidden transition-all duration-200 ${
            !isCollapsed && !isExpanded ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
          } ${!isCollapsed && isExpanded ? 'mt-1' : ''}`}
        >
          {group.items.map(renderNavItem)}
        </div>
      </div>
    );
  };

  return (
    <aside className={`fixed left-0 top-0 h-screen ${sidebarWidth} bg-background-secondary/80 backdrop-blur-xl border-r border-border flex flex-col z-50 transition-all duration-300 ease-in-out hidden md:flex`}>
      {/* Logo & Toggle */}
      <div className={`p-5 border-b border-border flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <Link href={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">ISP Billing</h1>
              <p className="text-xs text-foreground-muted">{isAdmin ? 'Admin Console' : 'Admin Portal'}</p>
            </div>
          </Link>
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-all"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg 
            className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {allNavGroups.map((group, index) => renderGroup(group, index))}
      </nav>

      {/* Theme toggle & User section */}
      <div className="p-3 border-t border-border space-y-1">
        <ThemeToggle collapsed={isCollapsed} />
        {isAuthenticated ? (
          <button
            onClick={logout}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-foreground-muted hover:text-red-500 hover:bg-red-500/10 transition-all ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Logout' : ''}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isCollapsed && <span className="font-medium text-sm">Logout</span>}
          </button>
        ) : (
          <Link
            href="/login"
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-foreground-muted hover:text-amber-500 hover:bg-amber-500/10 transition-all ${isCollapsed ? 'justify-center' : ''}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            {!isCollapsed && <span className="font-medium text-sm">Login</span>}
          </Link>
        )}
      </div>

      {!isCollapsed && (
        <div className="px-5 py-3 text-[10px] text-foreground-muted/40 font-medium">
          v1.0.0 · Bitwave Tech
        </div>
      )}
    </aside>
  );
}
