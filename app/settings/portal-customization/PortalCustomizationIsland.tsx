'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const PortalCustomizationClient = dynamic(() => import('./PortalCustomizationClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function PortalCustomizationIsland() {
  return <PortalCustomizationClient />;
}
