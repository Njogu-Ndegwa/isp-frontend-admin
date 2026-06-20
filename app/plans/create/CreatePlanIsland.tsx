'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const CreatePlanClient = dynamic(() => import('./CreatePlanClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} />,
});

export default function CreatePlanIsland() {
  return <CreatePlanClient />;
}
