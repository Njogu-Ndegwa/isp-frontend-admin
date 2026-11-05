'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../../components/RouteIslandSkeleton';

const EditAdClient = dynamic(() => import('./EditAdClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} panels={2} />,
});

export default function EditAdIsland() {
  return <EditAdClient />;
}
