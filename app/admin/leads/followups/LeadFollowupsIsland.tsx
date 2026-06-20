'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../../components/RouteIslandSkeleton';

const LeadFollowupsClient = dynamic(() => import('./LeadFollowupsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function LeadFollowupsIsland() {
  return <LeadFollowupsClient />;
}
