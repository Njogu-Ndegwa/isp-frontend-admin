import type { NextConfig } from "next";

// Keep connect-src in sync with the runtime-configurable API origin.
const apiOrigin = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://isp.bitwavetechnologies.com")
  .replace(/\/api\/?$/, "")
  .replace(/\/+$/, "");

// 'unsafe-inline' script-src is required by Next's inline runtime and the GA /
// TikTok bootstrap snippets; tighten with nonces if those move to external files.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://analytics.tiktok.com https://analytics-ipv6.tiktokw.us https://*.contentsquare.net https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      // Tutorial videos (e.g. the router setup walkthrough) are served from
      // Cloudinary. Without an explicit media-src, <video>/<audio> fall back to
      // default-src 'self' and the cross-origin clip is blocked — the poster
      // (an image) still shows, so it looks like a video that never plays.
      "media-src 'self' blob: https://res.cloudinary.com",
      "font-src 'self' data:",
      `connect-src 'self' ${apiOrigin} https://www.google.com https://www.google-analytics.com https://analytics.google.com https://*.google-analytics.com https://*.googletagmanager.com https://stats.g.doubleclick.net https://analytics.tiktok.com https://analytics-ipv6.tiktokw.us https://*.contentsquare.net https://va.vercel-scripts.com`,
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

// The logged-in admin app must never appear in Google. robots.txt alone can't
// guarantee that: a disallowed URL Google finds through a link gets indexed
// bare (it happened to /dashboard), because the crawler can't fetch the page
// to learn it shouldn't. This header is what actually keeps them out.
const ADMIN_PATHS = [
  "/access-credentials",
  "/account-statement",
  "/admin",
  "/ads",
  "/advertisers",
  "/customers",
  "/dashboard",
  "/diagnostics",
  "/messaging",
  "/plans",
  "/pppoe-monitor",
  "/ratings",
  "/routers",
  "/settings",
  "/setup",
  "/shop",
  "/transactions",
  "/unmatched-payments",
  "/vouchers",
  "/walled-garden",
];

const nextConfig: NextConfig = {
  // Opt-in standalone build, used only by the self-hosted Hetzner origin.
  // Left unset on Vercel (which builds its own output format), so this is a
  // no-op for the existing deployment.
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
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
    return [
      { source: "/(.*)", headers: securityHeaders },
      ...ADMIN_PATHS.map((p) => ({
        source: `${p}/:path*`,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
    ];
  },
  async redirects() {
    // Canonical host is the apex; www carries no history worth keeping.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.bitwavetechnologies.com" }],
        destination: "https://bitwavetechnologies.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
