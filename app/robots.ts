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
  // '/dashboard' is deliberately not blocked: Google indexed it bare while it
  // was disallowed, and it has to be crawlable for the X-Robots-Tag noindex
  // header (next.config.ts) to be seen and drop it from the index.
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
  'Claude-SearchBot', // Claude search index
  'Claude-User', // Claude live browsing
  'Claude-Web', // legacy Claude browsing agent
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended', // Gemini training/grounding
  'bingbot', // Bing index — ChatGPT search and Copilot answer from it
  'DuckAssistBot', // DuckDuckGo AI answers
  'MistralAI-User', // Le Chat live browsing
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
