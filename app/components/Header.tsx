'use client';

import { useState, useEffect } from 'react';
import { getGreetingGMT3, formatCurrentDateTimeGMT3 } from '../lib/dateUtils';

export default function Header({ 
  title, 
  subtitle,
  action 
}: { 
  title: string; 
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    
    const updateTime = () => {
      // Use GMT+3 timezone for all time displays
      setGreeting(getGreetingGMT3());
      setCurrentTime(formatCurrentDateTimeGMT3());
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="mb-5 sm:mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-foreground-muted text-sm mb-1" suppressHydrationWarning>
            {mounted ? greeting : '\u00A0'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-foreground-muted text-sm mt-1 truncate">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {action}
          <div className="hidden sm:block text-right">
            <p className="text-xs text-foreground-muted font-medium" suppressHydrationWarning>
              {mounted ? currentTime : '\u00A0'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
