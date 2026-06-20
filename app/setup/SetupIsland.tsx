'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const SetupClient = dynamic(() => import('./SetupClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} />,
});

export default function SetupIsland() {
  return <SetupClient />;
}
