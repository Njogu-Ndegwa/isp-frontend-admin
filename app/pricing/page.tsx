import type { Metadata } from 'next';
import Link from 'next/link';
import FloatingContact from '../components/FloatingContact';
import { PHONE_DISPLAY, TEL_HREF, WHATSAPP_PRICING_MESSAGE, whatsappHref } from '../landing/contact';
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
        <PricingCalculator showHeading={false} />

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
                Billing starts once you have customers.
              </p>

              {/* Ad traffic lands here with the question already formed. Send
                  it straight to a person rather than to an anchor on another
                  page that then has to load and scroll. */}
              {/* id="contact" so the floating buttons stand down while these
                  are on screen — two sets of the same two options crowding
                  each other looks like a mistake. */}
              <div id="contact" className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <a
                  href={whatsappHref(WHATSAPP_PRICING_MESSAGE)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-emerald-500/40 text-emerald-500 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-500/10 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                  </svg>
                  WhatsApp {PHONE_DISPLAY}
                </a>
                <a
                  href={TEL_HREF}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-border text-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:border-amber-500/40 hover:text-amber-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call {PHONE_DISPLAY}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <FloatingContact whatsappMessage={WHATSAPP_PRICING_MESSAGE} />
    </>
  );
}
