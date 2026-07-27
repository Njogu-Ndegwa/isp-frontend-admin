'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../../lib/api';
import { SmsCampaign } from '../../lib/types';
import { PageLoader } from '../../components/LoadingSpinner';
import { CampaignDetailSheet, StatusBadge } from './CampaignDetailSheet';

// ─── Date helper ─────────────────────────────────────────────────────────────
function fmtDate(dateStr: string | null | undefined): string {
  try {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isActive(status: string): boolean {
  return status === 'queued' || status === 'sending';
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-foreground-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold text-foreground ${valueClass ?? ''}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

// ─── ActivityView ─────────────────────────────────────────────────────────────
export function ActivityView({ focusCampaignId }: { focusCampaignId?: number }) {
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const focusRef = useRef<HTMLButtonElement | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await api.getSmsCampaigns();
      setCampaigns(res.campaigns);
      setError(null);
      return res.campaigns;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
      return null;
    }
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const result = await fetchCampaigns();
      if (!cancelled && result === null) {
        // error already set in fetchCampaigns
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [fetchCampaigns]);

  // Set up / tear down polling based on whether any campaign is active
  useEffect(() => {
    const anyActive = campaigns.some((c) => isActive(c.status));

    if (!anyActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (intervalRef.current) return; // already polling

    intervalRef.current = setInterval(async () => {
      const result = await fetchCampaigns();
      if (result !== null) {
        const stillActive = result.some((c) => isActive(c.status));
        if (!stillActive && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 4000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [campaigns, fetchCampaigns]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Scroll focused campaign into view
  useEffect(() => {
    if (focusCampaignId && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusCampaignId, loading]);

  // ─── Computed stats ─────────────────────────────────────────────────────────
  const totalSent = campaigns.reduce((acc, c) => acc + c.sent_count, 0);
  const totalFailed = campaigns.reduce((acc, c) => acc + c.failed_count, 0);
  const inProgress = campaigns.filter((c) => isActive(c.status)).length;
  const totalRefunded = campaigns.reduce((acc, c) => acc + c.refunded_credits, 0);

  // ─── Render states ──────────────────────────────────────────────────────────
  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="card p-5 text-center">
        <p className="text-sm text-danger mb-3">{error}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            fetchCampaigns().finally(() => setLoading(false));
          }}
          className="btn-primary px-4 py-2 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="card p-8 text-center">
        <svg
          className="w-10 h-10 mx-auto text-foreground-muted mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"
          />
        </svg>
        <p className="text-sm text-foreground-muted">
          No campaigns yet. Send your first message from the Compose tab.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Stat cards — 2x2 on mobile, 4-across on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Sent" value={totalSent} valueClass="text-success" />
        <StatCard label="Failed" value={totalFailed} valueClass={totalFailed > 0 ? 'text-danger' : undefined} />
        <StatCard label="In progress" value={inProgress} />
        <StatCard label="Refunded credits" value={totalRefunded} />
      </div>

      {/* Campaign list */}
      <div className="space-y-3">
        {campaigns.map((c) => {
          const isFocused = c.id === focusCampaignId;
          const active = isActive(c.status);

          return (
            <button
              key={c.id}
              ref={isFocused ? focusRef : null}
              type="button"
              onClick={() => setDetailId(c.id)}
              className={`w-full card p-4 text-left hover:border-accent-primary/30 transition-colors ${
                isFocused ? 'border-amber-500/50' : ''
              }`}
            >
              {/* Body preview + badge */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm text-foreground line-clamp-2 flex-1">
                  {c.body.length > 120 ? c.body.slice(0, 120) + '…' : c.body}
                </p>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusBadge status={c.status} />
                  {active && (
                    <span className="text-xs text-foreground-muted">
                      {c.sent_count}/{c.recipient_count}
                    </span>
                  )}
                </div>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
                <span>{fmtDate(c.created_at)}</span>
                <span>{c.recipient_count.toLocaleString()} recipients</span>
                <span className="text-success">{c.sent_count.toLocaleString()} sent</span>
                {c.failed_count > 0 && (
                  <span className="text-danger">{c.failed_count.toLocaleString()} failed</span>
                )}
                <span>{c.total_credits.toLocaleString()} credits</span>
                {c.refunded_credits > 0 && (
                  <span className="text-success">{c.refunded_credits.toLocaleString()} refunded</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Campaign detail sheet */}
      {detailId !== null && (
        <CampaignDetailSheet
          campaignId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </>
  );
}

export default ActivityView;
