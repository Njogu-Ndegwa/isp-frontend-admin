'use client';

import Link from 'next/link';
import { SubscriptionAlert } from '../lib/types';

interface SubscriptionAlertBannerProps {
  alert: SubscriptionAlert;
  onPayNow?: () => void;
}

export default function SubscriptionAlertBanner({ alert, onPayNow }: SubscriptionAlertBannerProps) {
  const isWarning = alert.status === 'trial' || alert.current_invoice?.is_due_soon;
  const isDanger = alert.status === 'suspended' || alert.status === 'inactive' || alert.current_invoice?.is_overdue;

  const bgClass = isDanger
    ? 'bg-red-500/10 border-red-500/20'
    : isWarning
    ? 'bg-amber-500/10 border-amber-500/20'
    : 'bg-blue-500/10 border-blue-500/20';

  const textClass = isDanger
    ? 'text-red-400'
    : isWarning
    ? 'text-amber-400'
    : 'text-blue-400';

  const iconColor = isDanger ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-blue-500';

  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${bgClass}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}>
          {isDanger ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${textClass}`}>{alert.message}</p>
          <div className="flex items-center gap-3 mt-2">
            <Link
              href="/settings/subscription"
              className={`text-xs font-medium ${textClass} hover:underline`}
            >
              View Subscription
            </Link>
            {alert.current_invoice && onPayNow && (
              <button
                onClick={onPayNow}
                className="text-xs font-semibold px-3 py-1 rounded-lg bg-amber-500 text-[#09090b] hover:bg-amber-400 transition-colors"
              >
                Pay Now - KES {alert.current_invoice.final_charge.toLocaleString()}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
