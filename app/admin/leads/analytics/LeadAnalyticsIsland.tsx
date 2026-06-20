'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../../components/RouteIslandSkeleton';

const LeadAnalyticsClient = dynamic(() => import('./LeadAnalyticsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function LeadAnalyticsIsland() {
  return <LeadAnalyticsClient />;
}
