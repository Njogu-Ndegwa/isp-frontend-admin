'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const PlansClient = dynamic(() => import('./PlansClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function PlansIsland() {
  return <PlansClient />;
}
