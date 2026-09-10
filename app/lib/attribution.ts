/**
 * First-touch acquisition attribution.
 *
 * Records where a visitor originally came from and keeps it until they sign up,
 * so a signup can be traced back to the campaign that created it. GA4 alone
 * reports channel-level sessions and cannot answer "which customer came from
 * TikTok?" — that needs the source travelling with the person.
 *
 * First touch, not last: someone who arrives from a TikTok ad, leaves, and
 * returns a week later via Google would otherwise credit Google, and the
 * campaign that actually created the customer looks worthless.
 *
 * Storage is best-effort. Private windows, cleared site data and blocked
 * cookies are all normal, so every read and write is guarded and callers must
 * cope with `null`.
 */

const STORAGE_KEY = 'bw_attrib_v1';
const COOKIE_NAME = 'bw_attrib';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

/** Ad-platform click ids. These are what let us upload offline conversions later. */
const CLICK_ID_PARAMS = ['gclid', 'gbraid', 'wbraid', 'ttclid', 'fbclid', 'msclkid'] as const;

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

export interface Touch {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  ttclid?: string;
  fbclid?: string;
  msclkid?: string;
  /** Document referrer host, or 'direct' when there is none. */
  referrer?: string;
  /** Path the visitor first landed on. */
  landing_path?: string;
  /** ISO 8601. */
  seen_at?: string;
}

export interface Attribution {
  first: Touch;
  last: Touch;
}

function readParams(search: string, referrer: string, path: string): Touch {
  const params = new URLSearchParams(search);
  const touch: Touch = {};

  for (const key of UTM_PARAMS) {
    const value = params.get(key);
    if (value) touch[key] = value.slice(0, 200);
  }
  for (const key of CLICK_ID_PARAMS) {
    const value = params.get(key);
    if (value) touch[key] = value.slice(0, 400);
  }

  if (referrer) {
    try {
      touch.referrer = new URL(referrer).host;
    } catch {
      // Malformed referrer: keep the raw value rather than losing the signal.
      touch.referrer = referrer.slice(0, 200);
    }
  } else {
    touch.referrer = 'direct';
  }

  touch.landing_path = path.slice(0, 200);
  touch.seen_at = new Date().toISOString();
  return touch;
}

/** A touch is only worth recording if it names a campaign or an external referrer. */
function isMeaningful(touch: Touch): boolean {
  if (touch.utm_source || touch.utm_medium || touch.utm_campaign) return true;
  if (CLICK_ID_PARAMS.some((key) => touch[key])) return true;
  return Boolean(touch.referrer && touch.referrer !== 'direct' && !isOwnHost(touch.referrer));
}

function isOwnHost(host: string): boolean {
  if (typeof window === 'undefined') return false;
  return host === window.location.host;
}

function read(): Attribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Attribution;
    if (parsed && typeof parsed === 'object' && parsed.first) return parsed;
    return null;
  } catch {
    return null;
  }
}

function write(value: Attribution): void {
  if (typeof window === 'undefined') return;
  const serialised = JSON.stringify(value);
  try {
    window.localStorage.setItem(STORAGE_KEY, serialised);
  } catch {
    // Storage unavailable or full — the cookie below is the fallback.
  }
  try {
    // Mirrored to a cookie so the value can reach the server later without a
    // second round trip. Lax keeps it present on the ad click's own navigation.
    document.cookie =
      `${COOKIE_NAME}=${encodeURIComponent(serialised)};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
  } catch {
    // Cookies blocked. localStorage above may still have it.
  }
}

/**
 * Record this page view's origin. Safe to call on every navigation — the first
 * touch is written once and never overwritten; the last touch updates whenever
 * the visitor arrives from somewhere new.
 */
export function captureAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null;

  const touch = readParams(
    window.location.search,
    document.referrer,
    window.location.pathname,
  );
  const existing = read();

  if (!existing) {
    // Record the very first landing even when it carries no campaign, so we can
    // tell "arrived directly" apart from "we never saw them arrive".
    const seed: Attribution = { first: touch, last: touch };
    write(seed);
    return seed;
  }

  if (!isMeaningful(touch)) return existing;

  const next: Attribution = {
    first: isMeaningful(existing.first) ? existing.first : touch,
    last: touch,
  };
  write(next);
  return next;
}

/** Read the stored attribution without recording a new touch. */
export function getAttribution(): Attribution | null {
  return read();
}

/**
 * Flatten the first touch into the snake_case keys the signup payload and the
 * analytics event both use. Returns `{}` when nothing was ever recorded.
 */
export function getAttributionFields(): Record<string, string> {
  const stored = read();
  if (!stored) return {};

  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(stored.first)) {
    if (value) fields[key] = value;
  }
  // Keep the most recent campaign too — the difference between first and last
  // is what tells you whether a channel assists rather than closes.
  if (stored.last?.utm_source && stored.last.utm_source !== stored.first?.utm_source) {
    fields.last_utm_source = stored.last.utm_source;
  }
  return fields;
}
