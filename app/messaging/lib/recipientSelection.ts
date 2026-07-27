// ─── Pure recipient-selection model (no React) ─────────────────────────────────
// Single source of truth for turning the picker's mode-stable selection state
// into the API send descriptor + the recipient count.
//
// Selection model (mode-stable; reset only on mode/plan change):
//   baseAll === true  → "everyone in the segment except `overrides`" (overrides = excluded)
//   baseAll === false → "only `overrides`" (overrides = included)
// Search and pagination never touch baseAll/overrides — they only change which
// rows are displayed — so this helper is a pure function of state, independent
// of any currently-loaded page slice.

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

export interface SelectionState {
  mode: AudienceMode;
  planId?: number;
  baseAll: boolean;
  overrides: number[];
  totalCount: number;
}

// ─── Mode pill labels ─────────────────────────────────────────────────────────
export const MODE_LABELS: Record<AudienceMode, string> = {
  all: 'All',
  active: 'Active',
  expiring: 'Expiring (7d)',
  by_plan: 'By plan',
  specific: 'Specific people',
};

// Map an audience mode to the backend filter string.
function modeToFilter(mode: AudienceMode): string {
  return mode === 'by_plan' ? 'by_plan' : mode;
}

export function buildRecipientSelection(s: SelectionState): RecipientSelection {
  const { mode, planId, baseAll, overrides, totalCount } = s;

  if (!baseAll) {
    // Inclusion model: send exactly the overrides as explicit customer_ids.
    const ids = [...overrides];
    return {
      mode,
      planId,
      customer_ids: ids,
      count: ids.length,
      summaryLabel:
        mode === 'specific'
          ? `Specific · ${ids.length} selected`
          : `${MODE_LABELS[mode]} · ${ids.length.toLocaleString()} selected`,
    };
  }

  // Exclusion model: whole segment minus overrides (excluded ids).
  const excludeCount = overrides.length;
  const effectiveCount = totalCount - excludeCount;
  const label =
    excludeCount === 0
      ? `${MODE_LABELS[mode]} · ${totalCount.toLocaleString()}`
      : `${MODE_LABELS[mode]} · ${effectiveCount.toLocaleString()} of ${totalCount.toLocaleString()}`;

  return {
    mode,
    planId,
    filter: modeToFilter(mode),
    exclude_customer_ids: excludeCount > 0 ? [...overrides] : undefined,
    count: effectiveCount,
    summaryLabel: label,
  };
}
