'use client';

import dynamic from 'next/dynamic';
import { SkeletonCard } from '../../components/LoadingSpinner';

const RevenueOverTimeChart = dynamic(() => import('../../components/RevenueOverTimeChart'), {
  ssr: false,
  loading: () => <SkeletonCard />,
});

export default function RevenueSection({ routerId, enabled }: { routerId: number | null; enabled: boolean }) {
  return <RevenueOverTimeChart routerId={routerId} enabled={enabled} />;
}
