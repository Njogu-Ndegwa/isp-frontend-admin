'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const AdsAnalyticsClient = dynamic(() => import('./AdsAnalyticsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function AdsAnalyticsIsland() {
  return <AdsAnalyticsClient />;
}
