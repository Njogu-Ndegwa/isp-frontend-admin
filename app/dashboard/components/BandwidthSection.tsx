'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { SkeletonCard } from '../../components/LoadingSpinner';
import SectionCard, { SectionError } from './SectionCard';
import type { BandwidthHistory } from '../../lib/types';

const BandwidthChart = dynamic(() => import('../BandwidthChart'), {
  ssr: false,
  loading: () => <SkeletonCard />,
});

function formatUsageMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

export default function BandwidthSection({
  data,
  loading,
  error,
  onRetry,
}: {
  data: BandwidthHistory | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}): React.JSX.Element {
  if (error) {
    return (
      <SectionCard title="Bandwidth History" accent="cyan">
        <SectionError message={error} onRetry={onRetry} />
      </SectionCard>
    );
  }

  if (loading && !data) {
    return (
      <SectionCard title="Bandwidth History" accent="cyan" loading>
        <div className="h-48 skeleton rounded-lg" />
      </SectionCard>
    );
  }

  if (!data || data.history.length === 0) {
    return (
      <SectionCard title="Bandwidth History" accent="cyan">
        <div className="text-center py-8 text-foreground-muted">
          <p className="text-sm">No bandwidth data available yet</p>
        </div>
      </SectionCard>
    );
  }

  const latestPoint = data.history[data.history.length - 1];
  const maxDownload = Math.max(...data.history.map((d) => d.avgDownloadMbps ?? 0));
  const maxUpload = Math.max(...data.history.map((d) => d.avgUploadMbps ?? 0));
  const avgDownload =
    data.history.reduce((sum, d) => sum + (d.avgDownloadMbps ?? 0), 0) / data.history.length;
  const avgUpload =
    data.history.reduce((sum, d) => sum + (d.avgUploadMbps ?? 0), 0) / data.history.length;
  const hotspotUsageMb = data.history.reduce((sum, d) => sum + (d.hotspotTotalMB ?? 0), 0);
  const pppoeUsageMb = data.history.reduce((sum, d) => sum + (d.pppoeTotalMB ?? 0), 0);
  const trackedUsageMb = hotspotUsageMb + pppoeUsageMb;
  const hasTrackedUsage = trackedUsageMb > 0;

  const currentAvgMeta = (
    <span className="text-xs sm:text-sm font-semibold">
      <span className="text-cyan-500">&darr;{(latestPoint.avgDownloadMbps ?? 0).toFixed(2)}</span>
      <span className="text-foreground-muted mx-1">/</span>
      <span className="text-emerald-500">&uarr;{(latestPoint.avgUploadMbps ?? 0).toFixed(2)}</span>
      <span className="text-foreground-muted text-[10px] sm:text-xs ml-1">Mbps</span>
    </span>
  );

  return (
    <SectionCard
      title="Bandwidth History"
      accent="cyan"
      loading={loading}
      meta={
        <div className="text-right">
          <p className="text-[10px] sm:text-xs text-foreground-muted">
            Last {data.periodHours}h &bull; {data.count} points
          </p>
          <p className="text-[10px] sm:text-xs text-foreground-muted">Current Avg</p>
          {currentAvgMeta}
        </div>
      }
    >
      {/* Peak/Avg stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
        <div className="p-2.5 sm:p-3 rounded-lg bg-background-tertiary">
          <p className="text-[9px] sm:text-[10px] text-foreground-muted uppercase tracking-wide">Peak Down</p>
          <p className="text-base sm:text-lg font-bold text-cyan-500 stat-value">
            {maxDownload.toFixed(2)}{' '}
            <span className="text-[10px] sm:text-xs font-normal">Mbps</span>
          </p>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg bg-background-tertiary">
          <p className="text-[9px] sm:text-[10px] text-foreground-muted uppercase tracking-wide">Peak Up</p>
          <p className="text-base sm:text-lg font-bold text-emerald-500 stat-value">
            {maxUpload.toFixed(2)}{' '}
            <span className="text-[10px] sm:text-xs font-normal">Mbps</span>
          </p>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg bg-background-tertiary">
          <p className="text-[9px] sm:text-[10px] text-foreground-muted uppercase tracking-wide">Avg Down</p>
          <p className="text-base sm:text-lg font-bold text-foreground stat-value">
            {avgDownload.toFixed(2)}{' '}
            <span className="text-[10px] sm:text-xs font-normal">Mbps</span>
          </p>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg bg-background-tertiary">
          <p className="text-[9px] sm:text-[10px] text-foreground-muted uppercase tracking-wide">Avg Up</p>
          <p className="text-base sm:text-lg font-bold text-foreground stat-value">
            {avgUpload.toFixed(2)}{' '}
            <span className="text-[10px] sm:text-xs font-normal">Mbps</span>
          </p>
        </div>
      </div>

      {hasTrackedUsage && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
          <div className="p-2.5 sm:p-3 rounded-lg bg-background-tertiary">
            <p className="text-[9px] sm:text-[10px] text-foreground-muted uppercase tracking-wide">Tracked Total</p>
            <p className="text-base sm:text-lg font-bold text-foreground stat-value">{formatUsageMb(trackedUsageMb)}</p>
          </div>
          <div className="p-2.5 sm:p-3 rounded-lg bg-background-tertiary">
            <p className="text-[9px] sm:text-[10px] text-foreground-muted uppercase tracking-wide">Hotspot</p>
            <p className="text-base sm:text-lg font-bold text-amber-500 stat-value">{formatUsageMb(hotspotUsageMb)}</p>
          </div>
          <div className="p-2.5 sm:p-3 rounded-lg bg-background-tertiary">
            <p className="text-[9px] sm:text-[10px] text-foreground-muted uppercase tracking-wide">PPPoE</p>
            <p className="text-base sm:text-lg font-bold text-violet-500 stat-value">{formatUsageMb(pppoeUsageMb)}</p>
          </div>
        </div>
      )}

      <BandwidthChart data={data.history} />
    </SectionCard>
  );
}
