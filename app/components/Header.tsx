'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getGreetingGMT3, formatCurrentDateTimeGMT3 } from '../lib/dateUtils';
import { useAuth } from '../context/AuthContext';
import MobileSidebar from './MobileSidebar';

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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

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

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const userInitial = (user?.organization_name || user?.email || 'U').charAt(0).toUpperCase();

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
                className="p-1.5 -ml-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors active:opacity-70 touch-manipulation flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
          </div>

          <div className="relative flex-shrink-0" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-9 h-9 rounded-full bg-accent-primary/10 flex items-center justify-center transition-all active:scale-95 ring-2 ring-transparent hover:ring-accent-primary/20"
            >
              <span className="text-sm font-semibold text-accent-primary">{userInitial}</span>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-background-secondary border border-border shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium text-foreground truncate">{user?.organization_name || 'User'}</p>
                    <p className="text-xs text-foreground-muted truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-background-tertiary transition-colors"
                    >
                      <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.212-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>
                    <Link
                      href="/settings/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-background-tertiary transition-colors"
                    >
                      <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      Profile
                    </Link>
                  </div>
                  <div className="border-t border-border py-1">
                    <button
                      onClick={() => { setShowUserMenu(false); logout(); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-danger hover:bg-danger/5 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Log out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
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
            <Link
              href="/settings"
              className="p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-all"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.212-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <div className="text-right">
              <p className="text-xs text-foreground-muted font-medium" suppressHydrationWarning>
                {mounted ? currentTime : '\u00A0'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <MobileSidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />
    </>
  );
}
