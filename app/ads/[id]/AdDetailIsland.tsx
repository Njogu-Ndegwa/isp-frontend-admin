'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const AdDetailClient = dynamic(() => import('./AdDetailClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} panels={2} />,
});

export default function AdDetailIsland() {
  return <AdDetailClient />;
}
