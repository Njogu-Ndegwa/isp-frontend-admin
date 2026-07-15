import type { MetadataRoute } from 'next';

// Only the acquisition surface (landing, signup, blog, public store/referral
// pages) should be crawlable; everything else is the logged-in admin app.
//
// AI answer engines are named explicitly so a future tightening of `*` can't
// silently drop us out of ChatGPT/Claude/Perplexity answers. Google AI
// Overviews uses regular Googlebot, so it needs no special rule.
const ADMIN_DISALLOW = [
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
];

const AI_CRAWLERS = [
  'GPTBot', // OpenAI training
  'OAI-SearchBot', // ChatGPT search index
  'ChatGPT-User', // ChatGPT live browsing
  'ClaudeBot', // Anthropic crawler
  'Claude-Web', // Claude live browsing
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended', // Gemini training/grounding
  'Applebot-Extended',
  'meta-externalagent',
  'Amazonbot',
  'CCBot', // Common Crawl — feeds many model datasets
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ADMIN_DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: ADMIN_DISALLOW,
      })),
    ],
    sitemap: 'https://bitwavetechnologies.com/sitemap.xml',
  };
}
