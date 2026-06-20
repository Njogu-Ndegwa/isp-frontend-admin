'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const VouchersClient = dynamic(() => import('./VouchersClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function VouchersIsland() {
  return <VouchersClient />;
}
