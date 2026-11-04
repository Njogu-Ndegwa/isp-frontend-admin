import type { Metadata } from 'next';
import PromoReportIsland from './PromoReportIsland';

// A shop's private link: never indexed.
export const metadata: Metadata = {
  title: 'Your ad on Bitwave WiFi',
  robots: { index: false, follow: false },
};

export default function PromoReportPage() {
  return <PromoReportIsland />;
}
