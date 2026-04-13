'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useOnboardingStatus } from '../hooks/useOnboardingStatus';

const STEPS = [
  {
    id: 'router',
    label: 'Add a router',
    href: '/routers',
    actionLabel: 'Add Router',
    check: 'hasRouters' as const,
  },
  {
    id: 'plan',
    label: 'Create a plan',
    href: '/plans/create',
    actionLabel: 'Create Plan',
    check: 'hasPlans' as const,
  },
  {
    id: 'payment',
    label: 'Set up payment methods',
    href: '/settings/payment-methods',
    actionLabel: 'Set Up',
    check: 'hasPaymentMethods' as const,
  },
  {
    id: 'profile',
    label: 'Add support phone',
    href: '/settings/profile',
    actionLabel: 'Complete',
    check: 'hasProfile' as const,
  },
];

export default function OnboardingChecklist() {
  const status = useOnboardingStatus();
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('onboarding_checklist_dismissed') === 'true'
  );

  if (dismissed || status.loading || status.isComplete) return null;

  const pct = Math.round((status.completedCount / status.totalSteps) * 100);

  return (
    <div className="card p-4 sm:p-5 animate-fade-in mb-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground">
            Complete Your Setup
          </h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            {status.completedCount} of {status.totalSteps} done
          </p>
        </div>
        <button
          onClick={() => {
            localStorage.setItem('onboarding_checklist_dismissed', 'true');
            setDismissed(true);
          }}
          className="text-foreground-muted/50 hover:text-foreground-muted p-1 -m-1 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-foreground-muted/10 mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-1">
        {STEPS.map(step => {
          const done = status[step.check];
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors ${
                done ? 'bg-success/5' : 'hover:bg-background-secondary'
              }`}
            >
              {done ? (
                <svg className="w-5 h-5 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-foreground-muted/20 flex-shrink-0" />
              )}
              <span className={`text-sm flex-1 ${done ? 'text-foreground-muted line-through' : 'text-foreground'}`}>
                {step.label}
              </span>
              {!done && (
                <Link
                  href={step.href}
                  className="text-xs font-medium text-amber-500 hover:text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/20 hover:bg-amber-500/5 transition-colors whitespace-nowrap active:opacity-70"
                  style={{ touchAction: 'manipulation' }}
                >
                  {step.actionLabel}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
