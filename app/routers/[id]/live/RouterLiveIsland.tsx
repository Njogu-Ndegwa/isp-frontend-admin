'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../../components/RouteIslandSkeleton';

const RouterLiveClient = dynamic(() => import('./RouterLiveClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={4} panels={1} />,
});

export default function RouterLiveIsland() {
  return <RouterLiveClient />;
}
