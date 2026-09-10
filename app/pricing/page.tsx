import type { Metadata } from 'next';
import Link from 'next/link';
import PricingCalculator from '../landing/PricingCalculator';

const TITLE = 'Pricing — MikroTik Hotspot & PPPoE Billing in Kenya';
const DESCRIPTION =
  'Bitwave ISP billing costs 3% of hotspot revenue or KES 25 per PPPoE user per month, KES 500 minimum. No setup fees. Free installation and MikroTik configuration.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/pricing' },
  openGraph: {
    type: 'website',
    url: '/pricing',
    siteName: 'Bitwave Technologies',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

// Published rates, mirroring the calculator's constants. Keep the two in step.
const OFFER_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Bitwave ISP Billing',
  description: DESCRIPTION,
  brand: { '@type': 'Brand', name: 'Bitwave Technologies' },
  offers: [
    {
      '@type': 'Offer',
      name: 'Hotspot billing',
      description: '3% of monthly hotspot revenue, KES 500 minimum.',
      priceCurrency: 'KES',
      price: '500',
      availability: 'https://schema.org/InStock',
      url: 'https://bitwavetechnologies.com/pricing',
    },
    {
      '@type': 'Offer',
      name: 'PPPoE billing',
      description: 'KES 25 per active PPPoE user per month, KES 500 minimum.',
      priceCurrency: 'KES',
      price: '25',
      availability: 'https://schema.org/InStock',
      url: 'https://bitwavetechnologies.com/pricing',
    },
  ],
};

/**
 * Worked examples answer the question a rate card leaves open: "what will this
 * actually cost me?" Rendered as plain server HTML so the numbers are in the
 * document for search engines and for anyone who lands before hydration.
 */
const EXAMPLES = [
  {
    who: 'Just starting out',
    setup: 'KES 10,000/month of hotspot vouchers',
    working: '3% is KES 300, so the KES 500 minimum applies',
    cost: 'KES 500',
  },
  {
    who: 'One busy plot',
    setup: 'KES 30,000/month of hotspot vouchers',
    working: '3% of KES 30,000',
    cost: 'KES 900',
  },
  {
    who: 'Small PPPoE network',
    setup: '30 PPPoE customers',
    working: '30 × KES 25',
    cost: 'KES 750',
  },
  {
    who: 'Running both',
    setup: 'KES 50,000 hotspot + 20 PPPoE customers',
    working: 'KES 1,500 + KES 500',
    cost: 'KES 2,000',
  },
];

const INCLUDED = [
  'We configure your MikroTik for you — you never touch RouterOS',
  'M-Pesa payments, activated automatically the moment a customer pays',
  'Hotspot vouchers, PPPoE accounts and static clients on one dashboard',
  'Automatic disconnection when a package expires',
  'Router uptime monitoring and revenue analytics',
  'Free installation. No setup fee.',
];

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(OFFER_JSONLD) }}
      />

      {/* A focused header: paid traffic arrives here to find a price, so the
          only routes offered are back to the site and forward to signup. */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg className="w-5 h-5 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
            <span className="font-bold text-lg">Bitwave</span>
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-background font-semibold text-sm"
          >
            Get started
          </Link>
        </div>
      </nav>

      <main className="pt-16">
        <section className="px-4 pt-16 pb-6 md:pt-24">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
              Pricing
            </span>
            <h1 className="text-3xl md:text-5xl font-bold mt-3 leading-tight">
              You pay a share of what you earn,{' '}
              <span className="gradient-text">not a licence fee</span>
            </h1>
            <p className="mt-5 text-foreground-muted text-lg">
              3% of hotspot revenue, or KES 25 per PPPoE user per month. KES 500 minimum.
              No setup fee, and we configure your MikroTik for you.
            </p>
          </div>
        </section>

        {/* Interactive estimate. Imported directly rather than through the
            landing page's deferred bundle, so it server-renders here. */}
        <PricingCalculator />

        <section className="px-4 pb-20 md:pb-28">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center">
              What that means in practice
            </h2>
            <p className="mt-3 text-foreground-muted text-center max-w-xl mx-auto">
              Four real setups and what each one pays per month.
            </p>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {EXAMPLES.map((example) => (
                <div key={example.who} className="card p-5 flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
                    {example.who}
                  </p>
                  <p className="font-medium">{example.setup}</p>
                  <p className="text-sm text-foreground-muted">{example.working}</p>
                  <p className="text-2xl font-bold gradient-text mt-1">{example.cost}</p>
                  <p className="text-xs text-foreground-muted">per month</p>
                </div>
              ))}
            </div>

            <div className="mt-12 card p-6 md:p-8">
              <h3 className="text-xl font-bold">Included at every level</h3>
              <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex gap-3 text-sm">
                    <svg
                      className="w-5 h-5 text-amber-500 shrink-0 mt-px"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12 text-center flex flex-col items-center gap-4">
              <Link
                href="/signup"
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-background font-semibold shadow-lg shadow-amber-500/20"
              >
                Create your account
              </Link>
              <p className="text-sm text-foreground-muted">
                Billing starts once you have customers. Questions?{' '}
                <Link href="/#contact" className="text-accent-primary underline underline-offset-2">
                  Talk to us first
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
