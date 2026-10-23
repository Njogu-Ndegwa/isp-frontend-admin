import { describe, it, expect } from 'vitest';
import {
  adDisplayStatus,
  adToForm,
  changesNeedReview,
  checkMediaFile,
  diffInput,
  emptyAdForm,
  expiresToLastDay,
  formToInput,
  isHttpsUrl,
  lastDayToExpiresISO,
  validateAdForm,
} from './adModel';
import type { Ad } from '../lib/types';

const NOW = Date.parse('2026-10-23T09:00:00Z');

const base: Ad = {
  id: 1, advertiser_id: null, title: 'Red onions', description: null,
  seller_name: 'Wanjiku Greens', seller_location: 'By the stage',
  phone_number: '0712000111', whatsapp_number: null, price: 'KSH 120 / kg', price_value: null,
  category: null, badge_type: null, badge_text: null, placement: 'hero', media_type: 'image',
  image_url: 'https://media.example/a.webp', video_url: null, poster_url: null,
  image_fit: 'cover', bg_color: '#14532D', slot: 'house', owner_user_id: 7, router_ids: [51, 50],
  status: 'approved', review_note: null, reviewed_at: null, is_active: true, priority: 0,
  starts_at: null, expires_at: '2026-11-01T21:00:00', created_at: '2026-10-20T09:00:00',
  views_count: 10, clicks_count: 1,
};

describe('adDisplayStatus', () => {
  it('puts review before everything else', () => {
    expect(adDisplayStatus({ ...base, status: 'pending', is_active: false }, NOW)).toBe('pending');
    expect(adDisplayStatus({ ...base, status: 'rejected' }, NOW)).toBe('rejected');
  });
  it('reads paused, scheduled, ended and live', () => {
    expect(adDisplayStatus({ ...base, is_active: false }, NOW)).toBe('paused');
    expect(adDisplayStatus({ ...base, starts_at: '2026-10-24T00:00:00' }, NOW)).toBe('scheduled');
    expect(adDisplayStatus({ ...base, expires_at: '2026-10-23T08:59:00' }, NOW)).toBe('ended');
    expect(adDisplayStatus(base, NOW)).toBe('live');
  });
  it('treats naive datetimes as UTC', () => {
    // 09:30 naive = 09:30 UTC, still in the future at 09:00 UTC.
    expect(adDisplayStatus({ ...base, starts_at: '2026-10-23T09:30:00' }, NOW)).toBe('scheduled');
  });
});

describe('last day <-> expires_at', () => {
  it('ends at Kenya midnight after the last day', () => {
    expect(lastDayToExpiresISO('2026-11-01')).toBe('2026-11-01T21:00:00.000Z');
    expect(expiresToLastDay('2026-11-01T21:00:00')).toBe('2026-11-01');
    expect(lastDayToExpiresISO('')).toBeNull();
    expect(expiresToLastDay(null)).toBe('');
  });
});

describe('formToInput / diffInput', () => {
  it('round-trips a saved ad with no changes', () => {
    const original = formToInput(adToForm(base), false);
    const again = formToInput(adToForm(base), false);
    expect(diffInput(original, again)).toEqual({});
  });
  it('sends only what changed, and flags content edits for review', () => {
    const original = formToInput(adToForm(base), false);
    const paused = diffInput(original, formToInput({ ...adToForm(base), router_ids: [50] }, false));
    expect(paused).toEqual({ router_ids: [50] });
    expect(changesNeedReview(paused)).toBe(false);

    const edited = diffInput(original, formToInput({ ...adToForm(base), phone_number: '0712 999 000' }, false));
    expect(edited).toEqual({ phone_number: '0712 999 000' });
    expect(changesNeedReview(edited)).toBe(true);
  });
  it('clears the other media fields when switching to video', () => {
    const form = { ...adToForm(base), media_type: 'video' as const, video_url: 'https://m/v.mp4', poster_url: 'https://m/p.webp' };
    const input = formToInput(form, false);
    expect(input.image_url).toBeNull();
    expect(input.video_url).toBe('https://m/v.mp4');
  });
  it('forces the platform slot for admins and sends advertiser_id', () => {
    const input = formToInput({ ...emptyAdForm(true), advertiser_id: 3 }, true);
    expect(input.slot).toBe('platform');
    expect(input.advertiser_id).toBe(3);
    expect('advertiser_id' in formToInput(emptyAdForm(false), false)).toBe(false);
  });
});

describe('validateAdForm', () => {
  it('requires a phone number the backend will accept', () => {
    const form = { ...emptyAdForm(false, 'Shop'), title: 'Hi', image_url: 'https://x/y.jpg' };
    expect(validateAdForm(form).phone_number).toBeTruthy();
    expect(validateAdForm({ ...form, phone_number: '07-12' }).phone_number).toBeTruthy();
    expect(validateAdForm({ ...form, phone_number: '+254 712 345 678' })).toEqual({});
  });
  it('blocks an empty router pick and backwards dates', () => {
    const form = { ...emptyAdForm(false, 'Shop'), title: 'Hi', phone_number: '0712345678', image_url: 'https://x/y.jpg' };
    expect(validateAdForm({ ...form, router_ids: [] }).router_ids).toBeTruthy();
    expect(validateAdForm({ ...form, start_date: '2026-11-02', last_day: '2026-11-01' }).last_day).toBeTruthy();
  });
});

describe('media checks', () => {
  it('mirrors the upload limits', () => {
    expect(checkMediaFile({ type: 'image/png', size: 1000 }, 'image')).toBeNull();
    expect(checkMediaFile({ type: 'image/gif', size: 1000 }, 'image')).toMatch(/JPG/);
    expect(checkMediaFile({ type: 'image/png', size: 3 * 1024 * 1024 }, 'image')).toMatch(/2 MB/);
    expect(checkMediaFile({ type: 'video/mp4', size: 13 * 1024 * 1024 }, 'video')).toMatch(/12 MB/);
  });
  it('accepts only https links', () => {
    expect(isHttpsUrl('https://cdn.example/a.jpg')).toBe(true);
    expect(isHttpsUrl('http://cdn.example/a.jpg')).toBe(false);
    expect(isHttpsUrl('nope')).toBe(false);
  });
});
