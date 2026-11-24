/*
 * The live hotspot-login preview frames the real captive portal (isp-frontend
 * index.html) in its preview mode instead of imitating it: the portal renders
 * whatever portal data the dashboard posts, with its own HTML, CSS and script,
 * so the preview cannot drift from what customers get.
 *
 * Protocol (isp-frontend index.html, "Preview mode"):
 *   portal    -> dashboard  { type: 'bw-portal-preview:ready' }
 *   dashboard -> portal     { type: 'bw-portal-preview:data', data: PublicPortalResponse }
 *   portal    -> dashboard  { type: 'bw-portal-preview:rendered' }
 * In preview mode the portal has no network (no payment, no ad impression, no
 * router call) and no real storage.
 */
import type { PublicPortalResponse } from './types';

/** Where the captive portal is served (the same build customers get). */
export const PORTAL_URL = (process.env.NEXT_PUBLIC_PORTAL_URL || 'https://isp-frontend-two.vercel.app').replace(/\/+$/, '');

export function portalOrigin(url = PORTAL_URL): string {
  try { return new URL(url).origin; } catch { return url; }
}

export const PORTAL_PREVIEW_SRC = `${PORTAL_URL}/?preview=1`;

/**
 * The phone the preview stands for. 360 CSS px is the width of the budget
 * Android phones most customers use; 760 px tall is what such a phone shows
 * of a page under the browser bars.
 */
export const PHONE_WIDTH = 360;
export const PHONE_HEIGHT = 760;

/**
 * The screen the portal is laid out on. Viewed on a phone, it is that phone's
 * own screen, so the reseller sees the page exactly as it lays out on a phone
 * like theirs (only scaled to the card); elsewhere the typical customer phone.
 */
export function phoneSize(viewWidth: number, viewHeight: number): { width: number; height: number } {
  if (!(viewWidth > 0 && viewWidth < 500 && viewHeight > 0)) return { width: PHONE_WIDTH, height: PHONE_HEIGHT };
  const clamp = (v: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, v)));
  return { width: clamp(viewWidth, 320, 430), height: clamp(viewHeight, 560, 960) };
}

/** Uniform scale that fits the phone into `boxWidth`, never larger than real size. */
export function previewScale(boxWidth: number, phoneWidth = PHONE_WIDTH): number {
  if (!Number.isFinite(boxWidth) || boxWidth <= 0) return 1;
  return Math.min(1, boxWidth / phoneWidth);
}

export type PreviewMessageType = 'ready' | 'rendered';

/** The portal's message type, or null for anything else. */
export function previewMessageType(data: unknown): PreviewMessageType | null {
  const type = (data as { type?: unknown } | null)?.type;
  if (type === 'bw-portal-preview:ready') return 'ready';
  if (type === 'bw-portal-preview:rendered') return 'rendered';
  return null;
}

/**
 * The router's real portal response with the settings being edited laid over
 * its saved ones. Blank values (null, undefined, '') keep the saved value, as
 * the backend fills those in the same way for customers.
 */
export function portalPreviewData(
  base: PublicPortalResponse,
  settings: Record<string, unknown>,
): PublicPortalResponse {
  const merged: Record<string, unknown> = { ...(base.portal_settings ?? {}) };
  for (const [k, v] of Object.entries(settings)) {
    if (v === undefined || v === null || v === '') continue;
    merged[k] = v;
  }
  return { ...base, portal_settings: merged as PublicPortalResponse['portal_settings'] };
}
