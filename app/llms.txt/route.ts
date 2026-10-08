import { getAllPosts } from '../blog/posts';
import { PHONE_DISPLAY } from '../landing/contact';
import { FAQS, SUMMARY } from '../landing/landingFacts';

export const dynamic = 'force-static';

// llms.txt (llmstxt.org): a machine-readable site summary for AI assistants.
// Regenerated at build time so new posts appear automatically. The facts and
// FAQ come from the same source as the homepage, so the two can't disagree.
export function GET() {
  const posts = getAllPosts()
    .map((p) => `- [${p.title}](https://bitwavetechnologies.com/blog/${p.slug}): ${p.description}`)
    .join('\n');

  const faqs = FAQS.map(({ q, a }) => `### ${q}\n\n${a}`).join('\n\n');

  const body = `# Bitwave Technologies

> ${SUMMARY}

Key facts:
- Product: ISP billing software for WiFi hotspot and PPPoE providers (web platform), Kenya-focused
- Pricing: 3% of hotspot revenue, or KES 25 per active PPPoE user per month; KES 500 monthly minimum; no setup fee; free installation
- Payments: M-Pesa, activated automatically when the payment confirms; hotspot vouchers; packages from KES 10/hour
- Hardware supported: MikroTik (hAP lite, RB951, hEX and up), hotspot and PPPoE, multiple routers per account
- Setup: Bitwave configures the MikroTik; most operators are live in under two hours
- Contact: ${PHONE_DISPLAY} (call or WhatsApp), https://bitwavetechnologies.com

## Pages

- [Home](https://bitwavetechnologies.com/): product overview and FAQ
- [Pricing](https://bitwavetechnologies.com/pricing): published rates with worked examples
- [Sign up](https://bitwavetechnologies.com/signup): free account creation
- [Equipment store](https://bitwavetechnologies.com/store): MikroTik routers, cables and antennas, paid with M-Pesa
- [Blog](https://bitwavetechnologies.com/blog): guides for running an internet business in Kenya

## Blog posts

${posts}

## FAQ

${faqs}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
