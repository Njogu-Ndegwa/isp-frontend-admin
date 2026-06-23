'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../../lib/api';
import { SmsRecipient, Plan } from '../../lib/types';

// ─── Public types ─────────────────────────────────────────────────────────────
export type AudienceMode = 'all' | 'active' | 'expiring' | 'by_plan' | 'specific';

export interface RecipientSelection {
  mode: AudienceMode;
  planId?: number;
  // resolved send descriptor for the API:
  filter?: string;
  customer_ids?: number[];
  exclude_customer_ids?: number[];
  count: number;
  summaryLabel: string; // e.g. "Active · 60 of 62"
}

interface RecipientPickerProps {
  plans: Plan[];
  value: RecipientSelection;
  onChange: (sel: RecipientSelection) => void;
}

// ─── Mode pill labels ─────────────────────────────────────────────────────────
const MODE_LABELS: Record<AudienceMode, string> = {
  all: 'All',
  active: 'Active',
  expiring: 'Expiring (7d)',
  by_plan: 'By plan',
  specific: 'Specific people',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildSelection(
  mode: AudienceMode,
  planId: number | undefined,
  totalCount: number,
  checked: Set<number>,
  allIds: number[],
): RecipientSelection {
  if (mode === 'specific') {
    const ids = Array.from(checked);
    return {
      mode,
      planId,
      customer_ids: ids,
      count: ids.length,
      summaryLabel: `Specific · ${ids.length} selected`,
    };
  }

  // Segment modes: tracked as excludes
  const excluded = allIds.filter((id) => !checked.has(id));
  const effectiveCount = totalCount - excluded.length;
  const filter = mode === 'by_plan' ? 'by_plan' : mode;
  const label =
    excluded.length === 0
      ? `${MODE_LABELS[mode]} · ${totalCount.toLocaleString()}`
      : `${MODE_LABELS[mode]} · ${effectiveCount.toLocaleString()} of ${totalCount.toLocaleString()}`;

  return {
    mode,
    planId,
    filter,
    exclude_customer_ids: excluded.length > 0 ? excluded : undefined,
    count: effectiveCount,
    summaryLabel: label,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────
export function RecipientPicker({ plans, value, onChange }: RecipientPickerProps) {
  const [open, setOpen] = useState(false); // sheet/panel open on mobile
  const [mode, setMode] = useState<AudienceMode>(value.mode);
  const [planId, setPlanId] = useState<number | undefined>(value.planId);
  const [recipients, setRecipients] = useState<SmsRecipient[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [allPageIds, setAllPageIds] = useState<number[]>([]);
  const offsetRef = useRef(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PAGE_SIZE = 50;

  // Fetch recipients list (resets on mode/plan/search change)
  const fetchRecipients = useCallback(
    async (searchVal: string, reset: boolean) => {
      if (mode === 'by_plan' && !planId) {
        setRecipients([]);
        setTotalCount(0);
        setHasMore(false);
        return;
      }
      if (reset) setLoading(true);
      else setLoadingMore(true);

      try {
        const offset = reset ? 0 : offsetRef.current;
        const res = await api.getSmsRecipients({
          filter: mode === 'specific' ? 'all' : mode,
          planId: mode === 'by_plan' ? planId : undefined,
          search: searchVal || undefined,
          limit: PAGE_SIZE,
          offset,
        });

        setTotalCount(res.count);
        setHasMore(res.has_more);

        if (reset) {
          setRecipients(res.recipients);
          offsetRef.current = res.recipients.length;
          // Default-tick behavior: segment modes = all ticked; specific = none
          const ids = res.recipients.map((r) => r.customer_id);
          setAllPageIds(ids);
          if (mode !== 'specific') {
            // Keep previously-unchecked items unchecked (on refresh), or default all checked
            setCheckedIds((prev) => {
              if (prev.size === 0) return new Set(ids);
              // preserve intentional deselections
              const unchecked = allPageIds.filter((id) => !prev.has(id));
              const uncheckedSet = new Set(unchecked);
              return new Set(ids.filter((id) => !uncheckedSet.has(id)));
            });
          } else {
            // specific mode: keep selection
          }
        } else {
          setRecipients((prev) => {
            const merged = [...prev, ...res.recipients];
            offsetRef.current = merged.length;
            const newIds = res.recipients.map((r) => r.customer_id);
            setAllPageIds((prevIds) => [...prevIds, ...newIds]);
            if (mode !== 'specific') {
              // Auto-tick newly loaded rows
              setCheckedIds((prevChecked) => {
                const updated = new Set(prevChecked);
                newIds.forEach((id) => updated.add(id));
                return updated;
              });
            }
            return merged;
          });
        }
      } catch {
        // ignore; keep stale data
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [mode, planId, allPageIds],
  );

  // Re-fetch when mode or planId changes
  useEffect(() => {
    offsetRef.current = 0;
    setSearch('');
    setCheckedIds(new Set());
    setAllPageIds([]);
    fetchRecipients('', true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, planId]);

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      offsetRef.current = 0;
      fetchRecipients(search, true);
    }, 350);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Emit selection upward whenever checked / mode / count changes
  useEffect(() => {
    const sel = buildSelection(mode, planId, totalCount, checkedIds, allPageIds);
    onChange(sel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedIds, mode, planId, totalCount]);

  // ── Interaction handlers ──────────────────────────────────────────────────
  const handleModeChange = (m: AudienceMode) => {
    setMode(m);
    if (m !== 'by_plan') setPlanId(undefined);
  };

  const toggleCheck = (id: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setCheckedIds(new Set(allPageIds));
  const selectNone = () => setCheckedIds(new Set());

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    fetchRecipients(search, false);
  };

  // ── Mobile sheet ──────────────────────────────────────────────────────────
  const openSheet = () => {
    document.body.style.overflow = 'hidden';
    setOpen(true);
  };

  const closeSheet = () => {
    document.body.style.overflow = '';
    setOpen(false);
  };

  // Chips for specific-mode selected recipients
  const selectedRecipients = mode === 'specific'
    ? recipients.filter((r) => checkedIds.has(r.customer_id))
    : [];

  // ── Inner list ─────────────────────────────────────────────────────────────
  const RecipientList = () => (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-3 pb-2 border-b border-border">
        <input
          className="input text-sm w-full"
          placeholder="Search name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Select all / none */}
      {recipients.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border text-xs text-foreground-muted">
          <button type="button" onClick={selectAll} className="text-accent-primary hover:underline">
            Select all
          </button>
          <span>·</span>
          <button type="button" onClick={selectNone} className="text-accent-primary hover:underline">
            Select none
          </button>
          <span className="ml-auto">{checkedIds.size} selected</span>
        </div>
      )}

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-[3px] border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : recipients.length === 0 ? (
          <div className="py-8 text-center text-sm text-foreground-muted">
            {search ? 'No results for this search.' : 'No recipients found.'}
          </div>
        ) : (
          <ul>
            {recipients.map((r) => (
              <li key={r.customer_id}>
                <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-background-tertiary cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="accent-amber-500 w-4 h-4 shrink-0"
                    checked={checkedIds.has(r.customer_id)}
                    onChange={() => toggleCheck(r.customer_id)}
                  />
                  <div className="flex-1 min-w-0">
                    {r.name && (
                      <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                    )}
                    <p className={`text-sm font-mono ${r.name ? 'text-foreground-muted text-xs' : 'text-foreground'}`}>
                      {r.phone}
                    </p>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="py-3 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="text-sm text-accent-primary hover:underline disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Mode pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(Object.keys(MODE_LABELS) as AudienceMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              mode === m
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                : 'bg-background-tertiary border-border text-foreground-muted hover:text-foreground'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* By-plan dropdown */}
      {mode === 'by_plan' && (
        <select
          className="select"
          value={planId ?? ''}
          onChange={(e) => setPlanId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Select a plan…</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {/* Summary row + mobile open button */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-foreground-muted">
          {loading ? (
            <span className="animate-pulse">Counting…</span>
          ) : (
            <span>
              <span className="font-semibold text-foreground">{value.count.toLocaleString()}</span>
              {' '}recipient{value.count !== 1 ? 's' : ''}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={openSheet}
          className="text-sm text-accent-primary hover:underline shrink-0"
        >
          {mode === 'specific' ? 'Pick people' : 'Edit recipients'}
        </button>
      </div>

      {/* Chips for specific mode */}
      {mode === 'specific' && selectedRecipients.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedRecipients.map((r) => (
            <span
              key={r.customer_id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500"
            >
              {r.name ?? r.phone}
              <button
                type="button"
                onClick={() => toggleCheck(r.customer_id)}
                className="ml-0.5 hover:text-amber-300"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Bottom sheet (mobile) / inline panel (desktop) ─────────────────── */}
      {open && (
        <div className="fixed inset-0 z-[10000] flex flex-col items-end sm:items-center justify-end sm:justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeSheet} />

          {/* Sheet */}
          <div
            className="relative bg-background-secondary border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg flex flex-col shadow-xl"
            style={{
              maxHeight: '85vh',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Grab handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1.5 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Select recipients</h3>
              <button
                type="button"
                onClick={closeSheet}
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-hidden">
              <RecipientList />
            </div>

            {/* Sticky Done bar */}
            <div
              className="sticky bottom-0 border-t border-border bg-background-secondary px-4 py-3"
              style={{ paddingBottom: 'max(0.75rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))' }}
            >
              <button
                type="button"
                onClick={closeSheet}
                className="w-full btn-primary py-2.5 text-sm font-semibold"
              >
                Done · {checkedIds.size.toLocaleString()} selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
