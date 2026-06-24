'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { SkeletonCard } from '../../components/LoadingSpinner';
import SectionCard, { SectionError } from './SectionCard';
import type { BandwidthHistory } from '../../lib/types';
import type { DownloadUsageServiceFilter } from '../DownloadUsageChart';

const DownloadUsageChart = dynamic(() => import('../DownloadUsageChart'), {
  ssr: false,
  loading: () => <SkeletonCard />,
});

const DOWNLOAD_USAGE_PERIOD_OPTIONS: { hours: number; label: string }[] = [
  { hours: 24, label: '24h' },
  { hours: 72, label: '3D' },
  { hours: 168, label: '7D' },
  { hours: 720, label: '30D' },
];

const DOWNLOAD_USAGE_SERVICE_OPTIONS: { value: DownloadUsageServiceFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'hotspot', label: 'Hotspot' },
  { value: 'pppoe', label: 'PPPoE' },
];

function formatUsageMb(mb: number): string {
  if (!Number.isFinite(mb) || mb <= 0) return '0 MB';
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

function getDownloadUsageTotals(data: BandwidthHistory | null) {
  const history = data?.history ?? [];
  return history.reduce(
    (totals, point) => {
      const hotspot = point.hotspotDownloadMB ?? 0;
      const pppoe = point.pppoeDownloadMB ?? 0;
      const tracked = point.trackedDownloadMB ?? (hotspot + pppoe);
      totals.hotspot += hotspot;
      totals.pppoe += pppoe;
      totals.all += tracked;
      return totals;
    },
    { all: 0, hotspot: 0, pppoe: 0 }
  );
}

export default function DownloadUsageSection({
  data,
  loading,
  error,
  onRetry,
  hours,
  onHoursChange,
  service,
  onServiceChange,
}: {
  data: BandwidthHistory | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  hours: number;
  onHoursChange: (h: number) => void;
  service: DownloadUsageServiceFilter;
  onServiceChange: (s: DownloadUsageServiceFilter) => void;
}): React.JSX.Element {
  const totals = getDownloadUsageTotals(data);

  const controls = (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex gap-1 p-1 bg-background-tertiary rounded-lg overflow-x-auto no-scrollbar">
        {DOWNLOAD_USAGE_SERVICE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onServiceChange(option.value)}
            className={`period-pill whitespace-nowrap flex-shrink-0 ${
              service === option.value ? 'period-pill-active' : 'period-pill-inactive'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1 p-1 bg-background-tertiary rounded-lg overflow-x-auto no-scrollbar">
        {DOWNLOAD_USAGE_PERIOD_OPTIONS.map((option) => (
          <button
            key={option.hours}
            onClick={() => onHoursChange(option.hours)}
            className={`period-pill whitespace-nowrap flex-shrink-0 ${
              hours === option.hours ? 'period-pill-active' : 'period-pill-inactive'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (error) {
    return (
      <SectionCard title="Download Usage" accent="cyan">
        <SectionError message={error} onRetry={onRetry} />
      </SectionCard>
    );
  }

  if (loading && !data) {
    return (
      <SectionCard title="Download Usage" accent="cyan" loading>
        <div className="h-64 skeleton rounded-lg" />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Download Usage"
      accent="cyan"
      loading={loading}
      meta={
        <span className="text-foreground-muted text-[10px] sm:text-xs">
          Last {data?.periodHours ?? hours}h &bull; {data?.count ?? 0} points
        </span>
      }
      controls={controls}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
        <div className="p-2.5 sm:p-3 rounded-lg bg-background-tertiary">
          <p className="text-[9px] sm:text-[10px] text-foreground-muted uppercase tracking-wide">Total Download</p>
          <p className="text-base sm:text-lg font-bold text-cyan-500 stat-value">{formatUsageMb(totals.all)}</p>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg bg-background-tertiary">
          <p className="text-[9px] sm:text-[10px] text-foreground-muted uppercase tracking-wide">Hotspot Download</p>
          <p className="text-base sm:text-lg font-bold text-amber-500 stat-value">{formatUsageMb(totals.hotspot)}</p>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg bg-background-tertiary">
          <p className="text-[9px] sm:text-[10px] text-foreground-muted uppercase tracking-wide">PPPoE Download</p>
          <p className="text-base sm:text-lg font-bold text-violet-500 stat-value">{formatUsageMb(totals.pppoe)}</p>
        </div>
      </div>

      <DownloadUsageChart data={data?.history ?? []} service={service} />
    </SectionCard>
  );
}
