import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bitwave ISP Billing — Hotspot & PPPoE Billing for Kenyan ISPs',
  description:
    'Automate your ISP billing: M-Pesa payments, hotspot vouchers, PPPoE management, MikroTik integration and customer analytics. Start free.',
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
