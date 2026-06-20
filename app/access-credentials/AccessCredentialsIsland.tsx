'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const AccessCredentialsClient = dynamic(() => import('./AccessCredentialsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function AccessCredentialsIsland() {
  return <AccessCredentialsClient />;
}
