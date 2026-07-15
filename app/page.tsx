import type { Metadata } from 'next';

const TITLE = 'Bitwave Technologies — ISP Billing for Hotspots & PPPoE in Kenya';
const DESCRIPTION =
  'Bitwave Technologies automates ISP billing: M-Pesa payments, hotspot vouchers, PPPoE management, MikroTik integration and customer analytics. Start free.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Bitwave Technologies',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export { default } from './landing/page';
