'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const DiagnosticsClient = dynamic(() => import('./DiagnosticsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function DiagnosticsIsland() {
  return <DiagnosticsClient />;
}
