'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../../components/RouteIslandSkeleton';

const SubscriptionRevenueClient = dynamic(() => import('./SubscriptionRevenueClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function SubscriptionRevenueIsland() {
  return <SubscriptionRevenueClient />;
}
