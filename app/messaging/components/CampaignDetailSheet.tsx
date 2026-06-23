'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '../../lib/api';
import { SmsCampaignDetail } from '../../lib/types';

// ─── Status badge (re-exported for use in ActivityView) ──────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'text-success bg-emerald-500/10 border-emerald-500/20',
    sent: 'text-success bg-emerald-500/10 border-emerald-500/20',
    delivered: 'text-success bg-emerald-500/10 border-emerald-500/20',
    partial: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    sending: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    queued: 'text-foreground-muted bg-background-tertiary border-border',
    failed: 'text-danger bg-red-500/10 border-red-500/20',
    canceled: 'text-foreground-muted bg-background-tertiary border-border',
  };
  const cls = map[status] ?? 'text-foreground-muted bg-background-tertiary border-border';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status}
    </span>
  );
}

// ─── Status dot for per-recipient rows ───────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    sent: 'bg-emerald-500',
    delivered: 'bg-emerald-500',
    completed: 'bg-emerald-500',
    failed: 'bg-red-500',
    queued: 'bg-foreground-muted',
    sending: 'bg-amber-500',
    partial: 'bg-amber-500',
    canceled: 'bg-foreground-muted',
  };
  const color = colorMap[status] ?? 'bg-foreground-muted';
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${color}`} />;
}

// ─── Filter tab types ─────────────────────────────────────────────────────────
type FilterTab = 'all' | 'sent' | 'failed';

const SETTLED_STATUSES = new Set(['completed', 'failed', 'canceled', 'partial']);

function isSettled(status: string): boolean {
  return SETTLED_STATUSES.has(status);
}

// ─── CampaignDetailSheet ──────────────────────────────────────────────────────
export function CampaignDetailSheet({ campaignId, onClose }: { campaignId: number; onClose: () => void }) {
  const [detail, setDetail] = useState<SmsCampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lock body scroll on mount
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const d = await api.getSmsCampaign(campaignId);
        if (!cancelled) {
          setDetail(d);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load campaign');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [campaignId]);

  // Polling while queued or sending
  useEffect(() => {
    const shouldPoll = detail && !isSettled(detail.status);
    if (!shouldPoll) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(async () => {
      try {
        const d = await api.getSmsCampaign(campaignId);
        setDetail(d);
        if (isSettled(d.status)) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch {
        // silently ignore poll errors
      }
    }, 4000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [campaignId, detail]);

  // Filtered messages
  const filteredMessages = detail?.messages.filter((msg) => {
    if (filterTab === 'all') return true;
    if (filterTab === 'sent') return msg.status === 'sent' || msg.status === 'delivered';
    if (filterTab === 'failed') return msg.status === 'failed';
    return true;
  }) ?? [];

  const filterTabs: { value: FilterTab; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'sent', label: 'Sent' },
    { value: 'failed', label: 'Failed' },
  ];

  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative bg-background-secondary border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl max-h-[80vh] flex flex-col"
        style={{ paddingBottom: 'max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        {/* Grab handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-foreground">
              Campaign #{campaignId}
            </h3>
            {detail && <StatusBadge status={detail.status} />}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-[3px] border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          )}

          {error && !loading && (
            <p className="text-sm text-danger py-4">{error}</p>
          )}

          {detail && !loading && (
            <>
              {/* Counts row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted mb-4">
                <span>
                  <span className="text-success font-medium">{detail.counts.sent}</span> sent
                </span>
                <span>
                  <span className="text-danger font-medium">{detail.counts.failed}</span> failed
                </span>
                <span>
                  <span className="text-foreground font-medium">{detail.counts.queued}</span> queued
                </span>
                {detail.counts.delivered > 0 && (
                  <span>
                    <span className="text-success font-medium">{detail.counts.delivered}</span> delivered
                  </span>
                )}
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1 mb-3">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setFilterTab(tab.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filterTab === tab.value
                        ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/30'
                        : 'text-foreground-muted hover:text-foreground bg-background-tertiary border border-border'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Messages list */}
              <div className="space-y-0">
                {filteredMessages.length === 0 ? (
                  <p className="text-sm text-foreground-muted py-6 text-center">No messages match this filter.</p>
                ) : (
                  filteredMessages.map((msg, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-3 py-2.5 border-b border-border last:border-0"
                    >
                      {/* Name + phone */}
                      <div className="flex-1 min-w-0">
                        {msg.name ? (
                          <>
                            <p className="text-sm font-semibold text-foreground truncate">{msg.name}</p>
                            <p className="text-xs text-foreground-muted font-mono">{msg.phone}</p>
                          </>
                        ) : (
                          <p className="text-sm text-foreground font-mono">{msg.phone}</p>
                        )}
                        {msg.error && (
                          <p className="text-xs text-danger mt-0.5">{msg.error}</p>
                        )}
                      </div>
                      {/* Status dot */}
                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        <StatusDot status={msg.status} />
                        <span className="text-xs text-foreground-muted capitalize">{msg.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CampaignDetailSheet;
