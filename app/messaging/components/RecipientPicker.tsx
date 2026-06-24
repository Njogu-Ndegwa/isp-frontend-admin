'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../lib/api';
import { SmsRecipient, Plan } from '../../lib/types';
import {
  AudienceMode,
  RecipientSelection,
  MODE_LABELS,
  buildRecipientSelection,
} from '../lib/recipientSelection';

// Re-export shared types so existing importers keep working.
export type { AudienceMode, RecipientSelection };

interface RecipientPickerProps {
  plans: Plan[];
  value: RecipientSelection;
  onChange: (sel: RecipientSelection) => void;
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
  // ── Mode-stable selection model ───────────────────────────────────────────
  // `baseAll` + `overrides` are reset ONLY on mode/plan change (see effect
  // below) — never on search or pagination — so deselections survive a search
  // and "select none" is honored across unloaded pages.
  //   baseAll === true  → overrides means "excluded"
  //   baseAll === false → overrides means "included"
  const [baseAll, setBaseAll] = useState<boolean>(value.mode !== 'specific');
  const [overrides, setOverrides] = useState<Set<number>>(new Set());
  const offsetRef = useRef(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read mode/planId via a ref inside the fetch callback so it stays stable
  // (no identity churn) while still seeing the latest values.
  const ctxRef = useRef({ mode, planId });
  ctxRef.current = { mode, planId };
  const PAGE_SIZE = 50;

  // A row is ticked iff: baseAll ? !overrides.has(id) : overrides.has(id)
  const isChecked = useCallback(
    (id: number) => (baseAll ? !overrides.has(id) : overrides.has(id)),
    [baseAll, overrides],
  );

  // Fetch recipients list. Stable identity: reads mode/planId from a ref and
  // never touches the selection model (baseAll/overrides).
  const fetchRecipients = useCallback(
    async (searchVal: string, reset: boolean) => {
      const { mode: m, planId: pid } = ctxRef.current;
      if (m === 'by_plan' && !pid) {
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
          filter: m === 'specific' ? 'all' : m,
          planId: m === 'by_plan' ? pid : undefined,
          search: searchVal || undefined,
          limit: PAGE_SIZE,
          offset,
        });

        setTotalCount(res.count);
        setHasMore(res.has_more);

        if (reset) {
          setRecipients(res.recipients);
          offsetRef.current = res.recipients.length;
        } else {
          setRecipients((prev) => {
            const merged = [...prev, ...res.recipients];
            offsetRef.current = merged.length;
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
    [],
  );

  // Re-fetch AND reset the selection model when mode or planId changes.
  useEffect(() => {
    offsetRef.current = 0;
    setSearch('');
    setBaseAll(mode !== 'specific');
    setOverrides(new Set());
    fetchRecipients('', true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, planId]);

  // Debounced search — does NOT touch the selection model.
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

  // Emit selection upward whenever the model or count changes.
  useEffect(() => {
    const sel = buildRecipientSelection({
      mode,
      planId,
      baseAll,
      overrides: Array.from(overrides),
      totalCount,
    });
    onChange(sel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseAll, overrides, mode, planId, totalCount]);

  // Safety: restore body scroll if this picker unmounts while the sheet is open.
  useEffect(() => {
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── Interaction handlers ──────────────────────────────────────────────────
  const handleModeChange = (m: AudienceMode) => {
    setMode(m);
    if (m !== 'by_plan') setPlanId(undefined);
  };

  // Toggle a single row. When baseAll, unticking adds to overrides (exclude)
  // and ticking removes; when !baseAll, ticking adds (include) and unticking
  // removes.
  const toggleCheck = (id: number) => {
    setOverrides((prev) => {
      const next = new Set(prev);
      const currentlyChecked = baseAll ? !next.has(id) : next.has(id);
      const wantChecked = !currentlyChecked;
      if (baseAll) {
        // override = excluded
        if (wantChecked) next.delete(id);
        else next.add(id);
      } else {
        // override = included
        if (wantChecked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setBaseAll(true);
    setOverrides(new Set());
  };
  const selectNone = () => {
    setBaseAll(false);
    setOverrides(new Set());
  };

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

  // Chips for specific-mode selected recipients (specific mode: overrides = included)
  const selectedRecipients = mode === 'specific'
    ? recipients.filter((r) => overrides.has(r.customer_id))
    : [];

  // ── Inner list ─────────────────────────────────────────────────────────────
  // Rendered as a plain function (never `<RecipientList/>`) so it doesn't become
  // a fresh component type each render — that would remount the search input and
  // drop focus per keystroke. `inline` = desktop in-page panel (bounded, scrolls
  // within itself); otherwise it fills the mobile sheet's height.
  const renderList = (inline: boolean) => (
    <div className={inline ? 'flex flex-col' : 'flex flex-col h-full'}>
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
          <span className="ml-auto">{value.count.toLocaleString()} selected</span>
        </div>
      )}

      {/* List — bounded height inline (≈7 rows then scroll); fills the sheet otherwise */}
      <div className={inline ? 'overflow-y-auto max-h-80' : 'overflow-y-auto flex-1'}>
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
                    checked={isChecked(r.customer_id)}
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
          className="text-sm text-accent-primary hover:underline shrink-0 lg:hidden"
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

      {/* Inline list — desktop only. The in-page panel replaces the modal:
          search, select-all/none and the scrollable checkable list live right
          here so you tick people without opening anything. Mobile keeps the
          sheet (the trigger above is lg:hidden). */}
      <div className="hidden lg:block border border-border rounded-xl overflow-hidden">
        {renderList(true)}
      </div>

      {/* ── Bottom sheet (mobile) / centered panel (desktop) ─────────────────
          Portaled to <body> so an ancestor with a CSS transform (e.g. the
          `.card` hover-lift) can't become the containing block and trap this
          fixed overlay inside the card. */}
      {open && typeof document !== 'undefined' && createPortal(
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

            {/* List fills the sheet height on mobile. */}
            <div className="flex-1 overflow-hidden">
              {renderList(false)}
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
                Done · {value.count.toLocaleString()} selected
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
