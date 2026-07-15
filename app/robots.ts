import type { MetadataRoute } from 'next';

// Only the acquisition surface (landing, signup, blog, public store/referral
// pages) should be crawlable; everything else is the logged-in admin app.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/access-credentials',
          '/account-statement',
          '/admin',
          '/ads',
          '/advertisers',
          '/customers',
          '/dashboard',
          '/diagnostics',
          '/login',
          '/messaging',
          '/plans',
          '/pppoe-monitor',
          '/ratings',
          '/routers',
          '/settings',
          '/setup',
          '/shop',
          '/transactions',
          '/unmatched-payments',
          '/vouchers',
          '/walled-garden',
        ],
      },
    ],
    sitemap: 'https://bitwavetechnologies.com/sitemap.xml',
  };
}
