'use client';
import React from 'react';
import { UsersIcon } from './icons';
import type { MikroTikMetrics } from '../../lib/types';

// Live bandwidth meters + active hotspot/PPPoE "online now" counts.
// Presentational only — rendered inside the combined Router Health card,
// which owns the card chrome, loading and error states.
export function LiveThroughputContent({ data }: { data: MikroTikMetrics }) {
  const bandwidth = data.bandwidth ?? { downloadMbps: 0, uploadMbps: 0 };
  const download = bandwidth.downloadMbps ?? 0;
  const upload = bandwidth.uploadMbps ?? 0;
  const maxSpeed = 100;
  const downloadPercent = Math.min((download / maxSpeed) * 100, 100);
  const uploadPercent = Math.min((upload / maxSpeed) * 100, 100);

  const activeHotspot = data.activeHotspotUsers ?? data.activeSessionCount ?? 0;
  const activePppoe = data.activePppoeUsers ?? data.activePppoeCount ?? 0;
  const activeTotal = data.activeTotalUsers ?? activeHotspot + activePppoe;
  const snapshotAgeSec = Math.round(data.snapshotAgeSeconds ?? 0);
  const hotspotAgeLabel = snapshotAgeSec > 0
    ? snapshotAgeSec < 60
      ? `updated ${snapshotAgeSec}s ago`
      : `updated ${Math.round(snapshotAgeSec / 60)}m ago`
    : 'snapshot';

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Bandwidth speedometer */}
      <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-background-tertiary to-background flex-1">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <span className="text-[10px] sm:text-xs text-foreground-muted uppercase tracking-wide font-medium">
            Live Bandwidth
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        <div className="space-y-3 sm:space-y-4">
          {/* Download */}
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm text-foreground-muted">Download</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-cyan-500 stat-value">
                {download.toFixed(2)}{' '}
                <span className="text-[10px] sm:text-xs font-normal">Mbps</span>
              </span>
            </div>
            <div className="h-3 bg-background rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500 relative"
                style={{ width: `${downloadPercent}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>

          {/* Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm text-foreground-muted">Upload</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-emerald-500 stat-value">
                {upload.toFixed(2)}{' '}
                <span className="text-[10px] sm:text-xs font-normal">Mbps</span>
              </span>
            </div>
            <div className="h-3 bg-background rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 relative"
                style={{ width: `${uploadPercent}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        </div>

        {/* Combined total */}
        <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-border/30 flex items-center justify-between">
          <span className="text-[10px] sm:text-xs text-foreground-muted">Total Throughput</span>
          <span className="text-xs sm:text-sm font-semibold text-foreground">
            {(download + upload).toFixed(2)} Mbps
          </span>
        </div>
      </div>

      {/* Active users "online now" */}
      <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-500/20 to-amber-500/5 flex flex-col items-center justify-center">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-2">
          <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
        </div>
        <div className="flex items-stretch gap-3 sm:gap-4">
          <div className="flex flex-col items-center" title={`Hotspot users — ${hotspotAgeLabel}`}>
            <span className="text-xl sm:text-2xl font-bold text-amber-500 stat-value leading-none">{activeHotspot}</span>
            <span className="text-[9px] sm:text-[10px] font-medium text-foreground-muted uppercase tracking-wide mt-1">Hotspot</span>
            <span className="text-[8px] sm:text-[9px] text-foreground-muted/70 mt-0.5">{hotspotAgeLabel}</span>
          </div>
          <div className="w-px bg-amber-500/20" />
          <div className="flex flex-col items-center" title="PPPoE users — live count">
            <span className="text-xl sm:text-2xl font-bold text-sky-400 stat-value leading-none">{activePppoe}</span>
            <span className="text-[9px] sm:text-[10px] font-medium text-foreground-muted uppercase tracking-wide mt-1">PPPoE</span>
            <span className="text-[8px] sm:text-[9px] text-emerald-400/80 mt-0.5">live</span>
          </div>
        </div>
        <span className="text-[9px] sm:text-[10px] text-foreground-muted mt-2">{activeTotal} active • online</span>
      </div>
    </div>
  );
}
