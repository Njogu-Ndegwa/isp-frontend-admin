'use client';
import React from 'react';
import SectionCard, { SectionError } from './SectionCard';
import RadialGauge from './RadialGauge';
import { CpuIcon, MemoryIcon, StorageIcon, RouterIcon } from './icons';
import { formatBytes } from './InterfacesPanel';
import type { MikroTikMetrics } from '../../lib/types';
import { parseUTCToGMT3, formatGMT3Date } from '../../lib/dateUtils';

export default function NetworkHealthCard({
  data,
  loading,
  error,
  onRetry,
}: {
  data: MikroTikMetrics | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}): React.JSX.Element {
  // Error state
  if (error) {
    return (
      <SectionCard title="Device Health" accent="emerald">
        <SectionError message={error} onRetry={onRetry} />
      </SectionCard>
    );
  }

  // Loading skeleton (no data yet)
  if (loading && !data) {
    return (
      <SectionCard title="Device Health" accent="emerald" loading>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-background-tertiary/40">
              <div className="w-[80px] h-[80px] sm:w-[110px] sm:h-[110px] rounded-full skeleton" />
              <div className="w-14 h-3 skeleton mt-2" />
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-border/30">
          <div className="w-48 h-3 skeleton" />
        </div>
      </SectionCard>
    );
  }

  if (!data) return <></>;

  // Derive values — mirror source lines 929–967
  const cpuLoad = data.cpuLoadPercent ?? 0;
  const memory = data.memory ?? { usedPercent: 0, usedBytes: 0, totalBytes: 0 };
  const storage = data.storage ?? { usedPercent: 0, usedBytes: 0, totalBytes: 0 };
  const system = data.system ?? { boardName: 'Unknown', platform: 'Unknown', version: '0', uptime: 'N/A' };
  const uptime = data.uptime || system.uptime || 'N/A';
  const routerName = data.routerName || system.boardName || 'Router';

  const hasSystemDetails = Boolean(
    system.boardName || system.platform || system.version || data.uptime || system.uptime
  );
  const isFastSnapshot = data.live === false && data.fallbackReason === 'dashboard_fast_snapshot';
  const isLiveFailure = data.live === false && Boolean(data.fallbackReason) && !isFastSnapshot;

  const systemSummary = hasSystemDetails
    ? `${system.boardName || 'Router'} - ${system.platform || 'Unknown'}${system.version ? ` v${system.version}` : ''} - Up: ${uptime}`
    : data.refreshInProgress
      ? 'System details updating'
      : 'System details unavailable';

  const statusLabel = data.stale
    ? data.refreshInProgress || isFastSnapshot
      ? 'Updating'
      : isLiveFailure
        ? 'Offline - Stale'
        : 'Stale'
    : 'Online';

  const statusClass = data.stale
    ? isLiveFailure
      ? 'bg-red-500/20 text-red-400'
      : 'bg-amber-500/20 text-amber-400'
    : 'badge-success';

  const lastUpdated = data.generatedAt
    ? formatGMT3Date(parseUTCToGMT3(data.generatedAt), {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const metaNode = lastUpdated ? (
    <span suppressHydrationWarning>{lastUpdated}</span>
  ) : null;

  return (
    <SectionCard
      title="Device Health"
      accent="emerald"
      loading={loading}
      meta={metaNode}
    >
      {/* Router name + status badge */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <RouterIcon className="w-4 h-4 text-emerald-500" />
        </div>
        <span className="font-semibold text-foreground text-sm">{routerName}</span>
        <span className={`badge text-[10px] ${statusClass}`}>{statusLabel}</span>
        {data.cached && !data.stale && (
          <span className="badge bg-blue-500/20 text-blue-400 text-[10px]">Cached</span>
        )}
      </div>

      {/* Radial dials */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <RadialGauge
          value={cpuLoad}
          label="CPU Load"
          icon={<CpuIcon className="w-5 h-5" />}
          thresholds={{ warning: 50, danger: 80 }}
        />
        <RadialGauge
          value={memory.usedPercent ?? 0}
          label="Memory"
          icon={<MemoryIcon className="w-5 h-5" />}
          thresholds={{ warning: 60, danger: 80 }}
          subtitle={`${formatBytes(memory.usedBytes ?? 0)} / ${formatBytes(memory.totalBytes ?? 0)}`}
        />
        <RadialGauge
          value={storage.usedPercent ?? 0}
          label="Storage"
          icon={<StorageIcon className="w-5 h-5" />}
          thresholds={{ warning: 70, danger: 90 }}
          subtitle={`${formatBytes(storage.usedBytes ?? 0)} / ${formatBytes(storage.totalBytes ?? 0)}`}
        />
      </div>

      {/* System summary */}
      <div className="mt-4 pt-3 border-t border-border/30">
        <p className="text-[10px] sm:text-xs text-foreground-muted truncate">{systemSummary}</p>
      </div>
    </SectionCard>
  );
}
