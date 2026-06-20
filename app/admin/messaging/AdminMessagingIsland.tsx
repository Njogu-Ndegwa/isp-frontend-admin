'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const AdminMessagingClient = dynamic(() => import('./AdminMessagingClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function AdminMessagingIsland() {
  return <AdminMessagingClient />;
}
