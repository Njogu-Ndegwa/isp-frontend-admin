'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const ProfileSettingsClient = dynamic(() => import('./ProfileSettingsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} panels={2} />,
});

export default function ProfileSettingsIsland() {
  return <ProfileSettingsClient />;
}
