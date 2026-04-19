'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import LeadStageBadge, { getStageMeta } from './LeadStageBadge';
import type { LeadBackfillResponse, LeadStage } from '../lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (res: LeadBackfillResponse) => void;
}

type Phase = 'preview' | 'preview-loaded' | 'confirming' | 'done';

export default function LeadBackfillDialog({ open, onClose, onSuccess }: Props) {
  const [phase, setPhase] = useState<Phase>('preview');
  const [since, setSince] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<LeadBackfillResponse | null>(null);
  const [result, setResult] = useState<LeadBackfillResponse | null>(null);

  if (!open) return null;

  function reset() {
    setPhase('preview');
    setSince('');
    setLoading(false);
    setError(null);
    setPreview(null);
    setResult(null);
  }

  function handleClose() {
    if (loading) return;
    reset();
    onClose();
  }

  async function runPreview() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.backfillLeads({
        since: since ? since : null,
        dry_run: true,
      });
      setPreview(res);
      setPhase('preview-loaded');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview backfill');
    } finally {
      setLoading(false);
    }
  }

  async function runBackfill() {
    setLoading(true);
    setError(null);
    setPhase('confirming');
    try {
      const res = await api.backfillLeads({
        since: since ? since : null,
        dry_run: false,
      });
      setResult(res);
      setPhase('done');
      onSuccess?.(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backfill failed');
      setPhase('preview-loaded');
    } finally {
      setLoading(false);
    }
  }

  const active = result ?? preview;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-background-secondary border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col">
        {/* ─── Header ─── */}
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Import Signups into Pipeline</h3>
              <p className="text-xs text-foreground-muted mt-1">
                Classifies every existing reseller as a lead. Users already in the pipeline are skipped automatically.
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-foreground-muted hover:text-foreground p-1 -m-1 rounded disabled:opacity-40"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ─── Body ─── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Step 1: config / preview button */}
          {phase === 'preview' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Only users signed up since</label>
                <input
                  type="date"
                  className="input w-full"
                  value={since}
                  onChange={(e) => setSince(e.target.value)}
                />
                <p className="text-xs text-foreground-muted mt-1">
                  Leave empty to include all historical resellers.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background-tertiary/40 p-3 text-xs text-foreground-muted">
                <p className="font-medium text-foreground mb-1">How it works</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Runs a safe preview first — no leads are written.</li>
                  <li>You review the proposed stage for each user.</li>
                  <li>Re-run at any time — users already linked to a lead are skipped.</li>
                </ul>
              </div>
            </>
          )}

          {/* Step 2+: result summary */}
          {(phase === 'preview-loaded' || phase === 'confirming' || phase === 'done') && active && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <SummaryTile
                  label={phase === 'done' ? 'Leads created' : 'Candidates'}
                  value={phase === 'done' ? active.leads_created : active.candidates}
                  accent={phase === 'done' ? 'success' : 'primary'}
                />
                <SummaryTile label="Source" value={active.source_name ?? '—'} small />
                <SummaryTile label="Owner" value={active.admin_owner_email ?? '—'} small />
                <SummaryTile label="Since" value={active.since ?? 'All time'} small />
              </div>

              {Object.keys(active.stage_counts).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-2">Stage breakdown</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(active.stage_counts) as [LeadStage, number][]).map(([stage, count]) => (
                      <div key={stage} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background-tertiary border border-border">
                        <LeadStageBadge stage={stage} size="sm" />
                        <span className="text-xs font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {active.items.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-2">
                    {phase === 'done' ? 'Created leads' : 'Users that will be imported'} ({active.items.length})
                  </p>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="max-h-[40vh] overflow-y-auto divide-y divide-border">
                      {active.items.map((it) => {
                        const meta = getStageMeta(it.stage);
                        return (
                          <div key={it.user_id} className="flex items-start gap-2 px-3 py-2 text-sm">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{it.name}</span>
                                <span className={`badge ${meta.variant} text-[10px] flex-shrink-0`}>{meta.label}</span>
                              </div>
                              <div className="text-xs text-foreground-muted truncate">
                                {it.email || `user-${it.user_id}`}
                                {it.signup_date && <span className="ml-2">· {it.signup_date}</span>}
                              </div>
                              <div className="text-[11px] text-foreground-muted mt-0.5">{it.reason}</div>
                            </div>
                            {it.lead_id && (
                              <span className="text-[10px] text-foreground-muted flex-shrink-0 mt-0.5">
                                #{it.lead_id}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {active.candidates === 0 && (
                <div className="rounded-xl border border-border bg-background-tertiary/40 p-4 text-sm text-foreground-muted text-center">
                  {active.admin_owner_id === null
                    ? active.message
                    : 'Every reseller is already represented in the pipeline. Nothing to import.'}
                </div>
              )}

              {phase === 'done' && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  {active.message}
                </div>
              )}
            </>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {loading && phase !== 'done' && (
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {phase === 'confirming' ? 'Creating leads...' : 'Analyzing resellers...'}
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="px-5 py-3 border-t border-border flex gap-2 justify-end">
          {phase === 'preview' && (
            <>
              <button className="btn-secondary" onClick={handleClose} disabled={loading}>Cancel</button>
              <button className="btn-primary" onClick={runPreview} disabled={loading}>
                {loading ? 'Loading...' : 'Preview'}
              </button>
            </>
          )}

          {phase === 'preview-loaded' && (
            <>
              <button
                className="btn-secondary"
                onClick={() => { setPhase('preview'); setPreview(null); }}
                disabled={loading}
              >
                Back
              </button>
              <button
                className="btn-primary"
                onClick={runBackfill}
                disabled={loading || !preview || preview.candidates === 0 || preview.admin_owner_id === null}
              >
                {preview && preview.candidates > 0
                  ? `Import ${preview.candidates} lead${preview.candidates === 1 ? '' : 's'}`
                  : 'Nothing to import'}
              </button>
            </>
          )}

          {phase === 'confirming' && (
            <button className="btn-primary" disabled>Creating...</button>
          )}

          {phase === 'done' && (
            <button className="btn-primary" onClick={handleClose}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryTile({
  label, value, small, accent,
}: {
  label: string;
  value: string | number;
  small?: boolean;
  accent?: 'primary' | 'success';
}) {
  const valueClass =
    accent === 'success' ? 'text-green-400' :
    accent === 'primary' ? 'text-accent-primary' :
    'text-foreground';
  return (
    <div className="rounded-xl border border-border bg-background-tertiary/40 p-3">
      <p className="text-[10px] uppercase tracking-wide text-foreground-muted font-medium">{label}</p>
      <p className={`${small ? 'text-sm' : 'text-xl'} font-semibold mt-0.5 truncate ${valueClass}`} title={String(value)}>
        {value}
      </p>
    </div>
  );
}
