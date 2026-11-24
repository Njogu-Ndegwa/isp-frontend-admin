/**
 * How every assistant table looks: which columns, in what order, under which labels and
 * drawn as what. One place for it, so the same kind of value reads the same way in every
 * table (a status is a chip, data is MB/GB, uptime is "2h 5m", a paid time is "in 3h").
 *
 *  - TABLE_SPECS: one declaration per API route the assistant draws as a table, chosen by
 *    the route's path (the `path` of the chat's data event). A spec names the row's title
 *    (the name, first and tappable), the columns and how each is read from a row, and which
 *    rows are not worth a line (a router account that is not a customer).
 *  - fallbackTable: every other list. It never shows ids, raw MACs, raw RouterOS fields
 *    ("bytes-in", ".id", "comment", address lists) or empty columns, humanises the keys,
 *    and picks the same kinds as the specs.
 *
 * Customers, routers, plans, payments, vouchers, PPPoE / hotspot users, ports and uptime
 * have components of their own (assistantEntities.ts); a spec here is for the routes that
 * would otherwise fall to a generic table. Pure functions with unit tests
 * (app/lib/__tests__/assistantTables.test.ts).
 *
 * Why the frontend: the page already decides every picture from the data (assistantVisual),
 * the data event carries the route's path, and a table's look changes with the UI, not the
 * API. The backend keeps describing data; nothing here needs a backend deploy.
 */
import type { Column, Kind } from './assistantVisual';
import { humanizeKey, type Row } from './assistantView';

export interface ColumnSpec {
  key: string;
  label: string;
  kind: Kind;
  value: (r: Row) => unknown;
}

export interface TableSpec {
  id: string;
  /** route templates, as the API index writes them ("/api/routers/{router_id}/users") */
  paths: string[];
  /** rows of this shape are drawn this way whatever the route (router logs) */
  shape?: (r: Row) => boolean;
  title: ColumnSpec;
  columns: ColumnSpec[];
  /** rows worth a line; the others are counted under the table */
  keep?: (r: Row) => boolean;
  /** what the rows left out are, for the line under the table: "{n} router accounts that are not customers" */
  dropped?: string;
}

export interface TableModel {
  rows: Row[];
  columns: Column[];
  /** rows left out by the spec, and what they are */
  dropped?: { n: number; what: string };
  spec?: string;
}

/* ---------------- reading values ---------------- */

const obj = (v: unknown): Row | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : null);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const count = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v);
  return null;
};
const pick = (...values: unknown[]): unknown => values.find((v) => v !== null && v !== undefined && v !== '');

export const MAC = /^([0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/i;
const MAC_IN_TEXT = /\b([0-9A-F]{2}[:-]){5}([0-9A-F]{2})\b/gi;
export const isMac = (v: unknown): boolean => typeof v === 'string' && MAC.test(v.trim());

/** "02:00:00:00:C8:47" -> "··C8:47": enough to tell devices apart, never the whole address. */
export function macTail(v: unknown): string {
  const s = str(v).toUpperCase().replace(/-/g, ':');
  const parts = s.split(':');
  return parts.length >= 2 ? `··${parts.slice(-2).join(':')}` : s;
}

/** Every MAC in a line of text cut to its tail (router log messages). */
export const maskMacs = (text: string): string => text.replace(MAC_IN_TEXT, (m) => macTail(m));

/** A device known only by its MAC, as the chat's text names it: "Device ··C8:47". */
export const deviceLabel = (v: unknown): string => `Device ${macTail(v)}`;

/**
 * The person a router comment names, from the ways our provisioning writes them:
 * "CID:123|Jane Wanjiru|...", "MACLOGIN|MAC:..|T:..|EXP:..|CID:9|Jane", "... redeemed for Guest 7824",
 * or a short note someone typed on the router ("office printer"). '' when it names nobody.
 */
export function nameFromRouterComment(comment: unknown): string {
  const text = str(comment);
  if (!text) return '';
  const redeemed = /redeemed for\s+(.+?)\s*$/i.exec(text);
  if (redeemed) return redeemed[1];
  const parts = text.split('|').map((p) => p.trim()).filter(Boolean);
  const cid = parts.findIndex((p) => /^CID:/i.test(p));
  if (cid >= 0 && parts[cid + 1] && !/^[A-Z_]+:/.test(parts[cid + 1])) return parts[cid + 1];
  if (parts.length > 1) return '';                       // our own tags (MACLOGIN|MAC:..|CHECKIN): no name
  return text.length <= 40 && !/^(CID:|MACLOGIN|fallback|\d+$)/i.test(text) && !MAC.test(text) ? text : '';
}

/** "EXP:<unix seconds>" in a router comment, as an API time (naive UTC). */
function expiryFromComment(comment: unknown): string | null {
  const m = /(?:^|\|)EXP:(\d{9,11})(?:\||$)/.exec(str(comment));
  return m ? new Date(Number(m[1]) * 1000).toISOString().replace('Z', '') : null;
}

/** A RouterOS profile named after a plan's speed: "plan_5M_5M" -> "5M/5M". */
function profileLabel(profile: unknown): string {
  const p = str(profile);
  const m = /^plan_(\d+[kKmM])_(\d+[kKmM])$/.exec(p);
  if (m) return m[1] === m[2] ? m[1] : `${m[1]}/${m[2]}`;
  return p === 'default' ? '' : p;
}

const sum = (...vs: unknown[]) => {
  const ns = vs.map(count).filter((n): n is number => n !== null);
  return ns.length ? ns.reduce((a, b) => a + b, 0) : null;
};

/** The name a row is listed under: the customer's, else the one the router knows, else the device. */
function nameOf(r: Row, ...fields: string[]): string {
  for (const f of fields) {
    const v = f.includes('.') ? obj(r[f.split('.')[0]])?.[f.split('.')[1]] : r[f];
    if (str(v) && !isMac(v)) return str(v);
  }
  const mac = fields.map((f) => r[f]).find(isMac) ?? [r.mac_address, r.mac, r.device_id].find(isMac);
  return mac ? deviceLabel(mac) : '';
}

const col = (key: string, label: string, kind: Kind, value: (r: Row) => unknown): ColumnSpec => ({ key, label, kind, value });

/* ---------------- the specs ---------------- */

const LOG_TOPIC = /^(error|critical|warning|account|hotspot|dhcp|pppoe|ppp|wireless|system|firewall|interface)$/;
const logTopic = (topics: unknown) => {
  const all = str(topics).split(',').map((s) => s.trim().toLowerCase());
  return all.find((x) => x === 'error' || x === 'critical' || x === 'warning') ?? all.find((x) => LOG_TOPIC.test(x)) ?? all[0] ?? '';
};
const logSpec: Omit<TableSpec, 'id' | 'paths'> = {
  shape: (r) => 'message' in r && 'time' in r && Object.keys(r).length <= 5,
  title: col('event', 'Event', 'text', (r) => maskMacs(str(r.message))),
  columns: [
    col('topic', 'Topic', 'status', (r) => logTopic(r.topics)),
    col('time', 'Time', 'clock', (r) => r.time),
  ],
};

export const TABLE_SPECS: TableSpec[] = [
  {
    // the router's own hotspot accounts (router_operations.get_router_users): as people
    id: 'router-hotspot-accounts',
    paths: ['/api/routers/{router_id}/users'],
    keep: (r) => !!obj(r.customer) || isMac(r.username) || !!nameFromRouterComment(r.comment),
    dropped: 'router accounts that are not customers ({n})',
    title: col('name', 'Name', 'text', (r) => str(obj(r.customer)?.name) || nameFromRouterComment(r.comment) || (isMac(r.username) ? deviceLabel(r.username) : str(r.username))),
    columns: [
      col('status', 'Status', 'status', (r) => (r.disabled === true ? 'disabled' : r.active === true ? 'online' : 'offline')),
      col('plan', 'Plan', 'text', (r) => str(obj(r.customer)?.plan) || profileLabel(r.profile)),
      col('left', 'Time left', 'until', (r) => pick(obj(r.customer)?.expiry, expiryFromComment(r.comment))),
      col('uptime', 'Online for', 'duration', (r) => obj(r.session)?.uptime),
      col('data', 'Data used', 'bytes', (r) => sum(obj(r.session)?.bytes_in, obj(r.session)?.bytes_out)),
    ],
  },
  {
    id: 'offline-customers',
    paths: ['/api/routers/{router_id}/offline-customers'],
    title: col('name', 'Name', 'text', (r) => nameOf(r, 'name', 'pppoe_username')),
    columns: [
      col('connection', 'Connection', 'text', (r) => ({ pppoe: 'PPPoE', static_ip: 'Static IP', hotspot: 'Hotspot' } as Record<string, string>)[str(r.connection_type)] ?? humanizeKey(str(r.connection_type))),
      col('plan', 'Plan', 'text', (r) => r.plan),
      col('since', 'Offline since', 'when', (r) => r.offline_since),
      col('reason', 'Reason', 'text', (r) => pick(r.reason, r.since_note)),
      col('left', 'Time left', 'until', (r) => r.expiry),
    ],
  },
  {
    id: 'blocked-devices',
    paths: ['/api/routers/{router_id}/blocked-devices'],
    title: col('name', 'Device', 'text', (r) => deviceLabel(r.mac_address)),
    columns: [
      col('status', 'Status', 'status', (r) => (r.disabled === true ? 'paused' : 'blocked')),
      col('reason', 'Reason', 'text', (r) => r.reason),
      col('at', 'Blocked', 'when', (r) => r.blocked_at),
    ],
  },
  {
    id: 'illegal-connections',
    paths: ['/api/routers/{router_id}/illegal-connections'],
    title: col('name', 'Name', 'text', (r) => nameOf(r, 'customer_name', 'hostname', 'mac_address')),
    columns: [
      col('severity', 'Severity', 'status', (r) => str(r.severity).toLowerCase()),
      col('problem', 'Problem', 'text', (r) => pick(r.issue, ({ UNAUTHORIZED: 'Not a paying customer', EXPIRED_CONNECTED: 'Paid time ended' } as Record<string, string>)[str(r.type)])),
      col('data', 'Data used', 'mb', (r) => r.bytes_total_mb),
      col('uptime', 'Online for', 'duration', (r) => r.uptime),
      col('device', 'Device', 'device', (r) => r.mac_address),
    ],
  },
  {
    id: 'sms-campaigns',
    paths: ['/api/messaging/campaigns'],
    title: col('message', 'Message', 'text', (r) => r.body),
    columns: [
      col('status', 'Status', 'status', (r) => r.status),
      col('recipients', 'Recipients', 'number', (r) => r.recipient_count),
      col('sent', 'Sent', 'number', (r) => r.sent_count),
      col('failed', 'Failed', 'number', (r) => r.failed_count),
      col('at', 'Created', 'when', (r) => r.created_at),
    ],
  },
  {
    id: 'inbox',
    paths: ['/api/messaging/inbox'],
    title: col('subject', 'Subject', 'text', (r) => pick(r.subject, r.body)),
    columns: [
      col('status', 'Status', 'status', (r) => (r.is_read === true ? 'read' : 'unread')),
      col('at', 'Received', 'when', (r) => r.created_at),
    ],
  },
  {
    id: 'ad-clicks',
    paths: ['/api/ads/{ad_id}/clicks'],
    title: col('tap', 'Tap', 'text', (r) => humanizeKey(str(r.click_type) || 'tap')),
    columns: [
      col('where', 'Where', 'text', (r) => humanizeKey(str(r.placement))),
      col('router', 'Router', 'text', (r) => r.router_identity),
      col('device', 'Device', 'device', (r) => pick(r.mac_address, isMac(r.device_id) ? r.device_id : null)),
      col('at', 'When', 'when', (r) => r.created_at),
    ],
  },
  {
    id: 'plan-performance',
    paths: ['/api/plans/performance'],
    title: col('plan', 'Plan', 'text', (r) => r.plan_name),
    columns: [
      col('price', 'Price', 'money', (r) => r.plan_price),
      col('sales', 'Sales', 'number', (r) => r.total_sales),
      col('revenue', 'Revenue', 'money', (r) => r.total_revenue),
      col('avg', 'Average sale', 'money', (r) => r.average_revenue_per_sale),
      col('active', 'Active customers', 'number', (r) => r.active_customers),
    ],
  },
  {
    id: 'customer-devices',
    paths: ['/api/customers/{customer_id}/devices'],
    title: col('name', 'Device', 'text', (r) => nameOf(r, 'device_name', 'device_mac')),
    columns: [
      col('status', 'Status', 'status', (r) => (obj(r.live) ? (obj(r.live)?.online === true ? 'online' : 'offline') : '')),
      col('main', 'Main device', 'bool', (r) => r.is_main_device),
      col('data', 'Data used', 'mb', (r) => r.period_usage_mb),
      col('device', 'MAC', 'device', (r) => r.device_mac),
      col('at', 'Added', 'when', (r) => r.added_at),
    ],
  },
  {
    id: 'active-sessions',
    paths: ['/api/mikrotik/active-sessions', '/api/mikrotik/{router_id}/pppoe/active'],
    title: col('name', 'Name', 'text', (r) => nameOf(r, 'customer_name', 'user', 'name', 'mac_address', 'caller_id')),
    columns: [
      col('uptime', 'Online for', 'duration', (r) => r.uptime),
      col('data', 'Data used', 'bytes', (r) => sum(r.bytes_in, r.bytes_out)),
      col('idle', 'Idle', 'duration', (r) => r.idle_time),
    ],
  },
  {
    id: 'top-users',
    paths: ['/api/mikrotik/top-users'],
    title: col('name', 'Name', 'text', (r) => str(r.customerName) || (isMac(r.identifier) || isMac(r.mac) ? deviceLabel(isMac(r.identifier) ? r.identifier : r.mac) : str(r.identifier))),
    columns: [
      col('connection', 'Connection', 'text', (r) => r.serviceLabel ?? r.connectionType),
      col('down', 'Downloaded', 'bytes', (r) => r.downloadBytes),
      col('up', 'Uploaded', 'bytes', (r) => r.uploadBytes),
      col('data', 'Total', 'bytes', (r) => r.totalBytes),
    ],
  },
  {
    id: 'staff-activity',
    paths: ['/api/staff/activity'],
    title: col('who', 'Who', 'text', (r) => r.actor_label),
    columns: [
      col('what', 'What', 'text', (r) => pick(r.summary, humanizeKey(str(r.action)))),
      col('result', 'Result', 'status', (r) => (count(r.status_code) === null ? '' : (count(r.status_code) as number) < 400 ? 'done' : 'failed')),
      col('at', 'When', 'when', (r) => r.created_at),
    ],
  },
  {
    id: 'leads',
    paths: ['/api/leads'],
    title: col('name', 'Name', 'text', (r) => r.name),
    columns: [
      col('stage', 'Stage', 'status', (r) => r.stage),
      col('source', 'Source', 'text', (r) => r.source),
      col('next', 'Next follow-up', 'until', (r) => r.next_followup_at),
      col('at', 'Added', 'when', (r) => r.created_at),
    ],
  },
  {
    id: 'subscription-invoices',
    paths: ['/api/subscription/invoices'],
    title: col('period', 'Period', 'text', (r) => pick(r.period_label, r.period_start)),
    columns: [
      col('status', 'Status', 'status', (r) => (r.is_overdue === true ? 'overdue' : r.status)),
      col('charge', 'Charge', 'money', (r) => pick(r.final_charge, r.gross_charge)),
      col('paid', 'Paid', 'money', (r) => r.amount_paid),
      col('balance', 'Balance', 'money', (r) => r.balance_remaining),
      col('due', 'Due', 'until', (r) => r.due_date),
    ],
  },
  {
    id: 'subscription-payments',
    paths: ['/api/subscription/payments'],
    title: col('method', 'Payment', 'text', (r) => humanizeKey(str(r.payment_method) || 'payment')),
    columns: [
      col('status', 'Status', 'status', (r) => r.status),
      col('amount', 'Amount', 'money', (r) => r.amount),
      col('at', 'When', 'when', (r) => r.created_at),
    ],
  },
  { id: 'router-logs', paths: ['/api/hotspot/{router_id}/logs', '/api/pppoe/{router_id}/logs'], ...logSpec },
];

const templateRe = (t: string) => new RegExp(`^${t.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{[^}]+\\?\}|\{[^}]+\}/g, '[^/]+')}$`);
const COMPILED = TABLE_SPECS.map((s) => ({ spec: s, res: s.paths.map(templateRe) }));

/** The spec for a route's rows: by its path, else by the rows' own shape. */
export function specFor(path: string | null | undefined, rows: Row[]): TableSpec | null {
  const p = (path ?? '').split('?')[0].replace(/\/+$/, '');
  if (p) {
    const byPath = COMPILED.find(({ res }) => res.some((re) => re.test(p)));
    if (byPath) return byPath.spec;
  }
  const sample = rows.slice(0, 5);
  return sample.length ? TABLE_SPECS.find((s) => s.shape && sample.every(s.shape)) ?? null : null;
}

/** Rows read through a spec: one plain row per kept row, keyed by the spec's columns. */
export function applySpec(spec: TableSpec, rows: Row[]): TableModel {
  const kept = spec.keep ? rows.filter(spec.keep) : rows;
  const all = [spec.title, ...spec.columns];
  const out = kept.map((r) => {
    const row: Row = { _id: pick(r.id, r.customer_id, obj(r.customer)?.id) ?? null };
    for (const c of all) row[c.key] = c.value(r) ?? null;
    return row;
  });
  // a column empty on every row says nothing: left out (the title always stays)
  const columns = all.filter((c, i) => i === 0 || out.some((r) => !blank(r[c.key])))
    .map(({ key, label, kind }) => ({ key, label, kind }));
  const n = rows.length - kept.length;
  return { rows: out, columns, spec: spec.id, ...(n > 0 && spec.dropped ? { dropped: { n, what: spec.dropped } } : {}) };
}

/* ---------------- the fallback ---------------- */

const blank = (v: unknown) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** Fields that never become a column: ids, MACs, RouterOS internals and housekeeping. */
const ID_KEY = /(^|[_-])(id|ids|uuid|pk)$|^id$|^\.|request_id$|^checkout/i;
const MAC_KEY = /(^|[_-])(mac|macs|mac_address|caller_id|last_caller_id|bssid)$|mac[-_]address/i;
const RAW_KEY = /^(comment|address|addresses|address_list|address-list|ip|ip_address|interface|server|service|profile|dynamic|invalid|radius|blocked|bypassed|default|target|queue_name|queueName|max_limit|maxLimit|limit_uptime|uptime_limit|password|secret|token|session_id|result_code|reference|lipay_tx_no|settlement|payment_reference|checkout_url|segments_per_message|refunded_credits|source_id|user_id|owner_id|subscription_owner_id)$/i;
const SECRET_VALUE = /^•+/;
const STATUS_KEY = /^(status|state|severity|stage|result|is_online|online|active|is_active|is_read|read|enabled|disabled|delivery_status|payment_status|subscription_status|customer_status)$/i;
const BYTES_KEY = /(^|[_-])bytes($|[_-])|Bytes$|^bytes/i;
const MB_KEY = /(_mb|MB)$/;
const DURATION_KEY = /^(uptime|idle_time|idle-time|session_time|session-time|duration_seconds|online_seconds|.*_seconds)$/i;
const UNTIL_KEY = /(expir|ends_at|end_date|due_date|due_at|until|next_followup)/i;
const MONEY_KEY = /(amount|revenue|price|balance|paid|cost|fee|earning|income|payout|charge|profit|debt|commission|spend|spent|credit_kes|_kes)$/i;
const NAME_PRIORITY = ['name', 'customer_name', 'full_name', 'title', 'label', 'subject', 'plan_name', 'router_name', 'identity', 'hostname', 'host-name', 'user', 'username', 'code', 'phone', 'phone_number'];
const NESTED_NAMES = ['customer', 'plan', 'router'];

/** A nested record ("plan": {...}) read as its name; anything else nested is not a column. */
function flattenRow(r: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(r)) {
    const o = obj(v);
    if (o) {
      const named = str(o.name) || str(o.label) || str(o.title);
      if (named && NESTED_NAMES.includes(k)) out[k] = named;
      else if (k === 'live' && typeof o.online === 'boolean') out.online = o.online;
      continue;
    }
    if (Array.isArray(v)) continue;          // lists (address lists, sessions) never become a column
    out[k] = v;
  }
  return out;
}

const ROUTER_DURATION = /^(\d+w)?(\d+d)?(\d+h)?(\d+m)?(\d+s)?$|^(\d+w)?(\d+d)?\d{1,2}:\d{2}:\d{2}$/;

function kindOf(key: string, values: unknown[]): Kind | null {
  const present = values.filter((v) => !blank(v));
  if (!present.length) return null;
  if (present.every((v) => typeof v === 'string' && SECRET_VALUE.test(v))) return null;
  const nums = present.every((v) => count(v) !== null);
  if (STATUS_KEY.test(key)) return 'status';
  if (BYTES_KEY.test(key) && nums) return 'bytes';
  if (MB_KEY.test(key) && nums) return 'mb';
  if (DURATION_KEY.test(key) && present.every((v) => count(v) !== null || (typeof v === 'string' && ROUTER_DURATION.test(v.trim())))) return 'duration';
  if (present.every((v) => typeof v === 'boolean')) return 'bool';
  if (present.every((v) => typeof v === 'string' && ISO_DATE.test(v))) {
    if (present.every((v) => (v as string).length <= 10)) return 'date';
    return UNTIL_KEY.test(key) ? 'until' : 'when';
  }
  if (nums) {
    if (/(percent|pct|percentage|share|rate)$/i.test(key) && !/bps|rate_(up|down)/i.test(key)) return 'percent';
    if (MONEY_KEY.test(key) && !/(count|qty|customers|users|sales)$/i.test(key)) return 'money';
    return typeof present[0] === 'number' ? 'number' : 'text';
  }
  if (present.every((v) => typeof v === 'string' || typeof v === 'number')) {
    // a short code among few values (pending, sent, queued) is a status in all but name
    return 'text';
  }
  return null;
}

/** Whether a key may become a column at all, from its name and its values. */
function allowed(key: string, values: unknown[]): boolean {
  if (key.startsWith('_') || ID_KEY.test(key) || RAW_KEY.test(key) || MAC_KEY.test(key)) return false;
  if (/-/.test(key) && key !== 'host-name') return false; // RouterOS's own field names ("bytes-in", "mac-address")
  const present = values.filter((v) => !blank(v));
  if (present.length && present.every(isMac)) return false;
  return true;
}

const ORDER: Record<string, number> = { status: 1, text: 2, until: 3, money: 4, bytes: 5, mb: 5, duration: 6, number: 7, percent: 7, bool: 8, when: 9, date: 9, clock: 9, device: 10, datetime: 9 };
const LABELS: Record<string, string> = { plan: 'Plan', router: 'Router', customer: 'Customer', online: 'Status', is_online: 'Status', expiry: 'Time left', effective_expiry: 'Time left', created_at: 'Created', updated_at: 'Updated', 'host-name': 'Device name', uptime: 'Online for', is_read: 'Status' };

/** The generic table: human columns only, the name first. */
export function fallbackTable(rawRows: Row[], max = 6): TableModel {
  const rows = rawRows.map(flattenRow);
  const keys: string[] = [];
  for (const r of rows.slice(0, 40)) for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k);
  const sample = rows.slice(0, 60);
  const cols: Column[] = [];
  for (const key of keys) {
    const values = sample.map((r) => r[key]);
    if (!allowed(key, values)) continue;
    const kind = kindOf(key, values);
    if (kind) cols.push({ key, label: LABELS[key] ?? humanizeKey(key.replace(/^is_/, '')), kind });
  }
  // the name: a known name field, else the text that tells rows apart, else the device behind a MAC
  const texty = cols.filter((c) => c.kind === 'text');
  let title = NAME_PRIORITY.map((k) => texty.find((c) => c.key === k)).find(Boolean) ?? null;
  const macOf = (raw: Row) => Object.entries(raw).find(([k, v]) => MAC_KEY.test(k) && isMac(v))?.[1] ?? Object.values(raw).find(isMac);
  // nothing names the rows but a MAC: the device is the row's name ("Device ··C8:47")
  const byDevice = !title && rawRows.some((r) => macOf(r));
  if (!title && !byDevice) {
    let best = 0;
    for (const c of texty) {
      const distinct = new Set(rows.map((r) => String(r[c.key] ?? ''))).size;
      if (distinct > best) { best = distinct; title = c; }
    }
  }
  const out = rows.map((r, i) => {
    const raw = rawRows[i];
    const row: Row = { ...r, _id: pick(raw.id, raw.customer_id) ?? null };
    // a device known by its MAC alone is named by its tail, never its whole address
    if (!title || blank(r[title.key]) || isMac(r[title.key])) {
      const mac = macOf(raw);
      if (mac) row._title = deviceLabel(mac);
    }
    return row;
  });
  let columns = cols.filter((c) => c !== title);
  const needsDevice = out.some((r) => r._title);
  const head: Column = title && !needsDevice ? title : { key: '__name', label: title?.label ?? 'Name', kind: 'text' };
  if (head.key === '__name') for (const r of out) r.__name = r._title ?? (title ? r[title.key] : null);
  columns = columns.sort((a, b) => (ORDER[a.kind] ?? 9) - (ORDER[b.kind] ?? 9));
  // a phone is a contact, not a description: kept only when there is room
  columns = [...columns.filter((c) => !/phone/i.test(c.key)), ...columns.filter((c) => /phone/i.test(c.key))];
  return { rows: out, columns: [head, ...columns].slice(0, max) };
}

/** The table for a route's rows: its spec when it has one, else the fallback. */
export function tableFor(path: string | null | undefined, rows: Row[]): TableModel {
  const spec = specFor(path, rows);
  return spec ? applySpec(spec, rows) : fallbackTable(rows);
}

/** Whether a figure beside a list ("router_name": "Main Tower") is worth a word above the table. */
export function metaShown(key: string, value: unknown): boolean {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return false;
  if (ID_KEY.test(key) || RAW_KEY.test(key) || MAC_KEY.test(key) || /-/.test(key)) return false;
  if (/^(success|cached|cache_age_seconds|live|stale|filter_.*|.*_persisted|generated_at|scan_time|checked_at|note|recommendation|menu|page|per_page|pages|total_pages)$/i.test(key)) return false;
  return !(typeof value === 'string' && (value.length > 60 || ISO_DATE.test(value)));
}

/* ---------------- which picture a route gets ---------------- */

/**
 * The drawing a route always gets, whatever `show` the model sent: the model's choice is
 * a hint the route may accept (`allow`), never the decider, so the same question draws
 * the same way for everyone. From the display corpus of 19-24 Nov (app/lib/assistantIntents.json):
 * lists are tables, one record a card, a period's totals tiles, a figure over time a trend,
 * a ranking bars. `table` on a chart route is allowed because a reseller asks for it
 * ("show it in a table, not a graph"). A route not listed keeps the model's hint.
 */
export type Display = 'table' | 'card' | 'tiles' | 'trend' | 'bars' | 'share' | 'none';
export interface DisplayRule {
  paths: string[];
  display: Display;
  /** hints the route also takes as asked */
  allow?: Display[];
  /** a route that serves two intents decides by its query (one router's health vs every router's) */
  byQuery?: (q: Record<string, unknown>) => Display | null;
}

export const DISPLAY_RULES: DisplayRule[] = [
  // lists of records: one table each (several have components of their own)
  { display: 'table', paths: [
    '/api/customers', '/api/customers/active', '/api/mpesa/transactions', '/api/mpesa/transactions/failed', '/api/c2b/unmatched',
    '/api/routers', '/api/plans', '/api/plans/by-router/{router_id}', '/api/vouchers', '/api/payment-methods', '/api/staff',
    '/api/pppoe/{router_id}/users', '/api/pppoe/{router_id}/secrets', '/api/pppoe/{router_id}/logs', '/api/hotspot/{router_id}/users',
    '/api/hotspot/{router_id}/logs', '/api/routers/{router_id}/users', '/api/routers/{router_id}/ports', '/api/routers/{router_id}/port-analytics',
    '/api/routers/{router_id}/access-points', '/api/routers/{router_id}/offline-customers', '/api/routers/{router_id}/illegal-connections',
    '/api/routers/{router_id}/blocked-devices', '/api/routers/{router_id}/routeros', '/api/routers/{router_id}/checkup',
    '/api/routers/{router_id}/interfaces', '/api/messaging/campaigns', '/api/messaging/inbox', '/api/messaging/templates',
    '/api/ads/manage', '/api/ads/{ad_id}/clicks', '/api/subscription/invoices', '/api/subscription/payments', '/api/leads',
    '/api/staff/activity', '/api/customers/{customer_id}/devices', '/api/customers/{customer_id}/audit-log', '/api/mikrotik/active-sessions',
    '/api/mikrotik/{router_id}/pppoe/active', '/api/compensation/outage/history', '/api/access-credentials', '/api/feedback/posts',
  ] },
  // a period's totals: tiles
  { display: 'tiles', paths: ['/api/mpesa/transactions/summary', '/api/dashboard/overview', '/api/dashboard/stats', '/api/messaging/credits',
    '/api/profile/setup-status', '/api/customers/{customer_id}/payment-summary', '/api/pppoe/{router_id}/overview', '/api/hotspot/{router_id}/overview',
    '/api/vouchers/stats', '/api/leads/pipeline/stats', '/api/ads/analytics'] },
  // the dashboard's analytics hold totals, a daily series and a split by plan: totals unless the series or the split was asked for
  { display: 'tiles', allow: ['trend', 'bars', 'share'], paths: ['/api/dashboard/analytics'] },
  // one router's readings are dials; without a router it is every router's, a table
  { display: 'tiles', paths: ['/api/mikrotik/health'], byQuery: (q) => (q.router_id === undefined || q.router_id === null || q.router_id === '' ? 'table' : null) },
  // a figure over time
  { display: 'trend', allow: ['table'], paths: ['/api/dashboard/revenue-over-time', '/api/dashboard/daily-revenue', '/api/dashboard/transactions-daily',
    '/api/mikrotik/bandwidth-history', '/api/customers/{customer_id}/usage/timeline', '/api/customers/{customer_id}/usage/history',
    '/api/routers/{router_id}/health-history'] },
  // a ranking
  { display: 'bars', allow: ['table'], paths: ['/api/plans/performance', '/api/mikrotik/top-users', '/api/resellers/me/usage/top',
    '/api/customers/usage/bulk', '/api/router-health/ranking'] },
  // one record
  { display: 'card', paths: ['/api/customers/{customer_id}', '/api/routers/{router_id}/uptime', '/api/routers/{router_id}/live',
    '/api/router_stats/{router_id}', '/api/reseller/payout-settings', '/api/portal/settings', '/api/profile', '/api/subscription',
    '/api/subscription/current-invoice', '/api/customers/{customer_id}/usage', '/api/customers/{customer_id}/static/status',
    '/api/customers/{customer_id}/cpe', '/api/customers/{customer_id}/cpe/status', '/api/routers/{router_id}/diagnose/{mac_address}',
    '/api/pppoe/{router_id}/diagnose/{username}', '/api/pppoe/{router_id}/client-details/{username}', '/api/payment-methods/{method_id}',
    '/api/ads/manage/{ad_id}', '/api/messaging/campaigns/{campaign_id}', '/api/messaging/credits/orders/{order_id}', '/api/messaging/gateway/status',
    '/api/ad-sales/access', '/api/pppoe/customers/{customer_id}/presence', '/api/admin/routers/{router_id}/remote-access'] },
  // ids only, nothing a person can read: "who is online" is GET /api/customers?online=true
  { display: 'none', paths: ['/api/realtime/customers/online', '/api/realtime/routers'] },
];

const RULES = DISPLAY_RULES.map((r) => ({ rule: r, res: r.paths.map(templateRe) }));

/** The rule for a route; of two that match, the one whose template has fewer placeholders. */
export function displayRuleFor(path: string | null | undefined): DisplayRule | null {
  const p = (path ?? '').split('?')[0].replace(/\/+$/, '');
  if (!p) return null;
  let best: DisplayRule | null = null;
  let bestHoles = Infinity;
  for (const { rule, res } of RULES) {
    res.forEach((re, i) => {
      const holes = (rule.paths[i].match(/\{/g) ?? []).length;
      if (re.test(p) && holes < bestHoles) { best = rule; bestHoles = holes; }
    });
  }
  return best;
}

/** Hints that are not drawings and always pass through ("pppoe_login" is the server's own card). */
const PASS_THROUGH = new Set(['pppoe_login', 'none']);

/** The drawing a result gets: the route's rule, the model's hint only where the rule allows it. */
export function displayFor(path: string | null | undefined, query: Record<string, unknown> | null | undefined, show: string | null | undefined): string {
  const hint = show || 'auto';
  if (PASS_THROUGH.has(hint)) return hint;
  const rule = displayRuleFor(path);
  if (!rule) return hint;
  const byQuery = rule.byQuery?.(query ?? {});
  if (byQuery) return byQuery;
  return rule.allow?.includes(hint as Display) ? hint : rule.display;
}
