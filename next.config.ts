import type { NextConfig } from "next";

// Keep connect-src in sync with the runtime-configurable API origin.
const apiOrigin = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://isp.bitwavetechnologies.com")
  .replace(/\/api\/?$/, "")
  .replace(/\/+$/, "");

// 'unsafe-inline' script-src is required by Next's inline runtime and the GA
// bootstrap snippet; tighten with nonces if those move to external files.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://*.contentsquare.net https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      // Tutorial videos (e.g. the router setup walkthrough) are served from
      // Cloudinary. Without an explicit media-src, <video>/<audio> fall back to
      // default-src 'self' and the cross-origin clip is blocked — the poster
      // (an image) still shows, so it looks like a video that never plays.
      "media-src 'self' blob: https://res.cloudinary.com",
      "font-src 'self' data:",
      `connect-src 'self' ${apiOrigin} https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com https://*.contentsquare.net https://va.vercel-scripts.com`,
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 80, 85],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
