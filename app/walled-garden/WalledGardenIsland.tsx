'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const WalledGardenClient = dynamic(() => import('./WalledGardenClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function WalledGardenIsland() {
  return <WalledGardenClient />;
}
