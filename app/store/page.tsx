import type { Metadata } from 'next';
import StoreIsland from './StoreIsland';

export const metadata: Metadata = {
  title: 'ISP Equipment Store — MikroTik Routers, Cables & Antennas | Bitwave',
  description:
    'Buy MikroTik routers, outdoor cable, antennas and switches for your hotspot or PPPoE network. Pay with M-Pesa and get it delivered in Kenya.',
  alternates: { canonical: '/store' },
};

export default function StorePage() {
  return <StoreIsland />;
}
