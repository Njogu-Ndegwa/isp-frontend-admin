'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isIndex = pathname === '/settings';

  return (
    <div>
      {/* Header row */}
      <div className="mb-6">
        {/* On sub-pages on mobile: show back to /settings */}
        {!isIndex && (
          <Link
            href="/settings"
            className="md:hidden inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors mb-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Settings
          </Link>
        )}
        {/* On index page on mobile: show back to dashboard */}
        {isIndex && (
          <Link
            href="/dashboard"
            className="md:hidden inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors mb-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        )}
        {/* Desktop: always show back to dashboard */}
        <Link
          href="/dashboard"
          className="hidden md:inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors mb-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Settings</h1>
      </div>

      {children}
    </div>
  );
}
