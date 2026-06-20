'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const AdsClient = dynamic(() => import('./AdsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function AdsIsland() {
  return <AdsClient />;
}
