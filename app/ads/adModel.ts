/**
 * Pure helpers for the ads screens: status chips, the form <-> API mapping,
 * validation and upload limits. Contract: isp-billing ADS_API.md.
 */
import type {
  Ad,
  AdImageFit,
  AdInput,
  AdMediaType,
  AdPlacement,
  AdSlot,
} from '../lib/types';
import { gmt3DateOnlyToISO, parseUTCToGMT3, utcToGMT3DateOnly } from '../lib/dateUtils';

// ─── Status ──────────────────────────────────────────────────────────

export type AdDisplayStatus = 'pending' | 'rejected' | 'paused' | 'scheduled' | 'ended' | 'live';

export const STATUS_META: Record<AdDisplayStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info' }> = {
  pending: { label: 'Pending review', variant: 'warning' },
  rejected: { label: 'Rejected', variant: 'danger' },
  paused: { label: 'Paused', variant: 'neutral' },
  scheduled: { label: 'Scheduled', variant: 'info' },
  ended: { label: 'Ended', variant: 'neutral' },
  live: { label: 'Live', variant: 'success' },
};

/** Backend datetimes are naive UTC; read them as UTC instants. */
export function parseNaiveUtc(value: string | null | undefined): number | null {
  if (!value) return null;
  const hasZone = /[zZ]$|[+-]\d\d:?\d\d$/.test(value);
  const t = Date.parse(hasZone ? value : `${value}Z`);
  return Number.isNaN(t) ? null : t;
}

/** What the customer-facing state of an ad is right now. Review comes first:
 *  a pending or rejected ad never shows, whatever its dates say. */
export function adDisplayStatus(ad: Pick<Ad, 'status' | 'is_active' | 'starts_at' | 'expires_at'>, now = Date.now()): AdDisplayStatus {
  if (ad.status === 'pending') return 'pending';
  if (ad.status === 'rejected') return 'rejected';
  if (!ad.is_active) return 'paused';
  const ends = parseNaiveUtc(ad.expires_at);
  if (ends !== null && ends <= now) return 'ended';
  const starts = parseNaiveUtc(ad.starts_at);
  if (starts !== null && starts > now) return 'scheduled';
  return 'live';
}

// ─── Labels ──────────────────────────────────────────────────────────

export const PLACEMENT_LABEL: Record<AdPlacement, string> = {
  hero: 'Top of portal',
  local: 'Shops row',
};

/** Where views and taps are counted (GET /api/ads/{id}/stats by_placement). */
export const EVENT_PLACEMENTS: { key: string; label: string; hint: string }[] = [
  { key: 'hero', label: 'Top of portal', hint: 'The photo at the top of the login page' },
  { key: 'wait_screen', label: 'M-Pesa wait screen', hint: 'While the customer enters their PIN' },
  { key: 'success_page', label: "“You're online” page", hint: 'Right after payment' },
  { key: 'local', label: 'Shops row', hint: 'The shops row after payment' },
];

export function slotLabel(slot: AdSlot): string {
  if (slot === 'house') return 'Own promo';
  if (slot === 'reseller') return 'Sold ad';
  return 'Bitwave';
}

/** The tag the portal prints on the ad. */
export function portalTag(slot: AdSlot): string {
  return slot === 'house' ? 'Promo' : 'Ad';
}

export function formatCount(n: number | null | undefined): string {
  const v = Number(n) || 0;
  if (v >= 10_000) return `${(v / 1000).toFixed(v >= 100_000 ? 0 : 1)}k`;
  return v.toLocaleString('en-US');
}

/** Taps per view, as a percentage string, or "–" when there are no views. */
export function tapRate(clicks: number, views: number): string {
  if (!views) return '–';
  const pct = (100 * clicks) / views;
  return `${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`;
}

// ─── Media ───────────────────────────────────────────────────────────

export const MB = 1024 * 1024;
export const IMAGE_TYPES = ['image/webp', 'image/jpeg', 'image/png'];
export const VIDEO_TYPES = ['video/mp4'];
export const IMAGE_MAX_BYTES = 2 * MB;
export const VIDEO_MAX_BYTES = 12 * MB;
export const VIDEO_MAX_SECONDS = 15;

export type MediaKind = 'image' | 'video';

/** Mirrors the backend's checks, so the reseller hears about it before uploading. */
export function checkMediaFile(file: { type: string; size: number }, kind: MediaKind): string | null {
  const types = kind === 'image' ? IMAGE_TYPES : VIDEO_TYPES;
  const max = kind === 'image' ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
  if (!types.includes(file.type)) {
    return kind === 'image' ? 'Use a JPG, PNG or WebP photo.' : 'Use an MP4 video.';
  }
  if (file.size <= 0) return 'That file is empty.';
  if (file.size > max) {
    return `That file is ${(file.size / MB).toFixed(1)} MB. The limit is ${max / MB} MB.`;
  }
  return null;
}

export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value.trim()).protocol === 'https:';
  } catch {
    return false;
  }
}

// ─── Form ────────────────────────────────────────────────────────────

export interface AdFormState {
  placement: AdPlacement;
  slot: AdSlot;
  advertiser_id: number | null;
  title: string;
  price: string;
  seller_name: string;
  phone_number: string;
  whatsapp_number: string;
  seller_location: string;
  description: string;
  media_type: AdMediaType;
  image_url: string;
  video_url: string;
  poster_url: string;
  image_fit: AdImageFit;
  bg_color: string;
  router_ids: number[] | null;
  /** YYYY-MM-DD in Kenya time, or ''. */
  start_date: string;
  /** Last day the ad runs, YYYY-MM-DD in Kenya time, or ''. */
  last_day: string;
}

export const DEFAULT_BG = '#14532D';

export function emptyAdForm(isAdmin: boolean, sellerName = ''): AdFormState {
  return {
    placement: 'hero',
    slot: isAdmin ? 'platform' : 'house',
    advertiser_id: null,
    title: '',
    price: '',
    seller_name: isAdmin ? '' : sellerName,
    phone_number: '',
    whatsapp_number: '',
    seller_location: '',
    description: '',
    media_type: 'image',
    image_url: '',
    video_url: '',
    poster_url: '',
    image_fit: 'cover',
    bg_color: DEFAULT_BG,
    router_ids: null,
    start_date: '',
    last_day: '',
  };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The ad stops at midnight after its last day (Kenya time). */
export function lastDayToExpiresISO(lastDay: string): string | null {
  return lastDay ? gmt3DateOnlyToISO(addDays(lastDay, 1)) : null;
}

export function expiresToLastDay(expiresAt: string | null | undefined): string {
  if (!expiresAt) return '';
  const end = parseUTCToGMT3(expiresAt);
  if (Number.isNaN(end.getTime())) return '';
  const last = new Date(end.getTime() - 1);
  return last.toISOString().slice(0, 10);
}

export function adToForm(ad: Ad): AdFormState {
  return {
    placement: ad.placement,
    slot: ad.slot,
    advertiser_id: ad.advertiser_id ?? null,
    title: ad.title ?? '',
    price: ad.price ?? '',
    seller_name: ad.seller_name ?? '',
    phone_number: ad.phone_number ?? '',
    whatsapp_number: ad.whatsapp_number ?? '',
    seller_location: ad.seller_location ?? '',
    description: ad.description ?? '',
    media_type: ad.media_type,
    image_url: ad.image_url ?? '',
    video_url: ad.video_url ?? '',
    poster_url: ad.poster_url ?? '',
    image_fit: ad.image_fit ?? 'cover',
    bg_color: ad.bg_color ?? DEFAULT_BG,
    router_ids: ad.router_ids && ad.router_ids.length ? [...ad.router_ids] : null,
    start_date: utcToGMT3DateOnly(ad.starts_at),
    last_day: expiresToLastDay(ad.expires_at),
  };
}

const orNull = (v: string) => (v.trim() ? v.trim() : null);

/** The full create body for this form. `platform` = a Bitwave-owned ad: its
 *  slot is always "platform" and it may name an advertiser. (An admin editing
 *  a reseller's ad keeps the reseller's slot.) */
export function formToInput(form: AdFormState, platform: boolean): AdInput {
  const video = form.media_type === 'video';
  const input: AdInput = {
    placement: form.placement,
    slot: platform ? 'platform' : form.slot,
    title: form.title.trim(),
    price: orNull(form.price),
    seller_name: form.seller_name.trim(),
    phone_number: form.phone_number.trim(),
    whatsapp_number: orNull(form.whatsapp_number),
    seller_location: orNull(form.seller_location),
    description: orNull(form.description),
    media_type: form.media_type,
    image_url: video ? null : orNull(form.image_url),
    video_url: video ? orNull(form.video_url) : null,
    poster_url: video ? orNull(form.poster_url) : null,
    image_fit: form.image_fit,
    bg_color: orNull(form.bg_color),
    router_ids: form.router_ids && form.router_ids.length ? [...form.router_ids].sort((a, b) => a - b) : null,
    starts_at: form.start_date ? gmt3DateOnlyToISO(form.start_date) : null,
    expires_at: lastDayToExpiresISO(form.last_day),
  };
  if (platform) input.advertiser_id = form.advertiser_id;
  return input;
}

/** Only the fields that differ from the saved ad. The backend sends a
 *  reseller's ad back to review whenever a content field is present at all,
 *  so unchanged fields must stay out of the PUT. */
export function diffInput(original: AdInput, next: AdInput): AdInput {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(next) as (keyof AdInput)[]) {
    if (JSON.stringify(original[key] ?? null) !== JSON.stringify(next[key] ?? null)) {
      out[key] = next[key];
    }
  }
  return out as AdInput;
}

/** Fields the backend re-reviews when a reseller changes them (ads_routes._REVIEWED_FIELDS). */
export const REVIEWED_FIELDS: (keyof AdInput)[] = [
  'title', 'description', 'image_url', 'seller_name', 'seller_location',
  'phone_number', 'whatsapp_number', 'price', 'media_type', 'video_url', 'poster_url',
];

export function changesNeedReview(diff: AdInput): boolean {
  return REVIEWED_FIELDS.some((f) => f in diff);
}

export const PHONE_RE = /^\+?[0-9 ]{9,16}$/;
export const COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export type AdFormErrors = Partial<Record<keyof AdFormState, string>>;

export function validateAdForm(form: AdFormState): AdFormErrors {
  const e: AdFormErrors = {};
  if (!form.title.trim()) e.title = 'Add a headline.';
  if (!form.seller_name.trim()) e.seller_name = 'Add the business name.';
  const phone = form.phone_number.trim();
  if (!phone) e.phone_number = 'Add a phone number. It is what the Call button dials.';
  else if (!PHONE_RE.test(phone)) e.phone_number = 'Use digits only, e.g. 0712 345 678.';
  const wa = form.whatsapp_number.trim();
  if (wa && !PHONE_RE.test(wa)) e.whatsapp_number = 'Use digits only, e.g. 0712 345 678.';
  if (form.media_type === 'image' && !form.image_url.trim()) e.image_url = 'Add a photo.';
  if (form.media_type === 'video' && !form.video_url.trim()) e.video_url = 'Add a video.';
  if (form.bg_color && !COLOR_RE.test(form.bg_color)) e.bg_color = 'Use a colour like #14532D.';
  if (form.router_ids !== null && form.router_ids.length === 0) {
    e.router_ids = 'Pick at least one router, or choose “All my routers”.';
  }
  if (form.start_date && form.last_day && form.last_day < form.start_date) {
    e.last_day = 'The last day must be on or after the start date.';
  }
  return e;
}

/** "2026-11-01" -> "1 Nov 2026". */
export function formatDay(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return '–';
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}
