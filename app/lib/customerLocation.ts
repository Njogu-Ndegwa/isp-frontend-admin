// Customer install location (latitude / longitude). Optional, both or neither.
// Kept free of React so the rules can be unit tested.
//
// Three ways in, all on the register and edit forms:
// - "Use my current location" (browser GPS, for an installer on site);
// - typing the two numbers;
// - pasting a Google Maps link or a "lat, lng" pair.
//
// The backend (app/services/customer_profile.py clean_location) applies the
// same rules; these only give the reseller the error before the round trip.

import type { Customer } from './types';

export interface LocationForm {
  latitude: string;
  longitude: string;
}

export const EMPTY_LOCATION: LocationForm = { latitude: '', longitude: '' };

export interface LatLng {
  lat: number;
  lng: number;
}

/** Same precision the backend stores (~11 cm). */
export const LOCATION_DECIMALS = 6;

function round(value: number): number {
  const f = 10 ** LOCATION_DECIMALS;
  return Math.round(value * f) / f;
}

/** English error text (translated by the caller), or null when valid. */
export function locationError(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'Latitude and longitude must be numbers';
  if (lat < -90 || lat > 90) return 'Latitude must be between -90 and 90';
  if (lng < -180 || lng > 180) return 'Longitude must be between -180 and 180';
  if (lat === 0 && lng === 0) return '0, 0 is not a real location. Capture the location again';
  return null;
}

function toNumber(text: string): number {
  const cleaned = text.trim().replace(/\s+/g, '');
  // Only plain decimals: "1e3", "0x10" or "" must not slip through as numbers.
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}

export type LocationFormState =
  | { kind: 'empty' }
  | { kind: 'valid'; value: LatLng }
  | { kind: 'invalid'; error: string };

/** What the two inputs currently hold. */
export function readLocationForm(form: LocationForm): LocationFormState {
  const latText = form.latitude.trim();
  const lngText = form.longitude.trim();
  if (!latText && !lngText) return { kind: 'empty' };
  if (!latText || !lngText) return { kind: 'invalid', error: 'Enter both latitude and longitude, or leave both empty' };
  const lat = toNumber(latText);
  const lng = toNumber(lngText);
  const error = locationError(lat, lng);
  if (error) return { kind: 'invalid', error };
  return { kind: 'valid', value: { lat: round(lat), lng: round(lng) } };
}

const PAIR = String.raw`([+-]?\d{1,3}(?:\.\d+)?)\s*[, ]\s*([+-]?\d{1,3}(?:\.\d+)?)`;

export type ParseResult =
  | { ok: true; value: LatLng }
  | { ok: false; error: string };

/**
 * Coordinates from a pasted Google Maps link or a plain "lat, lng" pair.
 *
 * Understands the forms Google Maps hands out: `.../@-1.2195,36.8869,17z`,
 * `?q=-1.2195,36.8869`, `query=`, `ll=`, `destination=`, `/place/-1.2,36.8`,
 * `/search/-1.2,+36.8` and the `!3d-1.2195!4d36.8869` pin in a place link (the
 * pin wins over the map centre). Short links (maps.app.goo.gl) only redirect,
 * so they cannot be read here.
 */
export function parseLocationText(raw: string): ParseResult {
  let text = raw.trim();
  if (!text) return { ok: false, error: 'Paste a Google Maps link or coordinates like -1.2195, 36.8869' };
  try {
    text = decodeURIComponent(text.replace(/\+/g, ' '));
  } catch {
    // Not URI-encoded: read it as it is.
  }
  if (/(maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(text)) {
    return {
      ok: false,
      error: 'Short links cannot be read. Open the link, then copy the full link from the address bar, or the coordinates',
    };
  }
  const patterns = [
    /!3d([+-]?\d{1,3}(?:\.\d+)?)!4d([+-]?\d{1,3}(?:\.\d+)?)/,
    new RegExp(String.raw`[?&](?:q|query|ll|destination|daddr|center)=(?:loc:)?\s*${PAIR}`, 'i'),
    new RegExp(String.raw`/(?:place|search|dir)/(?:[^/]*/)?\s*${PAIR}`, 'i'),
    new RegExp(String.raw`@${PAIR}`),
    new RegExp(String.raw`^${PAIR}$`),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    const error = locationError(lat, lng);
    if (error) return { ok: false, error };
    return { ok: true, value: { lat: round(lat), lng: round(lng) } };
  }
  return { ok: false, error: 'Could not find coordinates in that. Paste a Google Maps link or coordinates like -1.2195, 36.8869' };
}

export function formFromLatLng(value: LatLng): LocationForm {
  return { latitude: String(value.lat), longitude: String(value.lng) };
}

export function locationFromCustomer(customer: Partial<Customer> | null | undefined): LocationForm {
  if (customer?.latitude == null || customer?.longitude == null) return { ...EMPTY_LOCATION };
  return formFromLatLng({ lat: customer.latitude, lng: customer.longitude });
}

export function googleMapsUrl(value: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${value.lat},${value.lng}`;
}

export interface LocationPayload {
  latitude?: number;
  longitude?: number;
  clear_location?: boolean;
}

/** Register payload: the pair when one was entered. Throws the error text when invalid. */
export function locationForRegister(form: LocationForm): LocationPayload {
  const state = readLocationForm(form);
  if (state.kind === 'invalid') throw new Error(state.error);
  if (state.kind === 'empty') return {};
  return { latitude: state.value.lat, longitude: state.value.lng };
}

/**
 * Edit payload: nothing when unchanged, the new pair when changed, and
 * `clear_location` when both boxes were emptied. Throws the error text when
 * invalid.
 */
export function locationChanges(form: LocationForm, original: LocationForm): LocationPayload {
  const next = readLocationForm(form);
  if (next.kind === 'invalid') throw new Error(next.error);
  const prev = readLocationForm(original);
  if (next.kind === 'empty') return prev.kind === 'empty' ? {} : { clear_location: true };
  if (prev.kind === 'valid' && prev.value.lat === next.value.lat && prev.value.lng === next.value.lng) return {};
  return { latitude: next.value.lat, longitude: next.value.lng };
}

/** Plain-English reason a GPS read failed (translated by the caller). */
export function geolocationErrorText(code: number | null): string {
  switch (code) {
    case 1:
      return 'Location permission was denied. Allow location for this site in the browser, or enter the coordinates';
    case 2:
      return 'Could not get a GPS fix. Move near a window or outside and try again';
    case 3:
      return 'Getting the location took too long. Try again';
    default:
      return 'This browser cannot share its location. Enter the coordinates or paste a Google Maps link';
  }
}
