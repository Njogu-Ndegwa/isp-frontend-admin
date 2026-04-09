'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SubscriptionBlockedModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handler = (e: Event) => {
      const raw = (e as CustomEvent).detail;
      const detail = typeof raw === 'string' ? raw : 'Your subscription is inactive. Please renew to continue.';
      setMessage(detail);
      setIsOpen(true);
    };
    window.addEventListener('subscription-blocked', handler);
    return () => window.removeEventListener('subscription-blocked', handler);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="relative bg-background-secondary border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-2">Subscription Required</h3>
        <p className="text-sm text-foreground-muted mb-6">{message}</p>

        <div className="flex flex-col gap-3">
          <Link
            href="/settings/subscription"
            onClick={() => setIsOpen(false)}
            className="btn-primary py-2.5 text-sm font-semibold text-center"
          >
            View Subscription
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="text-sm text-foreground-muted hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
