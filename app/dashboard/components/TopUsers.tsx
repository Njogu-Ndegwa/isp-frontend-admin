'use client';
import React from 'react';
import SectionCard from './SectionCard';
import { TopDownloadersBody } from './TopDownloaders';
import type { TopUsersResponse, TopUsersWindow } from '../../lib/types';
import { useT } from '../../lib/i18n';

const WINDOWS: { key: TopUsersWindow; label: string }[] = [
  { key: '1h', label: 'Last hour' },
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
];

// Top users by data actually used in the chosen window (hourly per-customer
// ledger on the backend). Replaces the old "Live" list, which ranked lifetime
// router counters and could put a customer who expired months ago at the top.
export default function TopUsers({
  selectedRouterId,
  data,
  loading,
  error,
  onRetry,
  window: usageWindow,
  onWindowChange,
}: {
  selectedRouterId: number | null;
  data: TopUsersResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  window: TopUsersWindow;
  onWindowChange: (w: TopUsersWindow) => void;
}): React.ReactElement {
  const t = useT();
  const active = WINDOWS.find((w) => w.key === usageWindow) ?? WINDOWS[1];
  const scope = selectedRouterId ? t('this router') : t('all routers');
  const historyNote =
    data && data.windowFullyCovered === false && data.historySince
      ? t('data since {date}', { date: new Date(data.historySince + 'Z').toLocaleDateString() })
      : null;

  const meta = (
    <span>
      {scope} · {t(data?.windowLabel || active.label)}
      {historyNote ? ` · ${historyNote}` : ''}
    </span>
  );

  const controls = (
    <div className="flex gap-1 p-1 bg-background-tertiary rounded-lg">
      {WINDOWS.map((w) => (
        <button
          key={w.key}
          type="button"
          onClick={() => onWindowChange(w.key)}
          className={`period-pill whitespace-nowrap ${
            usageWindow === w.key ? 'period-pill-active' : 'period-pill-inactive'
          }`}
        >
          {t(w.label)}
        </button>
      ))}
    </div>
  );

  return (
    <SectionCard title={t('Top Users')} accent="violet" controls={controls} meta={meta} loading={loading}>
      <TopDownloadersBody data={data} loading={loading} error={error} onRetry={onRetry} />
    </SectionCard>
  );
}
