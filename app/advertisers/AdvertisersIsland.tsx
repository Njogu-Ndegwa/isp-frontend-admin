'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const AdvertisersClient = dynamic(() => import('./AdvertisersClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function AdvertisersIsland() {
  return <AdvertisersClient />;
}
