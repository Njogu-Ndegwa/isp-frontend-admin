'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../../components/RouteIslandSkeleton';

const LeadSourcesClient = dynamic(() => import('./LeadSourcesClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function LeadSourcesIsland() {
  return <LeadSourcesClient />;
}
