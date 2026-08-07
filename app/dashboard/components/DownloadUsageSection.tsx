'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { SkeletonCard } from '../../components/LoadingSpinner';
import { SectionError } from './SectionCard';
import type { BandwidthHistory } from '../../lib/types';
import type { DownloadUsageServiceFilter } from '../DownloadUsageChart';
import { DateFilter, USAGE_PERIOD_OPTIONS, isFilterEqual } from '../dateFilter';

const DownloadUsageChart = dynamic(() => import('../DownloadUsageChart'), {
  ssr: false,
  loading: () => <SkeletonCard />,
});

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

// Card-body-only variant so the usage view can live inside the combined
// "Ports & Usage" card (filters render as a row above the totals).
export function DownloadUsageBody({
  data,
  loading,
  error,
  onRetry,
  period,
  onPeriodChange,
  service,
  onServiceChange,
}: {
  data: BandwidthHistory | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  period: DateFilter;
  onPeriodChange: (filter: DateFilter) => void;
  service: DownloadUsageServiceFilter;
  onServiceChange: (s: DownloadUsageServiceFilter) => void;
}): React.JSX.Element {
  const totals = getDownloadUsageTotals(data);
  const selectedLabel =
    USAGE_PERIOD_OPTIONS.find((option) => isFilterEqual(option.filter, period))?.label ?? 'Selected period';
  // Prefer the window the backend actually served, so the caption can never
  // claim a period the numbers don't cover.
  const periodCaption = data?.periodLabel ?? selectedLabel;

  if (error) {
    return <SectionError message={error} onRetry={onRetry} />;
  }

  if (loading && !data) {
    return <div className="h-64 skeleton rounded-lg" />;
  }

  return (
    <div>
      {/* Filters + period meta */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-2">
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
            {USAGE_PERIOD_OPTIONS.map((option) => (
              <button
                key={option.label}
                onClick={() => onPeriodChange(option.filter)}
                className={`period-pill whitespace-nowrap flex-shrink-0 ${
                  isFilterEqual(option.filter, period) ? 'period-pill-active' : 'period-pill-inactive'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <span className="text-foreground-muted text-[10px] sm:text-xs">
          {periodCaption} &bull; {data?.count ?? 0} points
          {data?.periodTruncated ? ' • limited to the last 30 days' : ''}
        </span>
      </div>

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
    </div>
  );
}
