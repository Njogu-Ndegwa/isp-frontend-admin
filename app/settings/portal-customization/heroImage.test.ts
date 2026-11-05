import { describe, expect, it } from 'vitest';
import {
  HERO_HEIGHT,
  HERO_SOURCE_MAX_BYTES,
  HERO_WIDTH,
  checkHeroDimensions,
  checkHeroFile,
  coverCrop,
  isUploadedHero,
} from './heroImage';

describe('checkHeroFile', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (type) => {
    expect(checkHeroFile({ type, size: 1000 })).toBeNull();
  });

  it.each(['image/gif', 'image/svg+xml', 'image/heic', 'video/mp4', 'application/pdf', ''])('refuses %s', (type) => {
    expect(checkHeroFile({ type, size: 1000 })).toMatch(/JPG, PNG or WebP/);
  });

  it('refuses empty and oversized files', () => {
    expect(checkHeroFile({ type: 'image/jpeg', size: 0 })).toMatch(/empty/);
    expect(checkHeroFile({ type: 'image/jpeg', size: HERO_SOURCE_MAX_BYTES + 1 })).toMatch(/limit is 15 MB/);
  });
});

describe('checkHeroDimensions', () => {
  it('refuses a photo that would look blurred', () => {
    expect(checkHeroDimensions(300, 300)).toMatch(/too small/);
    expect(checkHeroDimensions(800, 150)).toMatch(/too small/);
    expect(checkHeroDimensions(400, 200)).toBeNull();
  });
});

describe('coverCrop', () => {
  const ratio = HERO_WIDTH / HERO_HEIGHT;

  it('trims the sides of a wide photo, centred', () => {
    const crop = coverCrop(4000, 1000);
    expect(crop.sh).toBe(1000);
    expect(crop.sw / crop.sh).toBeCloseTo(ratio, 2);
    expect(crop.sx).toBe(Math.round((4000 - crop.sw) / 2));
    expect(crop.sy).toBe(0);
  });

  it('trims the top and bottom of a tall phone photo, centred', () => {
    const crop = coverCrop(1080, 1920);
    expect(crop.sw).toBe(1080);
    expect(crop.sw / crop.sh).toBeCloseTo(ratio, 2);
    expect(crop.sy).toBe(Math.round((1920 - crop.sh) / 2));
    expect(crop.sx).toBe(0);
  });
});

describe('isUploadedHero', () => {
  it('recognises an uploaded photo', () => {
    expect(isUploadedHero('https://isp.bitwavetechnologies.com/media/c/2026/11/r12-abc.jpg')).toBe(true);
  });

  it.each([
    null,
    undefined,
    '',
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=750&h=370&fit=crop&q=80',
    'https://isp.bitwavetechnologies.com/media/c/2026/11/r12-abc.mp4',
    'https://example.com/hero.jpg',
  ])('does not treat %s as one', (url) => {
    expect(isUploadedHero(url)).toBe(false);
  });
});
