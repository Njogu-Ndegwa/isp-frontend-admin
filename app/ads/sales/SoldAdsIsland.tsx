'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const SoldAdsClient = dynamic(() => import('./SoldAdsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function SoldAdsIsland() {
  return <SoldAdsClient />;
}
