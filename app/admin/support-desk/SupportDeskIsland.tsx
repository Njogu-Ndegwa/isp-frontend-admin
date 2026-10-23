'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const SupportDeskClient = dynamic(() => import('./SupportDeskClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function SupportDeskIsland() {
  return <SupportDeskClient />;
}
