'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const EarningsClient = dynamic(() => import('./EarningsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function EarningsIsland() {
  return <EarningsClient />;
}
