'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const SubscriptionCollectionsClient = dynamic(() => import('./SubscriptionCollectionsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function SubscriptionCollectionsIsland() {
  return <SubscriptionCollectionsClient />;
}
