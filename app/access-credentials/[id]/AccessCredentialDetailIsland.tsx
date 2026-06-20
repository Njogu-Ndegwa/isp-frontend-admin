'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const AccessCredentialDetailClient = dynamic(() => import('./AccessCredentialDetailClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} panels={2} />,
});

export default function AccessCredentialDetailIsland() {
  return <AccessCredentialDetailClient />;
}
