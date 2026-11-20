import { describe, expect, it } from 'vitest';
import { isCustomHeaderPhoto, isPortalMediaUrl } from '../portalMedia';
import { THEME_PALETTES } from '../portalThemes';

describe('isPortalMediaUrl (mirrors isp-frontend script.js allowedLogoUrl)', () => {
  it('accepts uploads on our media host', () => {
    expect(isPortalMediaUrl('https://isp.bitwavetechnologies.com/media/c/2026/11/r7-abc.png')).toBe(true);
    expect(isPortalMediaUrl('https://ISP.bitwavetechnologies.net/media/c/x.webp')).toBe(true);
  });

  it('rejects other hosts, http and junk', () => {
    for (const url of [
      'https://example.com/logo.png',
      'http://isp.bitwavetechnologies.com/media/c/x.png',
      'https://isp.bitwavetechnologies.com.evil.io/x.png',
      'https://images.unsplash.com/photo-1523805009345-7448845a9e53',
      '',
      null,
      undefined,
    ]) {
      expect(isPortalMediaUrl(url)).toBe(false);
    }
  });
});

describe('isCustomHeaderPhoto', () => {
  it('treats the built-in Unsplash presets and old keyword values as presets', () => {
    expect(isCustomHeaderPhoto('https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=750&h=370&fit=crop&q=80')).toBe(false);
    expect(isCustomHeaderPhoto('/images/presets/nature.webp')).toBe(false);
    expect(isCustomHeaderPhoto(null)).toBe(false);
    expect(isCustomHeaderPhoto('')).toBe(false);
  });

  it('treats an uploaded or pasted https photo as the reseller’s own', () => {
    expect(isCustomHeaderPhoto('https://isp.bitwavetechnologies.com/media/c/2026/11/r7-abc.jpg')).toBe(true);
    expect(isCustomHeaderPhoto('https://example.com/shop.jpg')).toBe(true);
  });
});

describe('portal themes', () => {
  // Mirror of isp-billing OFFERED_THEMES and isp-frontend script.js THEMES. Change together.
  const OFFERED = [
    'sunset_orange', 'ocean_blue', 'emerald_green', 'bright_violet', 'rose_gold', 'slate_gray',
    'teal_lagoon', 'royal_blue', 'cherry_red', 'amber_gold', 'hot_pink', 'charcoal_black',
  ];

  it('has a full palette for every theme the backend accepts', () => {
    expect(Object.keys(THEME_PALETTES).sort()).toEqual([...OFFERED].sort());
    for (const theme of OFFERED) {
      const p = THEME_PALETTES[theme as keyof typeof THEME_PALETTES];
      for (const key of ['primary', 'primaryLight', 'primaryDark', 'accent', 'background'] as const) {
        expect(p[key]).toMatch(/^#[0-9A-F]{6}$/i);
      }
    }
  });
});
