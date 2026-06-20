'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const LeadsClient = dynamic(() => import('./LeadsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function LeadsIsland() {
  return <LeadsClient />;
}
