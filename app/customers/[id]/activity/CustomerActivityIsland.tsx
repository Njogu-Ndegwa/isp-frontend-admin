'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../../components/RouteIslandSkeleton';

const CustomerActivityClient = dynamic(() => import('./CustomerActivityClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} panels={2} />,
});

export default function CustomerActivityIsland() {
  return <CustomerActivityClient />;
}
