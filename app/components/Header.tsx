'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getGreetingGMT3, formatCurrentDateTimeGMT3 } from '../lib/dateUtils';
import { useAuth } from '../context/AuthContext';
import MobileSidebar from './MobileSidebar';
import AccountMenu from './AccountMenu';

export default function Header({ 
  title, 
  subtitle,
  action,
  backHref,
}: { 
  title: string; 
  subtitle?: string;
  action?: React.ReactNode;
  backHref?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    setMounted(true);

    const updateTime = () => {
      setGreeting(getGreetingGMT3());
      setCurrentTime(formatCurrentDateTimeGMT3());
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Mobile header: single-line app bar */}
      <header className="md:hidden mb-4">
        <div className="flex items-center justify-between gap-3 h-10">
          <div className="flex items-center gap-2.5 min-w-0">
            {backHref ? (
              <Link
                href={backHref}
                className="p-1.5 -ml-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors active:opacity-70 touch-manipulation flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            ) : (
              <button
                onClick={() => setShowSidebar(true)}
                aria-label="Open navigation menu"
                className="p-1.5 -ml-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors active:opacity-70 touch-manipulation flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
          </div>

          <AccountMenu />
        </div>
      </header>

      {/* Desktop header: full layout with greeting, subtitle, actions */}
      <header className="hidden md:block mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {backHref ? (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors mb-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Link>
            ) : (
              <p className="text-foreground-muted text-sm mb-1" suppressHydrationWarning>
                {mounted ? greeting : '\u00A0'}
              </p>
            )}
            <h1 className="text-3xl font-bold text-foreground tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-foreground-muted text-sm mt-1 truncate">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {action}
            {isAdmin && (
              <Link
                href="/shop"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/25 text-amber-500 text-xs font-semibold hover:bg-amber-500/10 transition-all"
                title="Equipment Shop"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Shop
              </Link>
            )}
            <div className="text-right">
              <p className="text-xs text-foreground-muted font-medium" suppressHydrationWarning>
                {mounted ? currentTime : '\u00A0'}
              </p>
            </div>
            <AccountMenu />
          </div>
        </div>
      </header>

      <MobileSidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />
    </>
  );
}
