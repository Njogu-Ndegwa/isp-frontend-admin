'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../../components/RouteIslandSkeleton';

const ResellerDetailClient = dynamic(() => import('./ResellerDetailClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} panels={2} />,
});

export default function ResellerDetailIsland() {
  return <ResellerDetailClient />;
}
