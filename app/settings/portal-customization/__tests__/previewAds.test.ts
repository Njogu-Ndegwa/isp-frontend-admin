import { describe, expect, it } from 'vitest';
import { previewAdsFor } from '../previewAds';
import type { FeedAd } from '../../../lib/types';

const NOW = Date.parse('2026-11-05T12:00:00Z');

const feedAd = (over: Partial<FeedAd> = {}): FeedAd => ({
  id: 1,
  title: 'Fresh onions',
  seller_name: 'Wanjiku Greens',
  seller_location: 'By the stage, Section A',
  price: 'KSH 120',
  placement: 'local',
  image_url: 'https://media.example/o.webp',
  poster_url: null,
  badge_type: 'hot',
  badge_text: 'HOT',
  ...over,
});

const ownAd = (over: Partial<FeedAd> = {}): FeedAd =>
  feedAd({ status: 'approved', is_active: true, starts_at: null, expires_at: null, ...over });

describe('previewAdsFor', () => {
  it('has nothing to show when there are no ads', () => {
    expect(previewAdsFor([], [], NOW)).toEqual([]);
  });

  it('prints an offer the way the portal does', () => {
    expect(previewAdsFor([], [feedAd()], NOW)).toEqual([
      {
        id: 1,
        title: 'Fresh onions',
        seller: 'Wanjiku Greens - By the stage',
        price: 'KSH 120',
        imageUrl: 'https://media.example/o.webp',
        badgeType: 'hot',
        badgeText: 'HOT',
      },
    ]);
  });

  it('copes with an offer that has no location, price or photo', () => {
    const [ad] = previewAdsFor([], [feedAd({ seller_location: null, price: null, image_url: null, poster_url: 'https://media.example/p.webp' })], NOW);
    expect(ad.seller).toBe('Wanjiku Greens');
    expect(ad.price).toBeNull();
    expect(ad.imageUrl).toBe('https://media.example/p.webp');
  });

  it('leaves out the reseller ads customers do not see right now', () => {
    const notShowing = [
      ownAd({ id: 2, is_active: false }),
      ownAd({ id: 3, status: 'rejected' }),
      ownAd({ id: 4, status: 'pending' }),
      ownAd({ id: 5, expires_at: '2026-11-01T00:00:00' }),
      ownAd({ id: 6, starts_at: '2026-12-01T00:00:00' }),
    ];
    expect(previewAdsFor(notShowing, [], NOW)).toEqual([]);
    expect(previewAdsFor([...notShowing, ownAd({ id: 7 })], [], NOW).map((a) => a.id)).toEqual([7]);
  });

  it('combines own and network ads, once each', () => {
    const ids = previewAdsFor([ownAd({ id: 1 }), ownAd({ id: 2 })], [feedAd({ id: 1 }), feedAd({ id: 3 })], NOW).map((a) => a.id);
    expect(ids.sort()).toEqual([1, 2, 3]);
  });

  it('has no strip when a hero ad is live, because the portal hides it then', () => {
    expect(previewAdsFor([ownAd({ id: 2, placement: 'hero' })], [feedAd()], NOW)).toEqual([]);
    expect(previewAdsFor([], [feedAd({ id: 2, placement: 'hero' }), feedAd()], NOW)).toEqual([]);
  });

  it('a hero ad that is not live does not hide the strip', () => {
    expect(previewAdsFor([ownAd({ id: 2, placement: 'hero', is_active: false })], [feedAd()], NOW)).toHaveLength(1);
  });

  it('stops at the most a portal shows', () => {
    const many = Array.from({ length: 12 }, (_, i) => feedAd({ id: i + 1 }));
    expect(previewAdsFor([], many, NOW)).toHaveLength(8);
  });
});
