import type { AuthUser } from './types';

export interface InstallationChargeEvent {
  id: number;
  kind: 'charge' | 'external_payment' | 'waiver' | 'reversal';
  delta_minor: number;
  reason: string;
  external_reference: string | null;
  reverses_event_id: number | null;
  actor_id: number | null;
  created_at: string | null;
  reversed: boolean;
}

export interface InstallationCharge {
  id: number;
  customer_id: number | null;
  customer_id_snapshot: number;
  customer_name: string;
  description: string;
  currency: 'KES';
  original_minor: number;
  outstanding_minor: number;
  payments_minor: number;
  waivers_minor: number;
  reversed: boolean;
  created_at: string | null;
  events: InstallationChargeEvent[];
}

export interface InstallationChargePage {
  charges: InstallationCharge[];
  next_offset: number | null;
  can_create: boolean;
}

export function installationChargesEnabled(user: AuthUser | null, isDemo: boolean, flag: string | undefined): boolean {
  return flag === 'true' && !isDemo && user?.id === 597 && user.role === 'reseller';
}

/** Parse decimal text, never round a floating-point currency calculation. */
export function parseChargeAmount(value: string): number {
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error('Enter a KES amount with at most two decimal places.');
  const minor = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor <= 0 || minor > 100_000_000) {
    throw new Error('Enter an amount from KES 0.01 to KES 1,000,000.00.');
  }
  return minor;
}

export function chargeMoney(minor: number): string {
  return `KES ${(minor / 100).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function chargeDate(value: string | null): string {
  if (!value) return 'Date unavailable';
  // API timestamps may be UTC without an explicit zone.
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
}

/** Exact action/payload retries reuse the key, including after a page reload. */
export function pendingChargeKey(scope: string, payload: string, memory: Map<string, string>): string {
  const entry = `${scope}:${payload}`;
  if (memory.has(entry)) return memory.get(entry)!;
  let saved: Record<string, string> = {};
  try {
    const parsed = JSON.parse(sessionStorage.getItem('installation-charge-pending') ?? '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed;
  } catch { /* Storage may be unavailable. */ }
  const key = typeof saved[entry] === 'string' && /^[A-Za-z0-9_-]{16,80}$/.test(saved[entry]) ? saved[entry] : crypto.randomUUID();
  memory.set(entry, key);
  try { sessionStorage.setItem('installation-charge-pending', JSON.stringify({ ...saved, [entry]: key })); } catch { /* In-memory retries still work. */ }
  return key;
}

export function clearPendingChargeKey(scope: string, payload: string, memory: Map<string, string>) {
  const entry = `${scope}:${payload}`;
  memory.delete(entry);
  try {
    const saved = JSON.parse(sessionStorage.getItem('installation-charge-pending') ?? '{}');
    delete saved[entry];
    sessionStorage.setItem('installation-charge-pending', JSON.stringify(saved));
  } catch { /* No storage available. */ }
}
