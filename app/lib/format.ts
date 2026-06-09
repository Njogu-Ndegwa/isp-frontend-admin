/**
 * Canonical KES currency formatter. Whole shillings, en-KE grouping.
 * Single source of truth — do not redefine formatKES in components.
 */
export function formatKES(amount: number | null | undefined): string {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  try {
    return `KES ${value.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  } catch {
    return `KES ${Math.round(value)}`;
  }
}

/**
 * Compact formatter for chart axes/tooltips: KES 1.5M / KES 25K / KES 850.
 */
export function formatKESCompact(amount: number | null | undefined): string {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  if (Math.abs(value) >= 1_000_000) return `KES ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `KES ${(value / 1_000).toFixed(0)}K`;
  return `KES ${value.toLocaleString('en-KE')}`;
}
