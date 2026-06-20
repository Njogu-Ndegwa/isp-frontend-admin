'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const TransactionsClient = dynamic(() => import('./TransactionsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function TransactionsIsland() {
  return <TransactionsClient />;
}
