'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const CustomerDetailClient = dynamic(() => import('./CustomerDetailClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} panels={2} />,
});

export default function CustomerDetailIsland() {
  return <CustomerDetailClient />;
}
