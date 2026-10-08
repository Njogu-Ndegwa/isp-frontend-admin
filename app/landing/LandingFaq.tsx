import Link from 'next/link';
import { FAQS } from './landingFacts';

/**
 * Server-rendered FAQ. Everything above the fold-out sections is deferred and
 * client-only for speed, which left the homepage HTML with about 100 words in
 * it: crawlers for ChatGPT, Claude and Bing saw a headline and some stats and
 * nothing about what Bitwave does or costs. This section is plain HTML with no
 * JavaScript, so those facts are in the document on first byte.
 */
export default function LandingFaq() {
  return (
    <section id="faq" className="py-20 md:py-28 px-4 border-t border-border">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3">Questions ISPs ask us</h2>
          <p className="mt-4 text-foreground-muted max-w-xl mx-auto">
            Straight answers about pricing, M-Pesa, MikroTik and setup.
          </p>
        </div>
        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group card-glass rounded-xl px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                <h3 className="text-base">{q}</h3>
                <span aria-hidden="true" className="text-accent-primary transition-transform group-open:rotate-45 text-xl leading-none">+</span>
              </summary>
              <p className="mt-3 text-sm text-foreground-muted leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-foreground-muted">
          Comparing options? Read our{' '}
          <Link href="/blog/best-isp-billing-system-kenya-2026" className="text-accent-primary underline underline-offset-4">
            honest comparison of ISP billing systems in Kenya
          </Link>{' '}
          or see the full <Link href="/pricing" className="text-accent-primary underline underline-offset-4">pricing</Link>.
        </p>
      </div>
    </section>
  );
}
