// Pause / resume a customer's subscription (backend: app/services/customer_pause.py).
// Kept free of React so the rules can be unit tested.

import type { Customer } from './types';
import type { TFunction } from './i18n';

type PauseView = Pick<Customer, 'is_paused' | 'status' | 'expiry' | 'connection_type' | 'plan' | 'subscription_owner_id'>;

function connectionTypeOf(customer: PauseView): string {
  return customer.connection_type ?? customer.plan?.connection_type ?? 'hotspot';
}

/** Backend timestamps are naive UTC; read them as UTC. */
function parseUtcMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const hasZone = iso.endsWith('Z') || iso.includes('+') || iso.includes('-', 10);
  const ms = Date.parse(hasZone ? iso : `${iso}Z`);
  return Number.isNaN(ms) ? null : ms;
}

export function isPaused(customer: Pick<Customer, 'is_paused'>): boolean {
  return customer.is_paused === true;
}

/** PPPoE and static-IP customers can be paused; hotspot customers cannot. */
export function supportsPause(customer: PauseView): boolean {
  const type = connectionTypeOf(customer);
  return (type === 'pppoe' || type === 'static_ip') && !customer.subscription_owner_id;
}

/**
 * Pause is offered to an active customer who still has paid time. The backend
 * makes the same check (an expired or in-grace customer has nothing to pause).
 */
export function canPause(customer: PauseView, nowMs: number = Date.now()): boolean {
  if (!supportsPause(customer) || isPaused(customer) || customer.status !== 'active') return false;
  const expiryMs = parseUtcMs(customer.expiry);
  return expiryMs !== null && expiryMs > nowMs;
}

export function canResume(customer: PauseView): boolean {
  return isPaused(customer);
}

/** "12d 4h", "3h 20m", "45m": the same wording as the activity log. */
export function formatPausedRemaining(seconds: number | null | undefined, t?: TFunction): string {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const tr = t ?? ((text: string, vars?: Record<string, string | number>) =>
    text.replace(/\{(\w+)\}/g, (m, k: string) => (vars && k in vars ? String(vars[k]) : m)));
  if (days) return tr('{days}d {hours}h', { days, hours });
  if (hours) return tr('{hours}h {minutes}m', { hours, minutes });
  return tr('{minutes}m', { minutes });
}
