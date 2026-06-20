'use client';

import dynamic from 'next/dynamic';

function StoreSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
      <div className="h-8 bg-background-tertiary rounded w-64 mb-4" />
      <div className="h-4 bg-background-tertiary rounded w-96 max-w-full mb-8" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="card overflow-hidden">
            <div className="aspect-square bg-background-tertiary" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-background-tertiary rounded" />
              <div className="h-4 bg-background-tertiary rounded w-2/3" />
              <div className="h-8 bg-background-tertiary rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const StoreClient = dynamic(() => import('./StoreClient'), {
  ssr: false,
  loading: StoreSkeleton,
});

export default function StoreIsland() {
  return <StoreClient />;
}
