'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const SettingsClient = dynamic(() => import('./SettingsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} />,
});

export default function SettingsIsland() {
  return <SettingsClient />;
}
