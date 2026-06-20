'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const RoutersClient = dynamic(() => import('./RoutersClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function RoutersIsland() {
  return <RoutersClient />;
}
