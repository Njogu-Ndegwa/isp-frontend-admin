'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const CustomerRegisterClient = dynamic(() => import('./CustomerRegisterClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} panels={2} />,
});

export default function CustomerRegisterIsland() {
  return <CustomerRegisterClient />;
}
