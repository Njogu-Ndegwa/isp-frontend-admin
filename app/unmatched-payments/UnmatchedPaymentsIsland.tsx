'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const UnmatchedPaymentsClient = dynamic(() => import('./UnmatchedPaymentsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function UnmatchedPaymentsIsland() {
  return <UnmatchedPaymentsClient />;
}
