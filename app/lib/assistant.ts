/**
 * Dashboard assistant client: the chat that can do everything the dashboard does.
 *
 * The backend (app/services/assistant/ in isp-billing) runs every action through
 * its own API with the signed-in person's token, so this file only talks to the
 * /api/assistant routes. Chat and confirm answers stream as Server-Sent Events
 * over a POST, which EventSource cannot send, so the stream is read by hand.
 */
import { API_BASE_URL } from './api';

export type AssistantEvent =
  | { type: 'conversation'; id: string; title: string }
  | { type: 'text'; delta: string }
  | { type: 'step'; call_id: string; label: string; phase: 'start' | 'end'; method?: string; path?: string; ok?: boolean; status?: number }
  | { type: 'retract'; chars: number }
  | { type: 'data'; call_id: string; title: string; method: string; path: string; query?: Record<string, unknown> | null; show: ShowHint; fields?: ShowFields | null; payload: unknown; replaces?: string }
  | { type: 'action'; action_id: string; title: string; summary: string; method: string; path: string; query?: Record<string, unknown> | null; body?: unknown; permission?: string | null; sensitive?: boolean; expires_at?: string; status: ActionStatus; form?: FormField[]; previews?: boolean; retry_of?: string; reason?: string }
  | { type: 'action_result'; action_id: string; status: ActionStatus; ok: boolean; http_status?: number; detail?: string; payload?: unknown; awaiting?: PaymentWait; preview?: unknown; preview_of?: string }
  | { type: 'notice'; level: 'info' | 'error'; message: string }
  | { type: 'done'; conversation_id: string; usage?: { input_tokens: number; output_tokens: number } };

export type ActionStatus = 'pending' | 'running' | 'done' | 'failed' | 'declined' | 'expired';

/**
 * One input of a change shown as a form. The server builds these from the API's own
 * schema (never from the model) and checks the values again on Confirm.
 */
export interface FormField {
  name: string;
  label: string;
  kind: 'text' | 'integer' | 'number' | 'boolean' | 'select' | 'date' | 'datetime' | 'password' | 'list';
  required: boolean;
  options?: string[];
  /** a picker of the person's own records: id -> name */
  option_labels?: Record<string, string>;
  /** for a list: what each item is */
  item_kind?: 'text' | 'integer' | 'number';
  hint?: string;
  value?: unknown;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  /** shown only while another field holds one of these values (a till's number while the kind is "till") */
  when?: Record<string, string[]>;
  /** for a picker of records: what each option is, for fields that hang on it (connection_type: id -> "pppoe") */
  option_attrs?: Record<string, Record<string, string>>;
  /** a photo or video picked on the phone: uploaded with this ticket action, its address becomes the value */
  upload?: { accept?: string; ticket?: string };
  /** one half of a place (latitude or longitude): the pair is picked on a map */
  geo?: 'lat' | 'lng';
  /** ready-made values to pick instead of uploading (built-in hero photos), drawn as pictures */
  presets?: { label: string; value: string }[];
  /** the API's own default, not something chosen: does not pull the field out of More options */
  default?: boolean;
  /** a picker whose values are numbers (record ids, 5/10/15 minutes) */
  value_kind?: 'integer' | 'text';
  /** a picker of the person's own records: where more are found by search (thousands of customers) */
  pick?: PickSource;
  /** a set changed by ticks (a router's PPPoE ports): what it is now; the page sends only what changed */
  baseline?: string[];
  /** the request fields that carry what was ticked and unticked */
  changes?: { add: string; remove: string };
  /** the order picked is the order sent (WAN 1, WAN 2...) */
  ordered?: boolean;
  /** the right keyboard and example for what it holds */
  format?: 'mac' | 'ip' | 'phone';
  /** long text: a text area; sms: with its SMS count while it is typed */
  multiline?: boolean;
  sms?: boolean;
  /** a date and time on the person's own clock ("EAT") */
  zone?: string;
}

/** Where a record picker's rows come from: the list, its search filter and how a row reads. */
export interface PickSource {
  from: string;
  search?: string;
  query?: Record<string, string | number>;
  label?: string;
}

/** How one record reads in a picker, the way the server names it: "Amina · 0712 000 001". */
export function pickLabel(row: Record<string, unknown>, template?: string): string {
  const plain = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('en-US') : String(v));
  if (template) {
    const parts = template.split(' · ').flatMap((piece) => {
      const names = [...piece.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      if (!names.length || names.some((n) => row[n] === undefined || row[n] === null || row[n] === '')) return [];
      return [piece.replace(/\{(\w+)\}/g, (_, n: string) => plain(row[n]))];
    });
    if (parts.length) return parts.join(' · ').slice(0, 80);
  }
  const name = row.name ?? row.identity ?? row.label;
  return name !== undefined && name !== null && name !== '' ? String(name).slice(0, 80) : `#${String(row.id)}`;
}

/** What was ticked and unticked against what it is now: only that is sent, so nothing else moves. */
export function setChanges(baseline: string[], picked: string[]): { add: string[]; remove: string[] } {
  return { add: picked.filter((p) => !baseline.includes(p)), remove: baseline.filter((p) => !picked.includes(p)) };
}

// GSM 03.38 basic set plus its extension (each extension character costs two)
const GSM = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXT = '^{}\\[~]|€\f';

/** How many SMS a text is: 160 plain characters in one, 153 each when it is split; 70 / 67 with emoji or other letters. */
export function smsSegments(text: string): { chars: number; segments: number; unicode: boolean } {
  let units = 0;
  let unicode = false;
  for (const ch of text) {
    if (GSM.includes(ch)) units += 1;
    else if (GSM_EXT.includes(ch)) units += 2;
    else { unicode = true; break; }
  }
  const chars = unicode ? [...text].reduce((n, ch) => n + (ch.length > 1 ? 2 : 1), 0) : units;
  if (!chars) return { chars: 0, segments: 0, unicode };
  const [one, many] = unicode ? [70, 67] : [160, 153];
  return { chars, segments: chars <= one ? 1 : Math.ceil(chars / many), unicode };
}

/**
 * A field that belongs to one choice shows, and is sent, only while that choice holds:
 * a till's number while the kind is "till"; "*" means any value at all (the FUP fields
 * once a data cap is filled in); "plan_id.connection_type" reads the picked plan's own
 * type from the plan picker (a PPPoE login for a PPPoE plan). Every condition must hold.
 */
export const fieldApplies = (
  f: Pick<FormField, 'when'>,
  values: Record<string, unknown>,
  form: Pick<FormField, 'name' | 'option_attrs'>[] = [],
): boolean =>
  !f.when || Object.entries(f.when).every(([choice, allowed]) => {
    const [base, attr] = choice.split('.', 2);
    let v: unknown = values[base];
    if (attr) {
      const picker = form.find((p) => p.name === base);
      v = typeof v === 'string' ? picker?.option_attrs?.[attr]?.[v] : undefined;
    }
    if (typeof v === 'boolean') v = v ? 'true' : '';
    if (typeof v === 'number') v = String(v);
    if (typeof v !== 'string' || !v.trim() || (allowed.includes('*') && Number(v) === 0)) return false;
    return allowed.includes('*') || allowed.some((a) => a.toLowerCase() === v.toLowerCase());
  });

export const isShort = (f: FormField) => f.kind === 'integer' || f.kind === 'number' || f.kind === 'select';
/** On a wide card, ordinary text and passwords can share a row too; long text never does. */
const canHalfWide = (f: FormField) => isShort(f) || f.kind === 'password' || (f.kind === 'text' && !f.multiline && (f.maxLength ?? 0) <= 120);

/**
 * How wide each field is: half a row only beside another half-row field, so a field
 * that ends up alone (a picker between two text boxes, the till number once the other
 * kinds are hidden) takes the whole row instead of leaving a hole next to it.
 */
export function fieldSpans(fields: FormField[]): Record<string, string> {
  const pair = (fits: (f: FormField) => boolean) => {
    const half = new Set<string>();
    for (let i = 0; i < fields.length; i++) {
      if (fits(fields[i]) && i + 1 < fields.length && fits(fields[i + 1])) {
        half.add(fields[i].name);
        half.add(fields[i + 1].name);
        i++;
      }
    }
    return half;
  };
  const narrow = pair(isShort);
  const wide = pair(canHalfWide);
  return Object.fromEntries(fields.map((f) => [f.name,
    `${narrow.has(f.name) ? 'col-span-1' : 'col-span-2'} ${wide.has(f.name) ? '@md:col-span-1' : '@md:col-span-2'}`]));
}

/** A Confirm or Cancel; `values` are what the person filled in on a form card. */
export interface Decision { action_id: string; approve: boolean; values?: Record<string, unknown> }

/** How the model would like a result drawn. The page draws it from the data; the model never writes the numbers. */
export type ShowHint = 'auto' | 'table' | 'card' | 'none' | 'tiles' | 'trend' | 'bars' | 'share';
/** Optional field names in the result: the label (category or date) and the figures. */
export interface ShowFields {
  label?: string | null;
  value?: string[] | null;
  /** the one the question is about (a customer, a router): drawn lit among the others, with its rank */
  highlight?: string | null;
}

/** What the chat draws; the server stores the same items (minus steps) as the transcript. */
export type TranscriptItem =
  | { type: 'user'; text: string; images?: string[]; at?: string }
  | { type: 'assistant'; text: string; at?: string }
  | { type: 'support'; text: string; author: string; at?: string }
  | { type: 'step'; call_id: string; label: string; done?: boolean; ok?: boolean }
  | (Extract<AssistantEvent, { type: 'data' }> & { at?: string })
  | (Extract<AssistantEvent, { type: 'action' }> & { at?: string })
  | (Extract<AssistantEvent, { type: 'action_result' }> & { at?: string })
  | (Extract<AssistantEvent, { type: 'notice' }> & { at?: string });

export interface ActionRecord {
  id: string;
  status: ActionStatus;
  title: string;
  result_status?: number | null;
  result_summary?: string | null;
  expires_at?: string | null;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updated_at: string;
  created_at?: string;
  organization_name?: string | null;
  email?: string | null;
  staff_name?: string | null;
  user_id?: number;
  view_as?: boolean;
}

export interface ConversationDetail {
  id: string;
  title: string;
  transcript: TranscriptItem[];
  actions: Record<string, ActionRecord>;
  organization_name?: string | null;
  email?: string | null;
}

export interface UsageWindow { questions: number; accounts: number; cost_usd: number }

export interface AssistantUsageReport {
  summary: { today: UsageWindow; '7d': UsageWindow; '30d': UsageWindow };
  days: { day: string; questions: number; accounts: number; model_calls: number; cost_usd: number }[];
  top_accounts: { user_id: number; organization_name?: string | null; email?: string | null; questions: number; cost_usd: number }[];
  note: string;
}

export interface AssistantStatus {
  enabled: boolean;
  reason?: string | null;
  model?: string | null;
  read_only: boolean;
  action_ttl_minutes: number;
  retention_days: number;
  /** The assistant is this person's start page (their own choice, else the rollout share). */
  home?: boolean;
  home_choice?: HomeChoice | null;
  /** Due a quiet "how is it working for you?" (first after a few questions, then days apart, a few times at most). */
  ask_rating?: boolean;
}

/** A payment the action only started (an M-Pesa PIN prompt): where to read whether it was paid. */
/** mpesa: a payment the person makes (PIN on the phone); payout: money sent to them (a withdrawal) */
export interface PaymentWait { kind: 'mpesa' | 'payout'; poll: string; message: string }
export interface PaymentStatus { status: 'pending' | 'completed' | 'failed' | string; paid: boolean; summary: string }

/** A feature someone asked for (a feedback-board idea), as the admin queue lists it. */
export interface FeatureRequest {
  id: number;
  title: string;
  body: string;
  status: string;
  upvotes: number;
  ai_severity: number | null;
  ai_summary: string | null;
  ai_affected_area: string | null;
  priority: number;
  admin_rank: number | null;
  source: string | null;
  created_at: string | null;
  author?: { id: number; name: string | null } | null;
}

export interface MyRating { rating: number; review: string; updated_at: string | null }
export interface AssistantRatingsReport {
  count: number;
  average: number | null;
  distribution: Record<string, number>;
  dismissed_without_rating: number;
  reviews: { user_id: number; account: string; staff_id: number | null; staff_name: string | null; rating: number; review: string; questions: number; updated_at: string | null }[];
}

export type HomeChoice = 'assistant' | 'classic';

/** One MikroTik on the home screen. `live` is what the router itself last reported, when it reports. */
export interface NetworkRouter {
  id: number;
  name: string;
  identity?: string | null;
  status: 'online' | 'offline' | 'unknown';
  last_online_at?: string | null;
  /** share of our checks that reached it */
  reachable_pct?: number | null;
  /** customers with paid time left on this router (null when the person may not see customers) */
  active_customers?: number | null;
  live?: null | {
    cpu?: number | null;
    memory_pct?: number | null;
    uptime?: string | null;
    version?: string | null;
    board?: string | null;
    down_bps?: number | null;
    up_bps?: number | null;
    hotspot_online?: number | null;
    pppoe_online?: number | null;
    age_seconds?: number | null;
  };
}

export interface AssistantRollout {
  percent: number;
  chose_assistant: number;
  chose_classic: number;
  /** the rollout moves paying accounts (an active subscription) only */
  paying_accounts?: number;
  paying_inside?: number;
}

/** Live figures for the home screen (GET /api/assistant/briefing). A section the
 *  person may not see, or that failed, is absent and named in `unavailable`. */
export interface Briefing {
  as_of: string;
  audience: 'reseller' | 'admin';
  name?: string | null;
  currency?: string | null;
  money?: {
    today: number; yesterday: number; last7: number; prev7: number; month: number; payments_today: number;
    daily: { day: string; revenue: number; payments: number; partial?: boolean }[];
  };
  customers?: {
    total: number; active: number; expiring_today: number; expiring_3d: number; expired_7d: number; new_7d: number;
    expiring: { id: number; name?: string | null; phone?: string | null; expiry: string; plan?: string | null }[];
  };
  routers?: {
    total: number; online: number; offline: number; unknown: number;
    down: { id: number; name: string; last_online_at?: string | null }[];
    /** each router, trouble first (the first dozen) */
    list?: NetworkRouter[];
  };
  plans?: { name: string; revenue: number; sales: number }[];
  attention?: null | {
    failed_payments_24h?: number | null;
    unmatched_payments?: number | null;
    sms_credits?: number | null;
    subscription?: { status: string; expires_at?: string | null; amount_due?: number | null } | null;
  };
  /** a count is null when this person may not see it */
  setup?: { routers: number | null; plans: number | null; payment_methods: number | null; customers: number | null } | null;
  unavailable: string[];
  /** the part of `unavailable` this person may not see (the rest failed to load) */
  not_allowed?: string[];
}

export interface OutgoingImage {
  media_type: string;
  data: string;        // base64, no data: prefix
  thumbnail: string;   // small data: URL for the screen
}

export class AssistantError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split(';').map((p) => p.trim()).find((p) => p.startsWith(`${name}=`));
  if (!match) return null;
  try { return decodeURIComponent(match.slice(name.length + 1)); } catch { return match.slice(name.length + 1); }
}

function token(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token') ?? readCookie('auth_token');
}

function headers(json = true): HeadersInit {
  const h: Record<string, string> = {};
  if (json) h['Content-Type'] = 'application/json';
  const t = token();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

async function errorFrom(response: Response): Promise<AssistantError> {
  let message = `Request failed (${response.status})`;
  let code: string | undefined;
  try {
    const body = await response.json();
    const detail = body?.detail;
    if (typeof detail === 'string') message = detail;
    else if (detail && typeof detail === 'object') {
      message = detail.message || message;
      code = detail.code;
    }
  } catch {
    /* not JSON */
  }
  return new AssistantError(message, response.status, code);
}

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE_URL}${path}`, { headers: headers(false) });
  if (!r.ok) throw await errorFrom(r);
  return r.json();
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers: headers(true), body: JSON.stringify(body) });
  if (!r.ok) throw await errorFrom(r);
  return r.json();
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API_BASE_URL}${path}`, { method: 'PATCH', headers: headers(true), body: JSON.stringify(body) });
  if (!r.ok) throw await errorFrom(r);
  return r.json();
}

async function putJson<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API_BASE_URL}${path}`, { method: 'PUT', headers: headers(true), body: JSON.stringify(body) });
  if (!r.ok) throw await errorFrom(r);
  return r.json();
}

/** Parse an SSE byte stream into events. Exported for tests. */
export function parseSseChunk(buffer: string): { events: AssistantEvent[]; rest: string } {
  const events: AssistantEvent[] = [];
  const parts = buffer.split(/\r?\n\r?\n/);
  const rest = parts.pop() ?? '';
  for (const part of parts) {
    const data = part
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''))
      .join('\n');
    if (!data) continue; // comment / ping
    try {
      events.push(JSON.parse(data) as AssistantEvent);
    } catch {
      /* ignore a malformed event */
    }
  }
  return { events, rest };
}

/**
 * The follow-up questions the assistant offers at the end of an answer: one last
 * line `NEXT: one | two | three`. Returns the answer without that line, and the
 * questions. While the answer is still arriving, a half-written line is hidden.
 */
export function splitNext(text: string): { text: string; next: string[] } {
  const at = text.search(/(^|\n)[ \t]*NEXT:/);
  if (at === -1) {
    // a marker still being typed ("NEX") should not flash on screen
    const partial = /\n[ \t]*N(E(X(T)?)?)?$/.exec(text);
    return { text: partial ? text.slice(0, partial.index) : text, next: [] };
  }
  const line = text.slice(at).replace(/^\s*NEXT:/, '');
  const next = line
    .split('\n')[0]
    .split('|')
    .map((q) => q.trim().replace(/^[-*\d.)\s]+/, ''))
    .filter((q) => q.length > 1 && q.length <= 120)
    .slice(0, 3);
  return { text: text.slice(0, at).trimEnd(), next };
}

async function stream(path: string, body: unknown, onEvent: (e: AssistantEvent) => void, signal?: AbortSignal) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { ...headers(true), Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) throw await errorFrom(response);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseChunk(buffer);
    buffer = rest;
    events.forEach(onEvent);
  }
  const { events } = parseSseChunk(buffer + '\n\n');
  events.forEach(onEvent);
}

export const assistantApi = {
  status: () => getJson<AssistantStatus>('/assistant/status'),
  briefing: () => getJson<Briefing>('/assistant/briefing'),
  /** The person's own start page: the assistant, the classic dashboard, or back to the default. */
  setHome: (choice: HomeChoice | 'default') => putJson<{ home: boolean; home_choice: HomeChoice | null }>('/assistant/home', { choice }),
  /** What people think of it: a 1-5 rating with a review, and pacing for the quiet ask. */
  myRating: () => getJson<{ rating: MyRating | null }>('/assistant/rating'),
  /** whether a started payment was paid (the path comes from the server, under /api) */
  paymentStatus: (poll: string) => getJson<PaymentStatus>(poll.replace(/^\/api(?=\/)/, '')),
  /** a record picker's search: the list's own filter, read with the person's own access (the server picks the list) */
  pickSearch: async (pick: PickSource, q: string): Promise<{ id: string; label: string }[]> => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(pick.query ?? {})) params.set(k, String(v));
    if (pick.search) params.set(pick.search, q);
    const data = await getJson<unknown>(`${pick.from.replace(/^\/api(?=\/)/, '')}?${params.toString()}`);
    const rows = Array.isArray(data) ? data
      : data && typeof data === 'object' ? (Object.values(data as Record<string, unknown>).find(Array.isArray) as unknown[] | undefined) ?? [] : [];
    return rows.flatMap((r) => (r && typeof r === 'object' && (r as { id?: unknown }).id !== undefined
      ? [{ id: String((r as { id: unknown }).id), label: pickLabel(r as Record<string, unknown>, pick.label) }] : [])).slice(0, 30);
  },
  rate: (rating: number, review: string, source: 'prompt' | 'menu') => postJson<{ rating: MyRating }>('/assistant/rating', { rating, review, source }),
  ratingShown: () => postJson<{ ok: boolean }>('/assistant/rating/shown', {}),
  ratingDismiss: () => postJson<{ ok: boolean }>('/assistant/rating/dismiss', {}),
  /** An improvement idea, onto the shared feedback board (votes, triage) rather than kept with the rating. */
  postIdea: (text: string, rating: number) => {
    const line = text.split(/\r?\n/)[0].trim();
    const title = `Assistant: ${line.length > 80 ? `${line.slice(0, 77)}...` : line}`;
    return postJson<{ id: number }>('/feedback/posts', { kind: 'idea', title, body: `${text}\n\n(From the assistant, rated ${rating}/5.)` });
  },
  adminFeatureRequests: (status?: string) => getJson<{ items: FeatureRequest[]; total: number }>(`/admin/feedback/queue?kind=idea&page_size=100${status ? `&status=${status}` : ''}`),
  adminSetFeatureOrder: (postIds: number[]) => putJson<{ ordered: number }>('/admin/feedback/order', { post_ids: postIds }),
  adminSetFeedbackStatus: (id: number, status: string) => patchJson<FeatureRequest>(`/admin/feedback/posts/${id}`, { status }),
  adminWorkPacket: (id: number) => getJson<{ post_id: number; markdown: string }>(`/admin/feedback/posts/${id}/work-packet`),
  adminRatings: (limit = 50) => getJson<AssistantRatingsReport>(`/admin/assistant/ratings?limit=${limit}`),
  adminRollout: () => getJson<AssistantRollout>('/admin/assistant/rollout'),
  adminSetRollout: (percent: number) => putJson<AssistantRollout>('/admin/assistant/rollout', { percent }),
  conversations: () => getJson<{ conversations: ConversationSummary[] }>('/assistant/conversations'),
  conversation: (id: string) => getJson<ConversationDetail>(`/assistant/conversations/${encodeURIComponent(id)}`),
  async remove(id: string): Promise<void> {
    const r = await fetch(`${API_BASE_URL}/assistant/conversations/${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: headers(false),
    });
    if (!r.ok) throw await errorFrom(r);
  },
  chat: (
    body: { message: string; conversation_id?: string | null; images?: OutgoingImage[] },
    onEvent: (e: AssistantEvent) => void,
    signal?: AbortSignal,
  ) => stream('/assistant/chat', body, onEvent, signal),
  decide: (
    conversationId: string,
    decisions: Decision[],
    onEvent: (e: AssistantEvent) => void,
  ) => stream(`/assistant/conversations/${encodeURIComponent(conversationId)}/decide`, { decisions }, onEvent),

  // Bitwave support view (platform admins)
  adminConversations: (resellerId?: number) =>
    getJson<{ conversations: ConversationSummary[] }>(
      `/admin/assistant/conversations${resellerId ? `?reseller_id=${resellerId}` : ''}`),
  adminUsage: (days = 30) => getJson<AssistantUsageReport>(`/admin/assistant/usage?days=${days}`),
  adminConversation: (id: string) => getJson<ConversationDetail>(`/admin/assistant/conversations/${encodeURIComponent(id)}`),
  async adminNote(id: string, text: string, notify = true) {
    const r = await fetch(`${API_BASE_URL}/admin/assistant/conversations/${encodeURIComponent(id)}/notes`, {
      method: 'POST', headers: headers(true), body: JSON.stringify({ text, notify }),
    });
    if (!r.ok) throw await errorFrom(r);
    return r.json();
  },
};

// ---------------------------------------------------------------------------
// Photos: shrink in the browser before upload (phones take 4-12 MB photos)
// ---------------------------------------------------------------------------

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This photo could not be opened.')); };
    img.src = url;
  });
}

function drawScaled(img: HTMLImageElement, maxSide: number, quality: number): string {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot prepare photos.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * A photo as JPEG: up to 1400 px (enough to read a terminal or a label; the
 * model works at ~1300 px anyway, and the photo is kept with the chat), plus a
 * 240 px thumbnail for the screen.
 */
export async function preparePhoto(file: File): Promise<OutgoingImage> {
  if (!file.type.startsWith('image/')) throw new Error('Only photos and screenshots can be attached.');
  const img = await loadImage(file);
  let dataUrl = drawScaled(img, 1400, 0.82);
  if (dataUrl.length > 2_000_000) dataUrl = drawScaled(img, 1100, 0.72);
  const thumbnail = drawScaled(img, 240, 0.7);
  return { media_type: 'image/jpeg', data: dataUrl.split(',', 2)[1], thumbnail };
}

/**
 * Where a new or unfinished account goes to get set up: the chat when the
 * assistant is switched on, else the step-by-step /setup wizard. Never waits
 * more than ~2.5 s, so sign-in is not held up by a slow status check.
 */
// ---------------------------------------------------------------------------
// Start page: the assistant for the accounts that have it, else the dashboard
// ---------------------------------------------------------------------------

const HOME_CHECKED = 'bw_home_checked';
const homeKey = (who: string) => `bw_ai_home:${who}`;

/** Remember, on this device, whether the assistant is this person's start page. */
export function rememberHome(who: string, home: boolean): void {
  try { localStorage.setItem(homeKey(who), home ? '1' : '0'); } catch { /* private mode */ }
}

/** What this device last knew: true, false, or null when it never asked. */
export function rememberedHome(who: string): boolean | null {
  try {
    const v = localStorage.getItem(homeKey(who));
    return v === '1' ? true : v === '0' ? false : null;
  } catch {
    return null;
  }
}

/**
 * The start page is decided once per browser session. After that the person goes
 * where they tap: opening the classic dashboard from the assistant must not bounce
 * them straight back.
 */
export function startPageDecided(): boolean {
  try { return sessionStorage.getItem(HOME_CHECKED) === '1'; } catch { return true; }
}
export function markStartPageDecided(): void {
  try { sessionStorage.setItem(HOME_CHECKED, '1'); } catch { /* private mode */ }
}

/**
 * Where a person lands after signing in: the assistant when it is their start
 * page (their own choice or the rollout share), else `fallback`. Like
 * onboardingPath, it never holds sign-in up for more than ~2.5 s.
 */
export async function homePath(fallback: string, who?: string): Promise<string> {
  try {
    const status = await Promise.race([
      assistantApi.status(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
    if (status && who) rememberHome(who, !!(status.enabled && status.home));
    return status && status.enabled && status.home ? '/assistant' : fallback;
  } catch {
    return fallback;
  }
}

export async function onboardingPath(): Promise<string> {
  try {
    const status = await Promise.race([
      assistantApi.status(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
    return status && status.enabled && !status.read_only ? '/assistant?start=setup' : '/setup';
  } catch {
    return '/setup';
  }
}
