'use client';
import React from 'react';
import { SectionError, SectionEmpty } from './SectionCard';
import type { TopUsersResponse } from '../../lib/types';

// Live per-router top users (from MikroTik queue counters). Body only —
// rendered inside the combined Top Users card, which owns the card chrome.
export function TopDownloadersBody({
  data,
  loading,
  error,
  onRetry,
}: {
  data: TopUsersResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}): React.ReactElement {
  const formatRate = (bps: number) => {
    if (bps === 0) return '-';
    const kbps = bps / 1000;
    if (kbps < 1000) return `${kbps.toFixed(0)} Kbps`;
    return `${(kbps / 1000).toFixed(1)} Mbps`;
  };

  const formatUsage = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
  };

  if (error) {
    return <SectionError message={error} onRetry={onRetry} />;
  }

  if (loading && !data) {
    return <div className="h-48 skeleton rounded-lg" />;
  }

  if (!data || data.topUsers.length === 0) {
    return <SectionEmpty message="No active users on this router" />;
  }

  const maxDownload = Math.max(1, ...data.topUsers.map(u => u.downloadMB));

  return (
    <>
      {/* Mobile: Card layout */}
      <div className="md:hidden space-y-2">
        {data.topUsers.map((user, index) => {
          const [uploadRate, downloadRate] = (user.currentRate || '0/0').split('/').map(Number);
          const isActive = downloadRate > 0 || uploadRate > 0;
          const downloadPercent = (user.downloadMB / maxDownload) * 100;
          const rank = index + 1;
          const connectionType = user.connectionType || (user.mac?.startsWith('pppoe:') ? 'pppoe' : 'hotspot');
          const serviceLabel = connectionType === 'pppoe' ? 'PPPoE' : 'Hotspot';

          return (
            <div
              key={user.mac}
              className={`p-3 rounded-xl border ${isActive ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border/50 bg-background-tertiary/50'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    rank === 1 ? 'bg-amber-500/20 text-amber-500' :
                    rank === 2 ? 'bg-foreground-muted/10 text-foreground-muted' :
                    rank === 3 ? 'bg-orange-500/20 text-orange-500' :
                    'bg-foreground-muted/10 text-foreground-muted'
                  }`}>
                    {rank}
                  </span>
                  <span className="font-mono text-sm text-foreground">{user.customerPhone}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                    connectionType === 'pppoe'
                      ? 'bg-violet-500/10 text-violet-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {serviceLabel}
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                </div>
                <span className="text-sm font-semibold text-cyan-500">{formatUsage(user.downloadMB)}</span>
              </div>
              <div className="h-1.5 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${downloadPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-foreground-muted">
                <span>↑ {formatUsage(user.uploadMB)}</span>
                <span>Total: {formatUsage(user.totalMB)}</span>
                {isActive && <span className="text-emerald-500">{formatRate(downloadRate)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Full table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-foreground-muted text-xs uppercase tracking-wider border-b border-border">
              <th className="text-left pb-3 font-medium w-12">#</th>
              <th className="text-left pb-3 font-medium">User</th>
              <th className="text-left pb-3 font-medium">Service</th>
              <th className="text-left pb-3 font-medium">Usage</th>
              <th className="text-right pb-3 font-medium">Download</th>
              <th className="text-right pb-3 font-medium">Upload</th>
              <th className="text-right pb-3 font-medium">Total</th>
              <th className="text-right pb-3 font-medium">Speed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {data.topUsers.map((user, index) => {
              const [uploadRate, downloadRate] = (user.currentRate || '0/0').split('/').map(Number);
              const isActive = downloadRate > 0 || uploadRate > 0;
              const downloadPercent = (user.downloadMB / maxDownload) * 100;
              const rank = index + 1;
              const connectionType = user.connectionType || (user.mac?.startsWith('pppoe:') ? 'pppoe' : 'hotspot');
              const serviceLabel = connectionType === 'pppoe' ? 'PPPoE' : 'Hotspot';

              return (
                <tr
                  key={user.mac}
                  className={`${isActive ? 'bg-emerald-500/5' : ''} hover:bg-background-tertiary/50 transition-colors`}
                >
                  <td className="py-3">
                    <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-bold ${
                      rank === 1 ? 'bg-amber-500/20 text-amber-500' :
                      rank === 2 ? 'bg-gray-500/15 text-gray-400' :
                      rank === 3 ? 'bg-orange-500/20 text-orange-600' :
                      'text-foreground-muted'
                    }`}>
                      {rank}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-foreground">{user.customerPhone}</span>
                      {isActive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" title="Active now" />}
                    </div>
                    {user.customerName && user.customerName !== user.customerPhone && (
                      <p className="text-xs text-foreground-muted mt-0.5">{user.customerName}</p>
                    )}
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
                  <td className="py-3 w-40">
                    <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${downloadPercent}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm font-semibold text-cyan-500">{formatUsage(user.downloadMB)}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm font-medium text-emerald-500">{formatUsage(user.uploadMB)}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm font-semibold text-foreground">{formatUsage(user.totalMB)}</span>
                  </td>
                  <td className="py-3 text-right">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {formatRate(downloadRate)}
                      </span>
                    ) : (
                      <span className="text-sm text-foreground-muted">Idle</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
