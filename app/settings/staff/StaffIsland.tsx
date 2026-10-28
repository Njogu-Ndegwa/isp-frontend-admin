'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const StaffClient = dynamic(() => import('./StaffClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function StaffIsland() {
  return <StaffClient />;
}
