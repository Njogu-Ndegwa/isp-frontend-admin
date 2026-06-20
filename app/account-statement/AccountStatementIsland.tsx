'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../components/RouteIslandSkeleton';

const AccountStatementClient = dynamic(() => import('./AccountStatementClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function AccountStatementIsland() {
  return <AccountStatementClient />;
}
