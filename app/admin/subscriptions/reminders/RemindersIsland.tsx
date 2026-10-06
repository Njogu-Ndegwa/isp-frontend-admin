'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../../components/RouteIslandSkeleton';

const RemindersClient = dynamic(() => import('./RemindersClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function RemindersIsland() {
  return <RemindersClient />;
}
