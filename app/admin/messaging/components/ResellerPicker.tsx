'use client';

import { useState, useCallback } from 'react';
import { AdminReseller } from '../../../lib/types';

// ─── Descriptor emitted to parent ─────────────────────────────────────────────
export interface ResellerSelection {
  reseller_ids: number[] | null; // null means all_resellers=true
  all_resellers: boolean;
  count: number;
}

interface ResellerPickerProps {
  resellers: AdminReseller[];
  loading: boolean;
  value: ResellerSelection;
  onChange: (sel: ResellerSelection) => void;
}

// ─── Helper: build display name ───────────────────────────────────────────────
function displayName(r: AdminReseller): string {
  return r.organization_name || r.email;
}

// ─── ResellerPicker ───────────────────────────────────────────────────────────
export function ResellerPicker({ resellers, loading, value, onChange }: ResellerPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const openSheet = () => {
    document.body.style.overflow = 'hidden';
    setOpen(true);
  };
  const closeSheet = () => {
    document.body.style.overflow = '';
    setOpen(false);
  };

  // ── All-resellers toggle ─────────────────────────────────────────────────
  const toggleAllResellers = useCallback(() => {
    if (value.all_resellers) {
      // Switch to none selected
      onChange({ reseller_ids: [], all_resellers: false, count: 0 });
    } else {
      // Switch to all
      onChange({ reseller_ids: null, all_resellers: true, count: resellers.length });
    }
  }, [value.all_resellers, resellers.length, onChange]);

  // ── Individual toggle ────────────────────────────────────────────────────
  const toggleReseller = useCallback((id: number) => {
    const current = value.reseller_ids ?? [];
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    onChange({
      reseller_ids: next,
      all_resellers: false,
      count: next.length,
    });
  }, [value.reseller_ids, onChange]);

  const selectAll = () => {
    onChange({ reseller_ids: null, all_resellers: true, count: resellers.length });
  };

  const selectNone = () => {
    onChange({ reseller_ids: [], all_resellers: false, count: 0 });
  };

  const isChecked = (id: number) =>
    value.all_resellers || (value.reseller_ids ?? []).includes(id);

  const filtered = search.trim()
    ? resellers.filter((r) =>
        displayName(r).toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase())
      )
    : resellers;

  // Chips for individually selected resellers
  const selectedResellers = value.all_resellers
    ? []
    : resellers.filter((r) => (value.reseller_ids ?? []).includes(r.id));

  // ── Inner list JSX (inlined to avoid "component defined during render" lint) ──
  const resellerListJsx = (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-3 pb-2 border-b border-border">
        <input
          className="input text-sm w-full"
          placeholder="Search reseller name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Select all / none */}
      {resellers.length > 0 && (
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

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-[3px] border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-foreground-muted">
            {search ? 'No resellers match this search.' : 'No resellers found.'}
          </div>
        ) : (
          <ul>
            {filtered.map((r) => (
              <li key={r.id}>
                <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-background-tertiary cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="accent-amber-500 w-4 h-4 shrink-0"
                    checked={isChecked(r.id)}
                    onChange={() => {
                      if (value.all_resellers) {
                        // Deselect this one: switch to explicit list minus this
                        const explicit = resellers.filter((x) => x.id !== r.id).map((x) => x.id);
                        onChange({ reseller_ids: explicit, all_resellers: false, count: explicit.length });
                      } else {
                        toggleReseller(r.id);
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{displayName(r)}</p>
                    <p className="text-xs text-foreground-muted truncate">{r.email}</p>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* All-resellers toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={value.all_resellers}
          onClick={toggleAllResellers}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            value.all_resellers ? 'bg-success' : 'bg-background-tertiary border border-border'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              value.all_resellers ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-foreground">All resellers</span>
      </div>

      {/* Summary + open button (only shown when not all-resellers) */}
      {!value.all_resellers && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground-muted">
            <span className="font-semibold text-foreground">{value.count.toLocaleString()}</span>
            {' '}reseller{value.count !== 1 ? 's' : ''} selected
          </span>
          <button
            type="button"
            onClick={openSheet}
            className="text-sm text-accent-primary hover:underline shrink-0"
          >
            {value.count === 0 ? 'Pick resellers' : 'Edit recipients'}
          </button>
        </div>
      )}

      {/* Chips for individually selected resellers */}
      {!value.all_resellers && selectedResellers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedResellers.map((r) => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500"
            >
              {displayName(r)}
              <button
                type="button"
                onClick={() => toggleReseller(r.id)}
                className="ml-0.5 hover:text-amber-300"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Bottom sheet (mobile) / modal (desktop) ──────────────────────── */}
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
              <h3 className="text-base font-semibold text-foreground">Select resellers</h3>
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
              {resellerListJsx}
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
        </div>
      )}
    </div>
  );
}
