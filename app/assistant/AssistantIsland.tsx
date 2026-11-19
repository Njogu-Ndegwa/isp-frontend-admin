'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const AssistantClient = dynamic(() => import('./AssistantClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function AssistantIsland() {
  return (
    <Suspense fallback={<RouteIslandSkeleton />}>
      <AssistantClient />
    </Suspense>
  );
}
