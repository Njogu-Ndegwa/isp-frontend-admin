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
  | { type: 'data'; call_id: string; title: string; method: string; path: string; query?: Record<string, unknown> | null; show: 'table' | 'card' | 'none' | 'auto'; payload: unknown }
  | { type: 'action'; action_id: string; title: string; summary: string; method: string; path: string; query?: Record<string, unknown> | null; body?: unknown; permission?: string | null; sensitive?: boolean; expires_at?: string; status: ActionStatus }
  | { type: 'action_result'; action_id: string; status: ActionStatus; ok: boolean; http_status?: number; detail?: string; payload?: unknown }
  | { type: 'notice'; level: 'info' | 'error'; message: string }
  | { type: 'done'; conversation_id: string; usage?: { input_tokens: number; output_tokens: number } };

export type ActionStatus = 'pending' | 'running' | 'done' | 'failed' | 'declined' | 'expired';

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
    decisions: { action_id: string; approve: boolean }[],
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
