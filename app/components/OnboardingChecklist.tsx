'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useOnboardingStatus } from '../hooks/useOnboardingStatus';

const STEPS = [
  {
    id: 'router',
    label: 'Connect your router',
    description: 'Generate a token and provision your MikroTik',
    check: 'hasRouters' as const,
    icon: RouterStepIcon,
  },
  {
    id: 'plan',
    label: 'Create a plan',
    description: 'Set up an internet plan for your customers',
    check: 'hasPlans' as const,
    icon: PlanStepIcon,
  },
  {
    id: 'payment',
    label: 'Set up payments',
    description: 'Add M-Pesa or bank account to receive payments',
    check: 'hasPaymentMethods' as const,
    icon: PaymentStepIcon,
  },
  {
    id: 'profile',
    label: 'Add support phone',
    description: 'So your customers can reach you',
    check: 'hasProfile' as const,
    icon: ProfileStepIcon,
  },
];

function getProgressMessage(completedCount: number, totalSteps: number) {
  if (completedCount === 0) return { heading: 'Let\'s get you set up', sub: 'A few quick steps and you\'ll be ready to manage your network.' };
  if (completedCount === 1) return { heading: 'Good start!', sub: 'You\'ve taken the first step. Keep going — it gets easier.' };
  if (completedCount === 2) return { heading: 'Halfway there', sub: 'You\'re making great progress. Just a couple more to go.' };
  if (completedCount === totalSteps - 1) return { heading: 'Almost done!', sub: 'One last step and your ISP is fully set up.' };
  return { heading: 'Setup in progress', sub: `${completedCount} of ${totalSteps} steps complete.` };
}

export default function OnboardingChecklist() {
  const status = useOnboardingStatus();
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('onboarding_checklist_dismissed') === 'true'
  );

  if (dismissed || status.loading || status.isComplete) return null;

  const pct = Math.round((status.completedCount / status.totalSteps) * 100);
  const { heading, sub } = getProgressMessage(status.completedCount, status.totalSteps);

  const currentStepIndex = STEPS.findIndex(s => !status[s.check]);

  return (
    <div className="card overflow-hidden animate-fade-in mb-6">
      {/* Header with gradient accent */}
      <div className="relative px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.06] to-transparent pointer-events-none" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-foreground">{heading}</h3>
            </div>
            <p className="text-xs text-foreground-muted ml-[42px]">{sub}</p>
          </div>
          <button
            onClick={() => {
              localStorage.setItem('onboarding_checklist_dismissed', 'true');
              setDismissed(true);
            }}
            className="text-foreground-muted/40 hover:text-foreground-muted p-1 -m-1 transition-colors relative z-10"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="relative mt-4 ml-[42px]">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="flex-1 h-2 rounded-full bg-foreground-muted/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-amber-500 tabular-nums flex-shrink-0">
              {status.completedCount}/{status.totalSteps}
            </span>
          </div>
        </div>
      </div>

      {/* Steps — vertical stepper */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1">
        <div className="ml-[42px]">
          {STEPS.map((step, index) => {
            const done = status[step.check];
            const isCurrent = index === currentStepIndex;
            const isFuture = !done && index > currentStepIndex;
            const StepIconComponent = step.icon;

            return (
              <div key={step.id} className="relative">
                {/* Connector line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={`absolute left-[15px] top-[36px] w-0.5 h-[calc(100%-20px)] transition-colors duration-500 ${
                      done ? 'bg-amber-500/40' : 'bg-foreground-muted/10'
                    }`}
                  />
                )}

                <div
                  className={`flex items-start gap-3 py-2.5 px-2 -mx-2 rounded-xl transition-all duration-200 ${
                    isCurrent ? 'bg-amber-500/[0.06]' : ''
                  }`}
                >
                  {/* Step indicator */}
                  <div className={`relative flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all duration-500 ${
                    done
                      ? 'bg-amber-500 shadow-sm shadow-amber-500/30'
                      : isCurrent
                      ? 'bg-amber-500/15 ring-2 ring-amber-500/40'
                      : 'bg-foreground-muted/8 ring-1 ring-foreground-muted/15'
                  }`}>
                    {done ? (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <StepIconComponent className={`w-3.5 h-3.5 ${isCurrent ? 'text-amber-500' : 'text-foreground-muted/40'}`} />
                    )}
                    {isCurrent && !done && (
                      <span className="absolute -inset-0.5 rounded-full border-2 border-amber-500/30 animate-pulse" />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm font-medium transition-colors ${
                          done
                            ? 'text-foreground-muted line-through decoration-foreground-muted/30'
                            : isCurrent
                            ? 'text-foreground'
                            : 'text-foreground-muted/60'
                        }`}>
                          {step.label}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-foreground-muted mt-0.5">{step.description}</p>
                        )}
                      </div>

                      {/* Action button for current step */}
                      {isCurrent && (
                        <Link
                          href="/setup"
                          className="text-xs font-semibold text-amber-500 hover:text-amber-400 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 transition-all whitespace-nowrap active:opacity-70 flex-shrink-0"
                          style={{ touchAction: 'manipulation' }}
                        >
                          Continue
                        </Link>
                      )}

                      {done && (
                        <span className="text-[10px] font-medium text-amber-500/70 flex-shrink-0">Done</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RouterStepIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0" />
    </svg>
  );
}

function PlanStepIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function PaymentStepIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function ProfileStepIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
