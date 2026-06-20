'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../../components/RouteIslandSkeleton';

const SubscriptionInvoicesClient = dynamic(() => import('./SubscriptionInvoicesClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function SubscriptionInvoicesIsland() {
  return <SubscriptionInvoicesClient />;
}
