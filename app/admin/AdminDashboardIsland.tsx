'use client';

import dynamic from 'next/dynamic';

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 bg-background-tertiary rounded w-56 mb-2" />
        <div className="h-4 bg-background-tertiary rounded w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card h-28 bg-background-secondary" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card h-80 bg-background-secondary" />
        <div className="card h-80 bg-background-secondary" />
      </div>
    </div>
  );
}

const AdminDashboardClient = dynamic(() => import('./AdminDashboardClient'), {
  ssr: false,
  loading: AdminDashboardSkeleton,
});

export default function AdminDashboardIsland() {
  return <AdminDashboardClient />;
}
