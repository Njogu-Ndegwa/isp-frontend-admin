export type DurationUnit = 'MINUTES' | 'HOURS' | 'DAYS';

const MINUTES_PER_UNIT: Record<DurationUnit, number> = {
  MINUTES: 1,
  HOURS: 60,
  DAYS: 1440,
};

/**
 * Normalizes a possibly-decimal duration into a whole-number value expressed in
 * the coarsest unit that keeps it an integer. The backend stores duration_value
 * as an integer (units MINUTES/HOURS/DAYS, finest is MINUTES), so e.g. 1.5 HOURS
 * becomes 90 MINUTES. Integer inputs pass through unchanged so existing plans
 * are never reshaped. Returns null when the input does not resolve to at least
 * one whole minute.
 */
export function normalizeDuration(
  value: number,
  unit: DurationUnit,
): { value: number; unit: DurationUnit } | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (Number.isInteger(value)) return { value, unit };

  const totalMinutes = Math.round(value * MINUTES_PER_UNIT[unit]);
  if (totalMinutes < 1) return null;
  if (totalMinutes % MINUTES_PER_UNIT.DAYS === 0) {
    return { value: totalMinutes / MINUTES_PER_UNIT.DAYS, unit: 'DAYS' };
  }
  if (totalMinutes % MINUTES_PER_UNIT.HOURS === 0) {
    return { value: totalMinutes / MINUTES_PER_UNIT.HOURS, unit: 'HOURS' };
  }
  return { value: totalMinutes, unit: 'MINUTES' };
}

/** Human-readable label like "90 minutes" or "1 hour". */
export function describeDuration(value: number, unit: DurationUnit): string {
  const lower = unit.toLowerCase();
  const label = value === 1 ? lower.replace(/s$/, '') : lower;
  return `${value} ${label}`;
}
