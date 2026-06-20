'use client';

import dynamic from 'next/dynamic';

function ResellersSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div>
        <div className="h-8 bg-background-tertiary rounded w-48 mb-2" />
        <div className="h-4 bg-background-tertiary rounded w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card h-24 bg-background-secondary" />
        ))}
      </div>
      <div className="card h-96 bg-background-secondary" />
    </div>
  );
}

const ResellersClient = dynamic(() => import('./ResellersClient'), {
  ssr: false,
  loading: ResellersSkeleton,
});

export default function ResellersIsland() {
  return <ResellersClient />;
}
