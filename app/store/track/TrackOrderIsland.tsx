'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const TrackOrderClient = dynamic(() => import('./TrackOrderClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} />,
});

export default function TrackOrderIsland() {
  return <TrackOrderClient />;
}
