'use client';

import dynamic from 'next/dynamic';

function CheckoutSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
      <div className="h-8 bg-background-tertiary rounded w-48 mb-6" />
      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="card p-5 space-y-4">
          <div className="h-5 bg-background-tertiary rounded w-40" />
          <div className="h-14 bg-background-tertiary rounded" />
          <div className="h-14 bg-background-tertiary rounded" />
          <div className="h-14 bg-background-tertiary rounded" />
        </div>
        <div className="card p-5 space-y-4">
          <div className="h-5 bg-background-tertiary rounded w-32" />
          <div className="h-4 bg-background-tertiary rounded" />
          <div className="h-10 bg-background-tertiary rounded" />
        </div>
      </div>
    </div>
  );
}

const CheckoutClient = dynamic(() => import('./CheckoutClient'), {
  ssr: false,
  loading: CheckoutSkeleton,
});

export default function CheckoutIsland() {
  return <CheckoutClient />;
}
