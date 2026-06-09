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
