import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bitwave Technologies — ISP Billing for Hotspots & PPPoE in Kenya',
  description:
    'Bitwave Technologies automates ISP billing: M-Pesa payments, hotspot vouchers, PPPoE management, MikroTik integration and customer analytics. Start free.',
  // /landing duplicates the root route; consolidate ranking signals on /.
  alternates: { canonical: '/' },
};

// Structured data lives in the page (see structuredData.ts) so it also reaches
// `/`, which renders the page without this layout.
export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
