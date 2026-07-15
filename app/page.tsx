import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bitwave ISP Billing — Hotspot & PPPoE Billing for Kenyan ISPs',
  description:
    'Automate your ISP billing: M-Pesa payments, hotspot vouchers, PPPoE management, MikroTik integration and customer analytics. Start free.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Bitwave Technologies',
    title: 'Bitwave ISP Billing — Hotspot & PPPoE Billing for Kenyan ISPs',
    description:
      'Automate your ISP billing: M-Pesa payments, hotspot vouchers, PPPoE management, MikroTik integration and customer analytics. Start free.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bitwave ISP Billing — Hotspot & PPPoE Billing for Kenyan ISPs',
    description:
      'Automate your ISP billing: M-Pesa payments, hotspot vouchers, PPPoE management, MikroTik integration and customer analytics. Start free.',
  },
};

export { default } from './landing/page';
