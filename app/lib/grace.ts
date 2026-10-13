// Customer grace period: stored in minutes on the backend, edited in hours or days.

export type GraceUnit = 'hours' | 'days';

/** Backend cap (app/services/customer_grace.py MAX_GRACE_MINUTES). */
export const MAX_GRACE_MINUTES = 30 * 24 * 60;

const UNIT_MINUTES: Record<GraceUnit, number> = { hours: 60, days: 24 * 60 };

export const GRACE_PRESETS: { label: string; minutes: number }[] = [
  { label: 'Off', minutes: 0 },
  { label: '1 day', minutes: 24 * 60 },
  { label: '3 days', minutes: 3 * 24 * 60 },
  { label: '7 days', minutes: 7 * 24 * 60 },
];

/** Pick the unit a stored value reads most naturally in. */
export function splitGraceMinutes(minutes: number | null | undefined): { value: number; unit: GraceUnit } {
  const m = Math.max(0, Math.round(minutes || 0));
  if (m > 0 && m % UNIT_MINUTES.days === 0) return { value: m / UNIT_MINUTES.days, unit: 'days' };
  return { value: Math.round((m / UNIT_MINUTES.hours) * 100) / 100, unit: 'hours' };
}

/** Minutes for a form value, or null when it is not a valid grace length. */
export function graceToMinutes(value: number, unit: GraceUnit): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const minutes = Math.round(value * UNIT_MINUTES[unit]);
  if (minutes > MAX_GRACE_MINUTES) return null;
  return minutes;
}

/** "2 days", "36 hours", "1 day 6 hours", "None". */
export function formatGrace(minutes: number | null | undefined): string {
  const m = Math.max(0, Math.round(minutes || 0));
  if (m === 0) return 'None';
  const days = Math.floor(m / UNIT_MINUTES.days);
  const hours = Math.floor((m % UNIT_MINUTES.days) / 60);
  const mins = m % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (mins) parts.push(`${mins} min`);
  return parts.join(' ');
}

/** When access would end with this grace: expiry + minutes, as a UTC ISO string. */
export function graceDeadlineISO(expiry: string | null | undefined, minutes: number): string | null {
  if (!expiry) return null;
  const hasZone = expiry.endsWith('Z') || expiry.includes('+') || expiry.includes('-', 10);
  const ms = Date.parse(hasZone ? expiry : `${expiry}Z`);
  if (Number.isNaN(ms)) return null;
  return new Date(ms + minutes * 60_000).toISOString();
}
