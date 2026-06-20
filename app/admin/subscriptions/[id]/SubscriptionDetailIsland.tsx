'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../../components/RouteIslandSkeleton';

const SubscriptionDetailClient = dynamic(() => import('./SubscriptionDetailClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} panels={2} />,
});

export default function SubscriptionDetailIsland() {
  return <SubscriptionDetailClient />;
}
