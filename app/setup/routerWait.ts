/**
 * What the router step should say while a setup code is out in the world.
 *
 * The page only learns one thing from the backend: the code's status. It flips
 * to `provisioned` when the router's setup script calls home, and stays
 * `pending` for every kind of failure (no internet, device-mode, a half-pasted
 * command), so "pending for a while" is all we can honestly report. The script
 * needs a minute or two, which is why we stay quiet for the first five.
 */

import type { ProvisionToken } from '../lib/types';

export const ROUTER_QUIET_MS = 5 * 60 * 1000;
export const CODE_LIFETIME_HOURS = 24;

export type RouterWaitState = 'waiting' | 'not_heard';

/** Backend timestamps are naive UTC; read them as UTC. */
export function parseUtcMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const hasZone = iso.endsWith('Z') || iso.includes('+') || iso.includes('-', 10);
  const ms = Date.parse(hasZone ? iso : `${iso}Z`);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * An out-of-date code shows up two ways: `expired: true` while it is still
 * pending, then `status: 'expired'` (with `expired: false`) once the nightly
 * cleanup job has run.
 */
export function isCodeExpired(token: Pick<ProvisionToken, 'status' | 'expired'>): boolean {
  return token.status === 'expired' || token.expired === true;
}

export function isCodeLive(token: Pick<ProvisionToken, 'status' | 'expired'>): boolean {
  return token.status === 'pending' && !token.expired;
}

export function routerWaitState(
  createdAt: string | null | undefined,
  nowMs: number,
  checkedByOwner: boolean,
): RouterWaitState {
  if (checkedByOwner) return 'not_heard';
  const created = parseUtcMs(createdAt);
  // No usable time: don't claim the router is late.
  if (created === null) return 'waiting';
  return nowMs - created >= ROUTER_QUIET_MS ? 'not_heard' : 'waiting';
}

/** Whole hours the code has left, rounded down. Null when the time is unusable. */
export function codeHoursLeft(
  createdAt: string | null | undefined,
  nowMs: number,
  lifetimeHours: number = CODE_LIFETIME_HOURS,
): number | null {
  const created = parseUtcMs(createdAt);
  if (created === null) return null;
  const leftMs = created + lifetimeHours * 3600 * 1000 - nowMs;
  return Math.max(0, Math.floor(leftMs / (3600 * 1000)));
}
