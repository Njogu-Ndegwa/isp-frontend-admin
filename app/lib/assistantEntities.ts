/**
 * Recognises the things a billing answer is about (customers, routers, plans,
 * payments, vouchers) from the shape of an API result, so the chat can draw them
 * with components made for them instead of a generic table. Pure functions with
 * unit tests (app/lib/__tests__/assistantEntities.test.ts).
 */
import { findRows, type Row } from './assistantView';

export type Entity = 'customer' | 'router' | 'plan' | 'payment' | 'voucher' | 'port';
export interface EntityResult { entity: Entity; rows: Row[]; single: boolean; total?: number }

const isObject = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
const has = (r: Row, ...keys: string[]) => keys.every((k) => k in r);

const SHAPES: [Entity, (r: Row) => boolean][] = [
  ['voucher', (r) => has(r, 'code') && ('voucher_type' in r || 'batch_id' in r)],
  // a router port as port-analytics reads it: its link and its health
  ['port', (r) => has(r, 'port') && isObject(r.link) && isObject(r.health)],
  ['customer', (r) => has(r, 'phone', 'status') && ('expiry' in r || 'effective_expiry' in r)],
  ['router', (r) => has(r, 'identity', 'ip_address')],
  ['plan', (r) => has(r, 'price', 'duration_unit', 'duration_value')],
  ['payment', (r) => 'amount' in r && ('phone_number' in r || 'customer_phone' in r || 'mpesa_receipt_number' in r)],
];

/** What a result is a list of (or one of), if it is something the chat has a component for. */
export function entityOf(payload: unknown): EntityResult | null {
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

/** "45 min", "3 h", "2 d": the size of a gap, without a direction. */
export function span(ms: number): string {
  const h = Math.abs(ms) / 3_600_000;
  return h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} d`;
}

/** RouterOS uptime ("1w2d03:04:05", "3d04:14:07", "05:12:44") in words: "9 d 3 h", "5 h". */
export function uptimeText(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const m = /^(?:(\d+)w)?(?:(\d+)d)?(\d+):(\d+):(\d+)$/.exec(v.trim());
  if (!m) return v.trim();
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
  };
}

export interface RouterFacts { id: number | string | null; name: string; identity: string | null; state: 'online' | 'offline' | 'unknown'; since: Date | null; uptime: number | null; emergency: boolean }

export function routerFacts(r: Row): RouterFacts {
  const status = String(r.status ?? 'unknown').toLowerCase();
  const state = status === 'online' ? 'online' : status === 'offline' ? 'offline' : 'unknown';
  const checks = typeof r.availability_checks === 'number' ? r.availability_checks : 0;
  const ok = typeof r.availability_successes === 'number' ? r.availability_successes : 0;
  return {
    id: typeof r.id === 'number' || typeof r.id === 'string' ? r.id : null,
    name: text(r.name) ?? text(r.identity) ?? 'Router',
    identity: text(r.identity),
    state,
    since: state === 'offline' ? asUtc(r.last_online_at) : asUtc(r.status_last_checked_at),
    uptime: checks > 0 ? Math.round((ok / checks) * 1000) / 10 : null,
    emergency: r.emergency_active === true,
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

export interface PaymentFacts { id: number | string | null; amount: number; who: string; phone: string | null; plan: string | null; state: 'paid' | 'failed' | 'pending'; reason: string | null; when: Date | null; receipt: string | null; method: string | null }

export function paymentFacts(r: Row): PaymentFacts {
  const status = String(r.status ?? 'completed').toLowerCase();
  const state = /fail|cancel|reject|timeout|expired/.test(status) ? 'failed' : /pend|process|initiat|queue/.test(status) ? 'pending' : 'paid';
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
  };
}
