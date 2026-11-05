import { adDisplayStatus } from '../../ads/adModel';
import type { PreviewAd } from '../../components/PortalPreview';
import type { Ad, FeedAd } from '../../lib/types';

/** The most offers one portal shows in its strip (isp-billing ad_serving.py LOCAL_MAX). */
const LOCAL_MAX = 8;

function isLive(ad: FeedAd, now: number): boolean {
  if (ad.status === undefined) return true;
  return adDisplayStatus(ad as Ad, now) === 'live';
}

/**
 * The offers the portal's "Soko Deals Today" strip would show, for the preview.
 * Mirrors the portal (isp-frontend spots.js): with any hero ad the strip is
 * hidden, and with nothing to show there is no strip at all.
 */
export function previewAdsFor(ownAds: FeedAd[], networkAds: FeedAd[], now = Date.now()): PreviewAd[] {
  const byId = new Map<number, FeedAd>();
  for (const ad of [...networkAds, ...ownAds]) {
    if (isLive(ad, now)) byId.set(ad.id, ad);
  }
  const live = [...byId.values()];
  if (live.some((ad) => ad.placement === 'hero')) return [];

  return live.slice(0, LOCAL_MAX).map((ad) => {
    const place = (ad.seller_location ?? '').split(',')[0].trim();
    return {
      id: ad.id,
      title: ad.title,
      seller: place ? `${ad.seller_name} - ${place}` : ad.seller_name,
      price: ad.price,
      imageUrl: ad.image_url || ad.poster_url,
      badgeType: ad.badge_type,
      badgeText: ad.badge_text,
    };
  });
}
