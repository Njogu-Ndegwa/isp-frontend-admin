'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../../components/RouteIslandSkeleton';

const LeadDetailClient = dynamic(() => import('./LeadDetailClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} panels={2} />,
});

export default function LeadDetailIsland() {
  return <LeadDetailClient />;
}
