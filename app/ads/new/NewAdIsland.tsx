'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const AdEditor = dynamic(() => import('../components/AdEditor'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} panels={2} />,
});

export default function NewAdIsland() {
  return <AdEditor />;
}
