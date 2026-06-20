'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../../../components/RouteIslandSkeleton';

const SubscriptionInvoiceDetailClient = dynamic(() => import('./SubscriptionInvoiceDetailClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} panels={2} />,
});

export default function SubscriptionInvoiceDetailIsland() {
  return <SubscriptionInvoiceDetailClient />;
}
