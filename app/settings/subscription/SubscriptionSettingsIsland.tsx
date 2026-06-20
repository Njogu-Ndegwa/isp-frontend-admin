'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const SubscriptionSettingsClient = dynamic(() => import('./SubscriptionSettingsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function SubscriptionSettingsIsland() {
  return <SubscriptionSettingsClient />;
}
