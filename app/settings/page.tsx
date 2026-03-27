'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { settingsNav } from './layout';

export default function SettingsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    if (mq.matches) {
      router.replace('/settings/profile');
    }
  }, [router]);

  return (
    <div className="md:hidden space-y-2">
      {settingsNav.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className="flex items-center gap-4 p-4 rounded-2xl bg-background-secondary border border-border hover:border-accent-primary/30 hover:bg-background-tertiary transition-all group"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center group-hover:bg-accent-primary/15 transition-colors">
            {section.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
            <p className="text-xs text-foreground-muted mt-0.5">{section.description}</p>
          </div>
          <svg className="w-5 h-5 text-foreground-muted group-hover:text-foreground transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ))}
    </div>
  );
}
