'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const AssistantSupportClient = dynamic(() => import('./AssistantSupportClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function AssistantSupportIsland() {
  return <AssistantSupportClient />;
}
