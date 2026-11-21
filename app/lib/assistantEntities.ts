/**
 * Recognises the things a billing answer is about (customers, routers, plans,
 * payments, vouchers) from the shape of an API result, so the chat can draw them
 * with components made for them instead of a generic table. Pure functions with
 * unit tests (app/lib/__tests__/assistantEntities.test.ts).
 */
import { findRows, type Row } from './assistantView';

export type Entity = 'customer' | 'router' | 'plan' | 'payment' | 'voucher' | 'port' | 'pppoe_user' | 'hotspot_user' | 'uptime';
export interface EntityResult { entity: Entity; rows: Row[]; single: boolean; total?: number }

const isObject = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
const has = (r: Row, ...keys: string[]) => keys.every((k) => k in r);

const SHAPES: [Entity, (r: Row) => boolean][] = [
  ['voucher', (r) => has(r, 'code') && ('voucher_type' in r || 'batch_id' in r)],
  // a router port as port-analytics reads it: its link and its health
  ['port', (r) => has(r, 'port') && isObject(r.link) && isObject(r.health)],
  // a hotspot device on a router (its user, host and binding, with live counters)
  ['hotspot_user', (r) => has(r, 'mac_address', 'online') && ('login_by' in r || 'binding_type' in r || 'online_source' in r)],
  // a PPPoE login on a router (the router's secrets with their live sessions)
  ['pppoe_user', (r) => has(r, 'username', 'online') && ('profile' in r || 'caller_id' in r || 'last_logged_out' in r)],
  // the same login as the router's secrets list reads it (GET .../pppoe/secrets)
  ['pppoe_user', (r) => has(r, 'name', 'online', 'service') && ('last_caller_id' in r || 'last_logged_out' in r)],
  ['customer', (r) => has(r, 'phone', 'status') && ('expiry' in r || 'effective_expiry' in r)],
  ['router', (r) => has(r, 'identity', 'ip_address')],
  ['plan', (r) => has(r, 'price', 'duration_unit', 'duration_value')],
  ['payment', (r) => 'amount' in r && ('phone_number' in r || 'customer_phone' in r || 'mpesa_receipt_number' in r)],
];

/** A router uptime answer: its status now, the window's figures and the timeline. */
export const isUptime = (p: unknown): p is Row => isObject(p) && isObject(p.current_status) && isObject(p.window) && Array.isArray(p.timeline);

/** What a result is a list of (or one of), if it is something the chat has a component for. */
export function entityOf(payload: unknown): EntityResult | null {
  // a router's uptime (GET /api/routers/{id}/uptime): one answer, not its timeline as a list
  if (isUptime(payload)) return { entity: 'uptime', rows: [payload], single: true };
  const found = findRows(payload);
  const rows = found && found.rows.length ? found.rows : isObject(payload) ? [payload] : [];
  if (!rows.length) return null;
  const single = !(found && found.rows.length);
  for (const [entity, test] of SHAPES) {
    if (rows.slice(0, 5).every(test)) {
      // a page of payments is a list; one payment or one voucher on its own reads fine as a list of one
      const total = !single && isObject(payload) && typeof payload.total === 'number' ? payload.total : undefined;
      return { entity, rows, single, total };
    }
  }
  // an answer can hold several lists (port analytics: warnings, equipment found, the ports):
  // the one that is a known kind of record is the answer, whichever is longest
  if (isObject(payload)) {
    for (const value of Object.values(payload)) {
      if (!Array.isArray(value) || value === found?.rows || !value.length || !value.every(isObject)) continue;
      for (const [entity, test] of SHAPES) {
        if ((value as Row[]).slice(0, 5).every(test)) return { entity, rows: value as Row[], single: false };
      }
    }
  }
  return null;
}

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null);
const nested = (r: Row, key: string, field = 'name'): string | null => (isObject(r[key]) ? text((r[key] as Row)[field]) : null);

/** Naive API datetimes are UTC. */
export function asUtc(v: unknown): Date | null {
  if (typeof v !== 'string' || !v) return null;
  const d = new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(v) || v.length <= 10 ? v : `${v}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Every time a reseller reads is Kenyan time (EAT), whatever the phone's own zone. */
export const EAT_ZONE = 'Africa/Nairobi';
const eatFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: EAT_ZONE });
const eatClock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: EAT_ZONE });
const toDate = (v: Date | string | null | undefined): Date | null => (v instanceof Date ? (Number.isNaN(v.getTime()) ? null : v) : asUtc(v));

/** "20 Nov, 14:22" in EAT; '–' for no time. Takes a Date or an API datetime (naive = UTC). */
export function eatTime(v: Date | string | null | undefined): string {
  const d = toDate(v);
  return d ? eatFmt.format(d).replace(' at ', ', ') : '–';
}

/** "14:22" in EAT; '–' for no time. */
export function eatClockTime(v: Date | string | null | undefined): string {
  const d = toDate(v);
  return d ? eatClock.format(d) : '–';
}

/**
 * How old a reading is, and whether it is too old to be shown as live. A router's
 * status, a monitor read or a push report older than `maxAgeMs` is a last-known value.
 */
export interface Freshness { stale: boolean; ageMs: number | null }
export function freshness(at: Date | null, now: number, maxAgeMs = 15 * 60_000, flagged = false): Freshness {
  const ageMs = at ? Math.max(0, now - at.getTime()) : null;
  return { stale: flagged || (ageMs !== null && ageMs > maxAgeMs), ageMs };
}

/** "45 min", "3 h", "2 d": the size of a gap, without a direction. */
export function span(ms: number): string {
  const h = Math.abs(ms) / 3_600_000;
  return h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} d`;
}

/** RouterOS uptime ("1w2d03:04:05", "3d04:14:07", "05:12:44") in words: "9 d 3 h", "5 h". */
export function uptimeText(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const m = /^(?:(\d+)w)?(?:(\d+)d)?(\d+):(\d+):(\d+)$/.exec(v.trim())
    // the hotspot's way: "1w2d3h4m5s", any part left out
    ?? (/^(?=\d)(?:(\d+)w)?(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(v.trim()) as RegExpExecArray | null)?.map((x) => x ?? '0') as RegExpExecArray | undefined;
  if (!m) return v.trim();
  if ([1, 2, 3, 4].every((i) => !Number(m[i] ?? 0))) return `${Number(m[5] ?? 0)} s`;
  const days = Number(m[1] ?? 0) * 7 + Number(m[2] ?? 0);
  const hours = Number(m[3]);
  if (days > 0) return hours > 0 && days < 14 ? `${days} d ${hours} h` : `${days} d`;
  return hours > 0 ? `${hours} h` : `${Number(m[4])} min`;
}

/** A traffic rate in the unit people say: "12.4 Mbps", "640 Kbps". */
export function bpsText(v: unknown): string | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null;
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Gbps`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)} Mbps`;
  if (v >= 1_000) return `${Math.round(v / 1_000)} Kbps`;
  return `${Math.round(v)} bps`;
}

export type CustomerState ='active' | 'grace' | 'expiring' | 'expired' | 'paused' | 'inactive';
export interface CustomerFacts {
  id: number | string | null;
  name: string;
  phone: string | null;
  plan: string | null;
  router: string | null;
  connection: 'Hotspot' | 'PPPoE' | 'Static IP';
  state: CustomerState;
  /** ms until the paid time ends (negative once it has) */
  left: number | null;
  expiry: Date | null;
  routerId: number | null;
  /** what the router knows this customer by */
  pppoeUsername: string | null;
  staticIp: string | null;
  mac: string | null;
  account: string | null;
  planSpeed: string | null;
  planPrice: number | null;
  wallet: number | null;
  /** paid time kept while paused, in ms */
  pausedLeft: number | null;
  graceMinutes: number | null;
  status: string;
  /** paid at least once ("customer") or never ("visitor"); null when the answer does not say */
  tier: 'customer' | 'visitor' | null;
}

export function customerFacts(r: Row, now: number): CustomerFacts {
  const expiry = asUtc(r.effective_expiry) ?? asUtc(r.expiry);
  const left = expiry ? expiry.getTime() - now : null;
  const status = String(r.status ?? '').toLowerCase();
  const state: CustomerState = r.is_paused === true ? 'paused'
    : left !== null && left <= 0 ? 'expired'
      : status && status !== 'active' ? (status === 'expired' ? 'expired' : 'inactive')
        : r.in_grace === true ? 'grace'
          : left !== null && left < 86_400_000 ? 'expiring' : 'active';
  const connection = text(r.pppoe_username) ? 'PPPoE' : text(r.static_ip) ? 'Static IP'
    : nested(r, 'plan', 'connection_type') === 'pppoe' ? 'PPPoE' : 'Hotspot';
  const phone = text(r.phone);
  return {
    id: typeof r.id === 'number' || typeof r.id === 'string' ? r.id : null,
    name: text(r.name) ?? phone ?? 'Customer',
    phone,
    plan: nested(r, 'plan') ?? text(r.plan_name),
    router: nested(r, 'router') ?? text(r.router_name),
    connection, state, left, expiry,
    routerId: typeof r.router_id === 'number' ? r.router_id : isObject(r.router) && typeof (r.router as Row).id === 'number' ? (r.router as Row).id as number : null,
    pppoeUsername: text(r.pppoe_username),
    staticIp: text(r.static_ip),
    mac: text(r.mac_address) ?? text(r.static_mac),
    account: text(r.account_number),
    planSpeed: nested(r, 'plan', 'speed') ?? text(r.plan_speed),
    planPrice: isObject(r.plan) && r.plan.price !== undefined && r.plan.price !== null ? Number(r.plan.price) : null,
    wallet: typeof r.wallet_credit_kes === 'number' && r.wallet_credit_kes > 0 ? r.wallet_credit_kes : null,
    pausedLeft: typeof r.paused_remaining_seconds === 'number' ? r.paused_remaining_seconds * 1000 : null,
    graceMinutes: typeof r.grace_period_minutes === 'number' && r.grace_period_minutes > 0 ? r.grace_period_minutes : null,
    status,
    tier: r.tier === 'visitor' || r.has_paid === false ? 'visitor' : r.tier === 'customer' || r.has_paid === true ? 'customer' : null,
  };
}

export interface RouterFacts {
  id: number | string | null; name: string; identity: string | null; state: 'online' | 'offline' | 'unknown'; since: Date | null; uptime: number | null; emergency: boolean;
  /** when its status was last checked, and whether that is too long ago to call it live */
  checkedAt: Date | null;
  stale: boolean;
  lastOnline: Date | null;
}

/** A router status older than this is a last-known status, not a live one (checks run every few minutes). */
export const ROUTER_STATUS_MAX_AGE = 15 * 60_000;

export function routerFacts(r: Row, now: number = Date.now()): RouterFacts {
  const status = String(r.status ?? 'unknown').toLowerCase();
  const state = status === 'online' ? 'online' : status === 'offline' ? 'offline' : 'unknown';
  const checks = typeof r.availability_checks === 'number' ? r.availability_checks : 0;
  const ok = typeof r.availability_successes === 'number' ? r.availability_successes : 0;
  const checkedAt = asUtc(r.status_last_checked_at) ?? (typeof r.status_age_seconds === 'number' ? new Date(now - r.status_age_seconds * 1000) : null);
  return {
    id: typeof r.id === 'number' || typeof r.id === 'string' ? r.id : null,
    name: text(r.name) ?? text(r.identity) ?? 'Router',
    identity: text(r.identity),
    state,
    since: state === 'offline' ? asUtc(r.last_online_at) : asUtc(r.status_last_checked_at),
    uptime: checks > 0 ? Math.round((ok / checks) * 1000) / 10 : null,
    emergency: r.emergency_active === true,
    checkedAt,
    // the API flags a stale status itself; an old check is stale too, whatever the flag says
    stale: state !== 'unknown' && freshness(checkedAt, now, ROUTER_STATUS_MAX_AGE, r.status_is_stale === true).stale,
    lastOnline: asUtc(r.last_online_at),
  };
}

/** "1 hour", "30 days": a plan's length in words. */
export function planDuration(r: Row): string {
  const value = typeof r.duration_value === 'number' ? r.duration_value : Number(r.duration_value) || 0;
  const unit = String(r.duration_unit ?? '').toLowerCase().replace(/s$/, '');
  if (!value || !unit) return text(r.duration) ?? '';
  return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

/** "5M/5M" -> "5 Mbps", "10M/2M" -> "10 Mbps down, 2 up". */
export function planSpeed(v: unknown): string | null {
  const s = text(v);
  if (!s) return null;
  const m = /^(\d+(?:\.\d+)?)\s*([kKmM])\s*\/\s*(\d+(?:\.\d+)?)\s*([kKmM])$/.exec(s);
  if (!m) return s;
  const unit = (u: string) => (u.toLowerCase() === 'k' ? 'Kbps' : 'Mbps');
  // RouterOS writes a rate limit as upload/download
  const [up, upUnit, down, downUnit] = [m[1], m[2], m[3], m[4]];
  return up === down && upUnit.toLowerCase() === downUnit.toLowerCase() ? `${down} ${unit(downUnit)}` : `${down} ${unit(downUnit)} down, ${up} ${unit(upUnit)} up`;
}

export type PaymentState = 'paid' | 'failed' | 'pending' | 'expired';
export interface PaymentFacts {
  id: number | string | null; amount: number; who: string; phone: string | null; plan: string | null; state: PaymentState; reason: string | null; when: Date | null; receipt: string | null; method: string | null;
  /** false for a payment that is not money in (a voucher redemption, a free trial, a comp): never summed as revenue */
  revenue: boolean;
  /** where it came from, in words: "Voucher", "Free trial", "Paybill" */
  source: string | null;
}

const SOURCES: Record<string, string> = { mpesa_stk: 'M-Pesa prompt', c2b_paybill: 'Paybill', voucher: 'Voucher', free_trial: 'Free trial', zenopay: 'ZenoPay', mtn_momo: 'MTN MoMo', fapshi: 'Fapshi' };

export function paymentFacts(r: Row): PaymentFacts {
  const status = String(r.status ?? 'completed').toLowerCase();
  // an expired prompt was never answered: nobody paid, but nothing failed either (the classic page shows it apart)
  const state: PaymentState = /expire/.test(status) ? 'expired' : /fail|cancel|reject|timeout/.test(status) ? 'failed' : /pend|process|initiat|queue/.test(status) ? 'pending' : 'paid';
  const phone = text(r.phone_number) ?? text(r.customer_phone) ?? nested(r, 'customer', 'phone');
  const amount = typeof r.amount === 'number' ? r.amount : Number(r.amount) || 0;
  const method = text(r.payment_method);
  return {
    id: (r.transaction_id ?? r.payment_id ?? r.id ?? null) as number | string | null,
    amount,
    who: nested(r, 'customer') ?? text(r.customer_name) ?? phone ?? 'Payment',
    phone,
    plan: nested(r, 'plan') ?? text(r.plan_name),
    state,
    reason: state === 'failed' ? text(r.result_desc) : null,
    when: asUtc(r.transaction_date) ?? asUtc(r.payment_date) ?? asUtc(r.created_at),
    receipt: text(r.mpesa_receipt_number) ?? text(r.payment_reference),
    method: method ? method.replace(/_/g, ' ') : null,
    revenue: r.counts_as_revenue !== false,
    source: typeof r.source === 'string' && r.source ? SOURCES[r.source] ?? r.source.replace(/_/g, ' ') : null,
  };
}

export interface PaymentTotals {
  /** money in: completed payments that count as revenue */
  received: number;
  receivedCount: number;
  /** completed but not revenue (vouchers, free trials) */
  freeCount: number;
  failed: number;
  expired: number;
  pending: number;
}

/** What a list of payments adds up to, the way the classic Transactions page sums it. Pure, for tests. */
export function paymentTotals(payments: PaymentFacts[]): PaymentTotals {
  const out: PaymentTotals = { received: 0, receivedCount: 0, freeCount: 0, failed: 0, expired: 0, pending: 0 };
  for (const p of payments) {
    if (p.state === 'paid') {
      if (p.revenue) { out.received += p.amount; out.receivedCount += 1; } else out.freeCount += 1;
    } else out[p.state] += 1;
  }
  return out;
}

/* ---------------- customer list filters (the classic Customers page's) ---------------- */

export type CustomerFilter = 'all' | 'active' | 'inactive' | 'online' | 'offline' | 'overdue' | 'paused';
export type ConnectionFilter = 'all' | 'Hotspot' | 'PPPoE' | 'Static IP';
export type TierFilter = 'all' | 'customer' | 'visitor';

/** On right now, as far as we know: true, false, or null when nothing was read (or the router is down). */
export type OnlineNow = boolean | null;

const paidUp = (p: CustomerFacts) => p.state === 'active' || p.state === 'expiring';

/**
 * Whether a customer belongs under a status filter, by the classic page's rules
 * (app/lib/customerFilters.ts): overdue is paid time run out (grace included) and not
 * paused; offline is paid up but not on; online needs a positive live reading.
 */
export function inCustomerFilter(p: CustomerFacts, filter: CustomerFilter, online: OnlineNow): boolean {
  switch (filter) {
    case 'all': return true;
    case 'active': return p.status === 'active' && p.state !== 'paused';
    case 'inactive': return p.status === 'inactive' || p.state === 'inactive';
    case 'paused': return p.state === 'paused';
    case 'overdue': return p.state === 'expired' || p.state === 'grace';
    case 'online': return online === true;
    case 'offline': return online === false && paidUp(p);
  }
}

export interface CustomerCounts { filters: Record<CustomerFilter, number>; connections: Record<ConnectionFilter, number>; tiers: Record<TierFilter, number> }

/** The counts on each filter, as the classic page shows them. Pure, for tests. */
export function customerCounts(people: CustomerFacts[], onlineOf: (p: CustomerFacts) => OnlineNow): CustomerCounts {
  const filters = { all: 0, active: 0, inactive: 0, online: 0, offline: 0, overdue: 0, paused: 0 } as Record<CustomerFilter, number>;
  const connections = { all: 0, Hotspot: 0, PPPoE: 0, 'Static IP': 0 } as Record<ConnectionFilter, number>;
  const tiers = { all: 0, customer: 0, visitor: 0 } as Record<TierFilter, number>;
  for (const p of people) {
    const on = onlineOf(p);
    for (const f of Object.keys(filters) as CustomerFilter[]) if (inCustomerFilter(p, f, on)) filters[f] += 1;
    connections.all += 1;
    connections[p.connection] += 1;
    tiers.all += 1;
    if (p.tier) tiers[p.tier] += 1;
  }
  return { filters, connections, tiers };
}
