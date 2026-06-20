'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const AdminSettingsClient = dynamic(() => import('./AdminSettingsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} />,
});

export default function AdminSettingsIsland() {
  return <AdminSettingsClient />;
}
