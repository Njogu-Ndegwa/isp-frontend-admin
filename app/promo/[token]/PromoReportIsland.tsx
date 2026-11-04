'use client';

import dynamic from 'next/dynamic';

const PromoReportClient = dynamic(() => import('./PromoReportClient'), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto h-64 max-w-xl animate-pulse rounded-2xl bg-background-secondary" />
    </main>
  ),
});

export default function PromoReportIsland() {
  return <PromoReportClient />;
}
