'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

interface SubNavItem {
  name: string;
  href: string;
  matches: (pathname: string) => boolean;
  icon: React.ReactNode;
}

const ITEMS: SubNavItem[] = [
  {
    name: 'Pipeline',
    href: '/admin/leads',
    matches: (p) => {
      if (p === '/admin/leads') return true;
      if (!p.startsWith('/admin/leads/')) return false;
      return (
        !p.startsWith('/admin/leads/followups') &&
        !p.startsWith('/admin/leads/analytics') &&
        !p.startsWith('/admin/leads/sources')
      );
    },
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h.008v.008H3.75V6.75zm0 5.25h.008v.008H3.75V12zm0 5.25h.008v.008H3.75v-.008zM7.5 6.75h12M7.5 12h12m-12 5.25h12" />
      </svg>
    ),
  },
  {
    name: 'Follow-ups',
    href: '/admin/leads/followups',
    matches: (p) => p === '/admin/leads/followups' || p.startsWith('/admin/leads/followups/'),
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    name: 'Analytics',
    href: '/admin/leads/analytics',
    matches: (p) => p === '/admin/leads/analytics',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3v18h18M7 15l4-4 3 3 5-6" />
      </svg>
    ),
  },
  {
    name: 'Sources',
    href: '/admin/leads/sources',
    matches: (p) => p === '/admin/leads/sources',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

export default function LeadsSubNav({ counts }: { counts?: Partial<Record<string, number>> }) {
  const pathname = usePathname();
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current?.querySelector<HTMLAnchorElement>('[data-active="true"]');
    if (el && scrollerRef.current) {
      const { offsetLeft, offsetWidth } = el;
      const { scrollLeft, clientWidth } = scrollerRef.current;
      if (offsetLeft < scrollLeft || offsetLeft + offsetWidth > scrollLeft + clientWidth) {
        scrollerRef.current.scrollTo({ left: Math.max(0, offsetLeft - 16), behavior: 'smooth' });
      }
    }
  }, [pathname]);

  return (
    <div className="-mx-4 px-4 md:mx-0 md:px-0 border-b border-border">
      <div
        ref={scrollerRef}
        className="flex gap-1 overflow-x-auto no-scrollbar -mb-px"
        style={{ scrollbarWidth: 'none' }}
      >
        {ITEMS.map((item) => {
          const active = item.matches(pathname);
          const count = counts?.[item.href];
          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={active}
              className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? 'border-accent-primary text-foreground'
                  : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border-hover'
              }`}
            >
              <span className={active ? 'text-accent-primary' : ''}>{item.icon}</span>
              {item.name}
              {typeof count === 'number' && count > 0 && (
                <span
                  className={`ml-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-accent-primary/20 text-accent-primary' : 'bg-background-tertiary text-foreground-muted'
                  }`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
