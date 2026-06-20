'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const ShopClient = dynamic(() => import('./ShopClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function ShopIsland() {
  return <ShopClient />;
}
