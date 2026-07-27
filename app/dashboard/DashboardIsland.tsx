'use client';

import dynamic from 'next/dynamic';

// Mirrors the real dashboard layout (sticky toolbar → KPI strip → 12-col bento
// grid) so the loading state doesn't flash a different shape before hydration.
function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-pulse">
      {/* Toolbar: title (left) + router/period/refresh (right) */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border pb-3">
        <div className="h-7 w-36 bg-background-tertiary rounded" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-36 bg-background-tertiary rounded-lg" />
          <div className="h-9 w-60 bg-background-tertiary rounded-lg hidden sm:block" />
          <div className="h-9 w-24 bg-background-tertiary rounded-lg" />
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card p-5 h-32 bg-background-secondary" />
        ))}
      </div>

      {/* Bento grid: Revenue 8 + Plans 4, then 6 + 6 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
        <div className="xl:col-span-8 card h-80 bg-background-secondary" />
        <div className="xl:col-span-4 card h-80 bg-background-secondary" />
        <div className="xl:col-span-6 card h-80 bg-background-secondary" />
        <div className="xl:col-span-6 card h-80 bg-background-secondary" />
      </div>
    </div>
  );
}

const DashboardClient = dynamic(() => import('./DashboardClient'), {
  ssr: false,
  loading: DashboardSkeleton,
});

export default function DashboardIsland() {
  return <DashboardClient />;
}
