'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../../components/RouteIslandSkeleton';

const SubscriptionPaymentsClient = dynamic(() => import('./SubscriptionPaymentsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function SubscriptionPaymentsIsland() {
  return <SubscriptionPaymentsClient />;
}
