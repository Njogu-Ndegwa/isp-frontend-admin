import { PHONE_NUMBER } from './contact';
import { FAQS, SUMMARY } from './landingFacts';

const SITE = 'https://bitwavetechnologies.com';

/**
 * Rendered by the landing page itself, not landing/layout.tsx: `/` re-exports
 * the page component without the /landing layout, so data placed in the layout
 * only ever reached the duplicate /landing URL and never the homepage.
 */
export const LANDING_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE}/#organization`,
      name: 'Bitwave Technologies',
      alternateName: 'Bitwave',
      url: SITE,
      description: SUMMARY,
      areaServed: { '@type': 'Country', name: 'Kenya' },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: PHONE_NUMBER,
        contactType: 'sales',
        areaServed: 'KE',
        availableLanguage: ['English', 'Swahili'],
      },
      sameAs: ['https://www.tiktok.com/@bitwavetechnologies'],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE}/#software`,
      name: 'Bitwave ISP Billing',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'ISP billing software',
      operatingSystem: 'Web',
      url: SITE,
      description: SUMMARY,
      publisher: { '@id': `${SITE}/#organization` },
      featureList: [
        'M-Pesa payments with automatic activation',
        'Hotspot vouchers and captive portal',
        'PPPoE subscriber management',
        'Automatic MikroTik router configuration',
        'Automatic disconnection on expiry',
        'Router uptime monitoring and revenue analytics',
      ],
      offers: [
        {
          '@type': 'Offer',
          name: 'Hotspot billing',
          description: '3% of monthly hotspot revenue, KES 500 minimum. No setup fee.',
          price: '500',
          priceCurrency: 'KES',
          url: `${SITE}/pricing`,
        },
        {
          '@type': 'Offer',
          name: 'PPPoE billing',
          description: 'KES 25 per active PPPoE user per month, KES 500 minimum. No setup fee.',
          price: '25',
          priceCurrency: 'KES',
          url: `${SITE}/pricing`,
        },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE}/#faq`,
      mainEntity: FAQS.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ],
};
