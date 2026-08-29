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

/**
 * Human duration from seconds: "45m", "3h 20m", "2d 4h". Drops zero units.
 */
export function formatDuration(seconds: number | null | undefined): string {
  const total = typeof seconds === 'number' && Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  if (total < 60) return `${total}s`;
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}
