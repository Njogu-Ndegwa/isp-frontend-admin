// Customers page filters: search matching, "Overdue", and "Online now".
// Kept free of React so the rules can be unit tested.

import type { Customer } from './types';
import { phoneMatches } from './phoneSearch';

/** Backend timestamps are naive UTC; read them as UTC. */
function parseUtcMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const hasZone = iso.endsWith('Z') || iso.includes('+') || iso.includes('-', 10);
  const ms = Date.parse(hasZone ? iso : `${iso}Z`);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Overdue = the customer's paid time has run out and they have not renewed.
 *
 * Same rule the backend enforces (app/services/customer_grace.py): paid time
 * ends at `expiry`. A customer still inside a grace window is overdue too —
 * they keep access for now, but their payment is late. Customers who never
 * had paid time (no expiry) are not overdue, and neither are paused ones.
 */
export function isOverdue(
  customer: Pick<Customer, 'expiry' | 'in_grace' | 'status'> & Partial<Pick<Customer, 'is_paused'>>,
  nowMs: number = Date.now(),
): boolean {
  // Paused: the expiry is frozen at the pause moment and the paid time is
  // held, so the customer owes nothing.
  if (customer.is_paused) return false;
  if (customer.in_grace || customer.status === 'expired') return true;
  const expiryMs = parseUtcMs(customer.expiry);
  return expiryMs !== null && expiryMs <= nowMs;
}

/**
 * Offline = paid up but not connected right now: an active customer whose
 * paid time has not run out and who has no live session. Overdue customers
 * belong in Overdue instead, so the three groups do not overlap for anyone
 * who is not connected.
 */
export function isPaidOffline(
  customer: Pick<Customer, 'expiry' | 'in_grace' | 'status'>,
  onlineNow: boolean,
  nowMs: number = Date.now(),
): boolean {
  return !onlineNow && customer.status === 'active' && !isOverdue(customer, nowMs);
}

/** Free-text search across the fields a reseller is likely to type. */
export function customerMatchesSearch(customer: Customer, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  return (
    (customer.name?.toLowerCase() || '').includes(query) ||
    phoneMatches(customer.phone, rawQuery.trim()) ||
    (customer.account_number || '').toLowerCase().includes(query) ||
    (customer.mac_address?.toLowerCase() || '').includes(query) ||
    (customer.pppoe_username?.toLowerCase() || '').includes(query) ||
    (customer.static_ip || '').includes(query) ||
    (customer.plan?.name?.toLowerCase() || '').includes(query)
  );
}

/**
 * Online-now state from the live sources the Customers page already reads.
 *
 * Routers on real-time push answer for all their customers at once
 * (`/api/realtime/customers/online`); other routers answer through the
 * per-router hotspot / PPPoE monitor (`monitorLive`). Anything that is not
 * positively online counts as offline — including customers behind a router
 * that is not answering, since nobody behind it is connected.
 */
export function isOnlineNow(input: {
  routerDown: boolean;
  /** The customer's router is covered by the real-time push answer. */
  realtimeCovered: boolean;
  realtimeOnline: boolean;
  monitorLive?: { online?: boolean; disabled?: boolean } | null;
}): boolean {
  if (input.routerDown) return false;
  if (input.realtimeCovered) return input.realtimeOnline;
  const live = input.monitorLive;
  return Boolean(live && live.online && !live.disabled);
}
