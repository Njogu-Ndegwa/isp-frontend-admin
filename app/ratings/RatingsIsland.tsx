'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const RatingsClient = dynamic(() => import('./RatingsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function RatingsIsland() {
  return <RatingsClient />;
}
