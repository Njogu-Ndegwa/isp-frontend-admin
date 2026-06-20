'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const SubscriptionsClient = dynamic(() => import('./SubscriptionsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function SubscriptionsIsland() {
  return <SubscriptionsClient />;
}
