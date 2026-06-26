'use client';

import React from 'react';
import Link from 'next/link';
import { CurrencyIcon, TransactionsIcon, UsersIcon, ChartIcon } from './icons';

/**
 * Shown on the dashboard when the reseller has no routers yet. Instead of
 * stuck loading skeletons, it previews the KPI tiles that will fill in once a
 * router is connected, alongside a clear call to action to get set up.
 */
export default function DashboardEmptyState(): React.JSX.Element {
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Ghost KPI tiles — a preview of the analytics that will appear */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-hidden="true">
        <GhostStat title="Total Revenue" icon={<CurrencyIcon />} />
        <GhostStat title="Transactions" icon={<TransactionsIcon />} />
        <GhostStat title="Unique Customers" icon={<UsersIcon />} />
        <GhostStat title="Avg Transaction" icon={<ChartIcon />} />
      </div>

      {/* Call to action */}
      <div className="card p-6 sm:p-10 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground">Your dashboard is almost ready</h3>
        <p className="text-sm text-foreground-muted mt-2 max-w-md">
          Connect your first router to start seeing live revenue, customer activity, network health,
          and usage analytics right here.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full sm:w-auto">
          <Link
            href="/routers"
            className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add your first router
          </Link>
          <Link href="/setup" className="btn-secondary w-full sm:w-auto text-center">
            Use the setup guide
          </Link>
        </div>
      </div>
    </div>
  );
}

function GhostStat({ title, icon }: { title: string; icon: React.ReactNode }): React.JSX.Element {
  return (
    <div className="relative overflow-hidden bg-background-secondary border border-border rounded-2xl p-3.5 sm:p-5 h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.02] to-transparent pointer-events-none" />
      <div className="relative opacity-60">
        <div className="flex items-center justify-between mb-2.5 sm:mb-4">
          <div className="p-2 sm:p-2.5 rounded-xl bg-foreground/5 ring-1 ring-border">
            <div className="text-foreground-muted">{icon}</div>
          </div>
        </div>
        <p className="text-foreground-muted text-[10px] sm:text-xs font-medium uppercase tracking-wider mb-1 sm:mb-1.5">
          {title}
        </p>
        <p className="font-bold text-foreground-muted/50 stat-value text-lg sm:text-2xl">—</p>
        <div className="mt-2 h-1.5 w-16 rounded-full bg-foreground/5" />
      </div>
    </div>
  );
}
