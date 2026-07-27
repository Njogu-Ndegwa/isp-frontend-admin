import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bitwave Technologies — ISP Billing for Hotspots & PPPoE in Kenya',
  description:
    'Bitwave Technologies automates ISP billing: M-Pesa payments, hotspot vouchers, PPPoE management, MikroTik integration and customer analytics. Start free.',
  // /landing duplicates the root route; consolidate ranking signals on /.
  alternates: { canonical: '/' },
};

const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Bitwave Technologies',
  url: 'https://bitwavetechnologies.com',
  sameAs: [],
};

const SOFTWARE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Bitwave ISP Billing',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'ISP billing platform for Kenyan WISPs: M-Pesa payments, hotspot vouchers, PPPoE management, MikroTik router integration and customer analytics.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'KES' },
  url: 'https://bitwavetechnologies.com',
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSONLD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_JSONLD) }}
      />
      {children}
    </>
  );
}
