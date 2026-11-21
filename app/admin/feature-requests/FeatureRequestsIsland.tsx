'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const FeatureRequestsClient = dynamic(() => import('./FeatureRequestsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function FeatureRequestsIsland() {
  return <FeatureRequestsClient />;
}
