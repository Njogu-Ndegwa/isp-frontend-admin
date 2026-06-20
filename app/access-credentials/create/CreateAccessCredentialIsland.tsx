'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const CreateAccessCredentialClient = dynamic(() => import('./CreateAccessCredentialClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} />,
});

export default function CreateAccessCredentialIsland() {
  return <CreateAccessCredentialClient />;
}
