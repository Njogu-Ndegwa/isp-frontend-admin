'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';

const PaymentMethodsClient = dynamic(() => import('./PaymentMethodsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton />,
});

export default function PaymentMethodsIsland() {
  return <PaymentMethodsClient />;
}
