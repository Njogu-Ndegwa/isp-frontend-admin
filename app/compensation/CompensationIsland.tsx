'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const CompensationClient = dynamic(() => import('./CompensationClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function CompensationIsland() {
  return <CompensationClient />;
}
