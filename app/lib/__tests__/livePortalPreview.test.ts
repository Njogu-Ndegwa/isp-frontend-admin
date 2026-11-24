import { describe, expect, it } from 'vitest';
import {
  PHONE_WIDTH, phoneSize, portalOrigin, portalPreviewData, previewMessageType, previewScale,
} from '../livePortalPreview';
import type { PublicPortalResponse } from '../types';

const base = {
  router: { router_id: 7, name: 'R7', identity: 'R7', user_id: 3, business_name: 'Kwetu' },
  plans: [{ id: 1, name: 'Daily', price: 50 }],
  ads: [{ id: 9 }],
  portal_settings: { color_theme: 'slate_gray', header_style: 'hero', welcome_title: 'Kwetu', show_ads: true },
} as unknown as PublicPortalResponse;

describe('portalPreviewData', () => {
  it('lays the edited settings over the saved ones and keeps plans and ads', () => {
    const out = portalPreviewData(base, { color_theme: 'emerald_green', show_ads: false });
    expect(out.portal_settings).toMatchObject({
      color_theme: 'emerald_green', header_style: 'hero', welcome_title: 'Kwetu', show_ads: false,
    });
    expect(out.plans).toBe(base.plans);
    expect(out.ads).toBe(base.ads);
    expect(base.portal_settings).toMatchObject({ color_theme: 'slate_gray' }); // not mutated
  });

  it('keeps the saved value for blanks, as the backend does for customers', () => {
    const out = portalPreviewData(base, { welcome_title: '', header_style: null, color_theme: undefined });
    expect(out.portal_settings).toMatchObject({ welcome_title: 'Kwetu', header_style: 'hero', color_theme: 'slate_gray' });
  });
});

describe('previewScale', () => {
  it('fits the phone width and never enlarges it', () => {
    expect(previewScale(PHONE_WIDTH)).toBe(1);
    expect(previewScale(720)).toBe(1);
    expect(previewScale(324)).toBeCloseTo(0.9);
    expect(previewScale(0)).toBe(1);
  });
});

describe('phoneSize', () => {
  it("is the viewer's own screen on a phone, a 360 px phone elsewhere", () => {
    expect(phoneSize(375, 812)).toEqual({ width: 375, height: 812 });
    expect(phoneSize(360, 800)).toEqual({ width: 360, height: 800 });
    expect(phoneSize(300, 400)).toEqual({ width: 320, height: 560 });
    expect(phoneSize(1440, 900)).toEqual({ width: PHONE_WIDTH, height: 760 });
    expect(phoneSize(0, 0)).toEqual({ width: PHONE_WIDTH, height: 760 });
  });
});

describe('previewMessageType', () => {
  it('knows only the portal preview messages', () => {
    expect(previewMessageType({ type: 'bw-portal-preview:ready' })).toBe('ready');
    expect(previewMessageType({ type: 'bw-portal-preview:rendered' })).toBe('rendered');
    expect(previewMessageType({ type: 'other' })).toBeNull();
    expect(previewMessageType(null)).toBeNull();
    expect(previewMessageType('bw-portal-preview:ready')).toBeNull();
  });
});

describe('portalOrigin', () => {
  it('is the origin of the portal URL', () => {
    expect(portalOrigin('https://isp-frontend-two.vercel.app/')).toBe('https://isp-frontend-two.vercel.app');
    expect(portalOrigin('http://localhost:3917/x')).toBe('http://localhost:3917');
  });
});
