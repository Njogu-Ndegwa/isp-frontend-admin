'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const MessagingClient = dynamic(() => import('./MessagingClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function MessagingIsland() {
  return <MessagingClient />;
}
