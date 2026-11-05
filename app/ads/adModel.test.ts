import { describe, it, expect } from 'vitest';
import {
  adCardNote,
  adDisplayStatus,
  adToForm,
  checkMediaFile,
  diffInput,
  emptyAdForm,
  expiresToLastDay,
  formToInput,
  isHttpsUrl,
  lastDayToExpiresISO,
  pauseBlockedReason,
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
  image_fit: 'cover', bg_color: '#14532D', slot: 'house', owner_user_id: 7, owner_name: 'Acme WiFi', router_ids: [51, 50],
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
  it('sends only what changed', () => {
    const original = formToInput(adToForm(base), false);
    const paused = diffInput(original, formToInput({ ...adToForm(base), router_ids: [50] }, false));
    expect(paused).toEqual({ router_ids: [50] });

    const edited = diffInput(original, formToInput({ ...adToForm(base), phone_number: '0712 999 000' }, false));
    expect(edited).toEqual({ phone_number: '0712 999 000' });
  });
  it('clears the other media fields when switching to video', () => {
    const form = { ...adToForm(base), media_type: 'video' as const, video_url: 'https://m/v.mp4', poster_url: 'https://m/p.webp' };
    const input = formToInput(form, false);
    expect(input.image_url).toBeNull();
    expect(input.video_url).toBe('https://m/v.mp4');
  });
  it('lets an admin relink the advertiser on a Bitwave ad', () => {
    const bitwave = { ...base, owner_user_id: null, owner_name: 'Bitwave', slot: 'platform' as const, advertiser_id: 2 };
    const original = formToInput(adToForm(bitwave), true);
    expect(diffInput(original, formToInput({ ...adToForm(bitwave), advertiser_id: 5 }, true))).toEqual({ advertiser_id: 5 });
    expect(diffInput(original, formToInput({ ...adToForm(bitwave), advertiser_id: null }, true))).toEqual({ advertiser_id: null });
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

describe('pauseBlockedReason', () => {
  it('blocks Pause on an ad that is not showing', () => {
    expect(pauseBlockedReason('pending', true)).toMatch(/isn’t showing/);
    expect(pauseBlockedReason('rejected', true)).toMatch(/not showing/);
  });
  it('always allows Resume, so a paused ad can be switched back on', () => {
    expect(pauseBlockedReason('pending', false)).toBeNull();
    expect(pauseBlockedReason('rejected', false)).toBeNull();
    expect(pauseBlockedReason('paused', false)).toBeNull();
  });
  it('allows Pause on ads that are or will be on portals', () => {
    for (const s of ['live', 'scheduled', 'ended'] as const) expect(pauseBlockedReason(s, true)).toBeNull();
  });
});

describe('adCardNote', () => {
  it("shows the reviewer's reason on a rejected ad, as written", () => {
    expect(adCardNote({ review_note: '  Number did not ring. ' }, 'rejected', false))
      .toEqual({ tone: 'danger', label: 'Why:', text: 'Number did not ring.', verbatim: true });
  });
  it('gives a pending ad the same box, in the warning tone', () => {
    const note = adCardNote({ review_note: null }, 'pending', false);
    expect(note).toMatchObject({ tone: 'warning', label: 'Not live yet:', verbatim: false });
  });
  it('shows nothing for admins on pending ads, nor for a rejection without a reason', () => {
    expect(adCardNote({ review_note: null }, 'pending', true)).toBeNull();
    expect(adCardNote({ review_note: '  ' }, 'rejected', false)).toBeNull();
  });
  it('shows nothing for live, paused, scheduled or ended ads', () => {
    for (const s of ['live', 'paused', 'scheduled', 'ended'] as const) {
      expect(adCardNote({ review_note: 'old note' }, s, false)).toBeNull();
    }
  });
});

describe('a sold ad with its clock stopped', () => {
  const stopped = {
    ...base, is_active: true, expires_at: '2026-10-20T00:00:00',
    sale: { clock_stopped: true, off_reason: 'show_ads_off', live_until: '2026-11-20T00:00:00' } as never,
  };
  it('reads as paused, not ended, past its stored end date', () => {
    expect(adDisplayStatus(stopped, NOW)).toBe('paused');
  });
  it('uses the real end date once it is back on', () => {
    const back = { ...stopped, sale: { clock_stopped: false, off_reason: null, live_until: '2026-11-20T00:00:00' } as never };
    expect(adDisplayStatus(back, NOW)).toBe('live');
  });
  it('says the paid days are not counting', () => {
    expect(adCardNote({ review_note: null, sale: { state: 'paused', clock_stopped: true, off_reason: 'show_ads_off' } as never }, 'paused', false))
      .toMatchObject({ label: 'Paused:', text: expect.stringContaining('Show Ads is off') });
  });
});

describe('adCardNote on sold ads', () => {
  const sale = (state: string, extra: Record<string, unknown> = {}) =>
    ({ review_note: null, sale: { state, renewal_due: false, can_renew: false, ...extra } as never });
  it('says a sold ad is waiting for the shop to pay before anything else', () => {
    expect(adCardNote(sale('awaiting_payment'), 'pending', false)).toMatchObject({ tone: 'warning', label: 'Waiting for payment:' });
    expect(adCardNote(sale('payment_failed'), 'live', false)).toMatchObject({ tone: 'danger', label: 'Not paid:' });
  });
  it('says when a paid ad isn’t showing, and offers renewal near the end', () => {
    expect(adCardNote(sale('in_review'), 'pending', true)).toMatchObject({ tone: 'info', label: 'Paid:' });
    expect(adCardNote(sale('live', { renewal_due: true }), 'live', false)).toMatchObject({ label: 'Ends soon:' });
    expect(adCardNote(sale('ended', { can_renew: true }), 'ended', false)).toMatchObject({ label: 'Ended:' });
    expect(adCardNote(sale('live'), 'live', false)).toBeNull();
  });
  it('still shows the reviewer’s reason on a rejected sold ad', () => {
    expect(adCardNote({ review_note: 'Blurry', sale: { state: 'rejected' } as never }, 'rejected', false))
      .toMatchObject({ label: 'Why:', text: 'Blurry' });
  });
});
