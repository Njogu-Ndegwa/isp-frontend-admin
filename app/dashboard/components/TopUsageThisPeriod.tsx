'use client';
import React from 'react';
import Link from 'next/link';
import SectionCard from './SectionCard';
import { SkeletonCard } from '../../components/LoadingSpinner';
import type { ResellerTopUsageEntry } from '../../lib/types';

export default function TopUsageThisPeriod({
  data,
  loading,
}: {
  data: ResellerTopUsageEntry[] | null;
  loading: boolean;
}): React.ReactElement | null {
  const formatMb = (mb: number): string => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(0)} MB`;
  };

  if (loading) {
    return <SkeletonCard />;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <SectionCard
      title="Top Users This Period"
      accent="purple"
      meta={<span>Hotspot + PPPoE</span>}
    >
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-xs font-medium text-foreground-muted uppercase tracking-wider w-12">#</th>
              <th className="text-left py-2 text-xs font-medium text-foreground-muted uppercase tracking-wider">Customer</th>
              <th className="text-left py-2 text-xs font-medium text-foreground-muted uppercase tracking-wider">Service</th>
              <th className="text-left py-2 text-xs font-medium text-foreground-muted uppercase tracking-wider">Plan</th>
              <th className="text-left py-2 text-xs font-medium text-foreground-muted uppercase tracking-wider">Usage</th>
              <th className="text-right py-2 text-xs font-medium text-foreground-muted uppercase tracking-wider">% used</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry, i) => {
              const percent = Math.min(100, Math.max(0, entry.percent_used || 0));
              const barColor = entry.fup_active
                ? 'bg-danger'
                : percent >= 90
                ? 'bg-warning'
                : percent >= 75
                ? 'bg-amber-500'
                : 'bg-purple-500';
              const connectionType = entry.connection_type ?? 'hotspot';
              const serviceLabel = connectionType === 'pppoe' ? 'PPPoE' : 'Hotspot';
              const identifier = entry.identifier || entry.pppoe_username || 'No identifier';
              return (
                <tr key={entry.customer_id} className="border-b border-border/50 hover:bg-background-tertiary/30 transition-colors">
                  <td className="py-3 text-foreground-muted">{i + 1}</td>
                  <td className="py-3">
                    <Link href={`/customers/${entry.customer_id}`} className="font-medium text-foreground hover:text-accent-primary transition-colors">
                      {entry.customer_name || 'Unnamed customer'}
                    </Link>
                    <p className="text-xs font-mono text-foreground-muted">{identifier}</p>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
                      connectionType === 'pppoe'
                        ? 'bg-violet-500/10 text-violet-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {serviceLabel}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="text-sm text-foreground-muted">{entry.plan_name}</span>
                  </td>
                  <td className="py-3 w-64">
                    <div className="flex items-center gap-2">
                      <div className="h-2 bg-background-tertiary rounded-full overflow-hidden flex-1">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all duration-500`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-foreground-muted whitespace-nowrap font-mono">
                        {formatMb(entry.total_mb)}{entry.cap_mb != null ? ` / ${formatMb(entry.cap_mb)}` : ''}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <span className={`text-sm font-semibold ${entry.fup_active ? 'text-danger' : percent >= 90 ? 'text-warning' : 'text-foreground'}`}>
                      {percent.toFixed(1)}%
                    </span>
                    {entry.fup_active && (
                      <p className="text-[10px] text-danger uppercase tracking-wider mt-0.5">FUP</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {data.map((entry, i) => {
          const percent = Math.min(100, Math.max(0, entry.percent_used || 0));
          const barColor = entry.fup_active
            ? 'bg-danger'
            : percent >= 90
            ? 'bg-warning'
            : percent >= 75
            ? 'bg-amber-500'
            : 'bg-purple-500';
          const connectionType = entry.connection_type ?? 'hotspot';
          const serviceLabel = connectionType === 'pppoe' ? 'PPPoE' : 'Hotspot';
          const identifier = entry.identifier || entry.pppoe_username || 'No identifier';
          return (
            <Link
              key={entry.customer_id}
              href={`/customers/${entry.customer_id}`}
              className="block p-3 rounded-lg bg-background-tertiary/30 border border-border/50 active:opacity-70"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-foreground-muted w-5">{i + 1}.</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{entry.customer_name || 'Unnamed customer'}</p>
                    <p className="text-[10px] font-mono text-foreground-muted truncate">{identifier}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                    connectionType === 'pppoe'
                      ? 'bg-violet-500/10 text-violet-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {serviceLabel}
                  </span>
                  <span className={`text-sm font-semibold ${entry.fup_active ? 'text-danger' : percent >= 90 ? 'text-warning' : 'text-foreground'}`}>
                    {percent.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden mb-1">
                <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-foreground-muted">
                <span className="font-mono">
                  {formatMb(entry.total_mb)}{entry.cap_mb != null ? ` / ${formatMb(entry.cap_mb)}` : ''}
                </span>
                {entry.fup_active && <span className="text-danger uppercase tracking-wider font-medium">FUP</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}
