'use client';
import React, { useState } from 'react';
import SectionCard, { SectionEmpty } from './SectionCard';
import { TopDownloadersBody } from './TopDownloaders';
import { TopUsageBody } from './TopUsageThisPeriod';
import type { TopUsersResponse, ResellerTopUsageEntry } from '../../lib/types';

type Mode = 'live' | 'period';

// Unified "Top Users" card with a Live | Period toggle.
//  - Live   = current per-router bandwidth (MikroTik queue counters).
//  - Period = account-wide data-cap / FUP usage for the billing period.
// NOTE: Period is account-wide because the FUP endpoint has no router filter;
// making it per-router needs a backend change (add router_id to /resellers/me/usage/top).
export default function TopUsers({
  selectedRouterId,
  live,
  liveLoading,
  liveError,
  onRetryLive,
  period,
  periodLoading,
}: {
  selectedRouterId: number | null;
  live: TopUsersResponse | null;
  liveLoading: boolean;
  liveError: string | null;
  onRetryLive: () => void;
  period: ResellerTopUsageEntry[] | null;
  periodLoading: boolean;
}): React.ReactElement {
  const [mode, setMode] = useState<Mode>('live');
  // Live needs a router; fall back to Period when none is selected.
  const effectiveMode: Mode = mode === 'live' && !selectedRouterId ? 'period' : mode;

  const meta =
    effectiveMode === 'live' ? (
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        this router · live
      </span>
    ) : (
      <span>all routers · this period</span>
    );

  const controls = (
    <div className="flex gap-1 p-1 bg-background-tertiary rounded-lg">
      <button
        type="button"
        onClick={() => setMode('live')}
        disabled={!selectedRouterId}
        title={selectedRouterId ? 'Live bandwidth on the selected router' : 'Select a router to see live usage'}
        className={`period-pill whitespace-nowrap ${
          effectiveMode === 'live' ? 'period-pill-active' : 'period-pill-inactive'
        } ${!selectedRouterId ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        Live
      </button>
      <button
        type="button"
        onClick={() => setMode('period')}
        title="Data-cap / FUP usage this billing period (all routers)"
        className={`period-pill whitespace-nowrap ${
          effectiveMode === 'period' ? 'period-pill-active' : 'period-pill-inactive'
        }`}
      >
        Period
      </button>
    </div>
  );

  return (
    <SectionCard
      title="Top Users"
      accent="violet"
      controls={controls}
      meta={meta}
      loading={effectiveMode === 'live' ? liveLoading : periodLoading}
    >
      {effectiveMode === 'live' ? (
        selectedRouterId ? (
          <TopDownloadersBody data={live} loading={liveLoading} error={liveError} onRetry={onRetryLive} />
        ) : (
          <SectionEmpty message="Select a router to see live usage" />
        )
      ) : (
        <TopUsageBody data={period} loading={periodLoading} />
      )}
    </SectionCard>
  );
}
