'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const RouterHealthClient = dynamic(() => import('./RouterHealthClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function RouterHealthIsland() {
  return <RouterHealthClient />;
}
