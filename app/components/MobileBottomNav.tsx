'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import MoreMenu from './MoreMenu';

const mainNavItems = [
  {
    name: 'Dashboard',
    href: '/',
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

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isMoreActive = ['/plans', '/ratings', '/advertisers', '/ads', '/ads/analytics'].some(path => pathname?.startsWith(path));

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden">
        {/* 
          Container uses min-height to allow expansion for safe area
          The inner flex container has fixed height for consistent icon positioning
        */}
        <div 
          className="bg-background-secondary/95 backdrop-blur-xl border-t border-border"
          style={{ 
            minHeight: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}
        >
          {/* 
            Inner container has fixed height and centers content
            This ensures icons stay in the same position regardless of safe area
          */}
          <div className="flex items-center justify-around h-16">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center flex-1 h-full relative active:opacity-70"
                >
                  {/* Active indicator dot */}
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
            
            {/* More Button */}
            <button
              onClick={() => setShowMoreMenu(true)}
              className="flex flex-col items-center justify-center flex-1 h-full relative active:opacity-70"
            >
              {/* Active indicator dot */}
              {isMoreActive && (
                <span className="absolute top-1 w-1 h-1 rounded-full bg-accent-primary" />
              )}
              
              <div className={`transition-transform duration-200 ${isMoreActive ? 'scale-110' : 'scale-100'}`}>
                <svg className={`w-6 h-6 ${isMoreActive ? 'text-accent-primary' : 'text-foreground-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isMoreActive ? 2 : 1.5} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </div>
              
              <span className={`text-[10px] mt-1 font-medium transition-colors ${
                isMoreActive ? 'text-accent-primary' : 'text-foreground-muted'
              }`}>
                More
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* More Menu Sheet */}
      <MoreMenu isOpen={showMoreMenu} onClose={() => setShowMoreMenu(false)} />
    </>
  );
}
