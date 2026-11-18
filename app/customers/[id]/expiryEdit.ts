/**
 * Guard for the customer edit form: saving must never quietly cut time a
 * customer has already paid for.
 *
 * 18 Nov 2026, reseller 638: an edit meant to set only the installation date
 * also moved a just-paid PPPoE customer's expiry from 18 Dec to the same
 * afternoon, wiping a paid month. The form now asks before any save that
 * moves a still-running expiry earlier.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Milliseconds of paid time the new expiry removes, or 0 when none. */
export function paidTimeCutMs(
  currentExpiryISO: string | null | undefined,
  newExpiryISO: string | null | undefined,
  now: Date = new Date(),
): number {
  if (!currentExpiryISO || !newExpiryISO) return 0;
  const current = new Date(withUtc(currentExpiryISO)).getTime();
  const next = new Date(newExpiryISO).getTime();
  if (Number.isNaN(current) || Number.isNaN(next)) return 0;
  if (current <= now.getTime() || next >= current) return 0;
  return current - Math.max(next, now.getTime());
}

/** "30 days" / "5 hours" / "40 minutes" for the confirmation text. */
export function describeCut(ms: number): string {
  if (ms >= DAY_MS) {
    const days = Math.round(ms / DAY_MS);
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  if (ms >= HOUR_MS) {
    const hours = Math.round(ms / HOUR_MS);
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  const minutes = Math.max(1, Math.round(ms / 60000));
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export function shortenExpiryConfirm(ms: number): string {
  return (
    `This change moves the expiry earlier and removes ${describeCut(ms)} the customer `
    + 'has already paid for. Save anyway?'
  );
}

// The API sends naive UTC datetimes ("2026-12-18T12:13:00").
function withUtc(value: string): string {
  return /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`;
}
