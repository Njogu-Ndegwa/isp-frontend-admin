// app/lib/portalMedia.ts
// Which picture links the captive portal will actually draw.
//
// A phone on the hotspot has no internet until it pays, so the login page can
// only load pictures from hosts in every router's walled garden. The portal
// (isp-frontend script.js LOGO_HOSTS / allowedLogoUrl) only uses our own media
// host for the reseller's logo and own header photo; anything else is ignored
// and the portal falls back to the Wi-Fi icon or a built-in photo. Uploads
// through POST /api/ads/media/upload-url land on that host. Keep in step.

export const PORTAL_MEDIA_HOSTS = ['isp.bitwavetechnologies.com', 'isp.bitwavetechnologies.net'];

/** True when the captive portal will draw this picture before login. */
export function isPortalMediaUrl(url: string | null | undefined): boolean {
  const m = /^https:\/\/([^/?#:]+)(?::\d+)?\//i.exec(String(url ?? '').trim());
  return !!m && PORTAL_MEDIA_HOSTS.includes(m[1].toLowerCase());
}

/**
 * A saved header photo that is the reseller's own picture rather than one of
 * the built-in photos. The dashboard stores presets as Unsplash links (the
 * portal maps those, and older keyword values, to a bundled photo), so any
 * other https link is the reseller's own.
 */
export function isCustomHeaderPhoto(url: string | null | undefined): boolean {
  const u = String(url ?? '').trim();
  if (!/^https:\/\//i.test(u)) return false;
  return !/^https:\/\/images\.unsplash\.com\//i.test(u);
}
