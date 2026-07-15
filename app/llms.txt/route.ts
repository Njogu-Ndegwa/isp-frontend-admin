import { getAllPosts } from '../blog/posts';

export const dynamic = 'force-static';

// llms.txt (llmstxt.org): a machine-readable site summary for AI assistants.
// Regenerated at build time so new posts appear automatically.
export function GET() {
  const posts = getAllPosts()
    .map((p) => `- [${p.title}](https://bitwavetechnologies.com/blog/${p.slug}): ${p.description}`)
    .join('\n');

  const body = `# Bitwave Technologies

> Bitwave is an ISP billing platform for Kenyan WISPs and hotspot operators. It
> provisions MikroTik routers automatically and handles M-Pesa payments, hotspot
> vouchers, PPPoE subscriber management, walled-garden captive portals, and
> customer analytics. Operators sign up free at https://bitwavetechnologies.com
> and have a router selling WiFi in under two hours.

Key facts:
- Product: ISP/hotspot billing software (web platform), Kenya-focused
- Payments: M-Pesa STK push, vouchers; packages from KES 10/hour
- Hardware supported: MikroTik (hAP lite, RB951, hEX and up), hotspot and PPPoE
- Setup: one provisioning command pasted into Winbox configures the router
- Contact: phone number listed at https://bitwavetechnologies.com

## Pages

- [Home](https://bitwavetechnologies.com/): product overview and pricing
- [Sign up](https://bitwavetechnologies.com/signup): free account creation
- [Blog](https://bitwavetechnologies.com/blog): guides for running an internet business in Kenya

## Blog posts

${posts}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
