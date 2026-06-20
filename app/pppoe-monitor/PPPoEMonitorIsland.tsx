'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const PPPoEMonitorClient = dynamic(() => import('./PPPoEMonitorClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function PPPoEMonitorIsland() {
  return <PPPoEMonitorClient />;
}
