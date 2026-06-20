'use client';

import dynamic from 'next/dynamic';

function ProductDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 animate-pulse">
      <div className="h-4 bg-background-tertiary rounded w-64 mb-6" />
      <div className="grid md:grid-cols-2 gap-10">
        <div className="aspect-square rounded-2xl bg-background-tertiary" />
        <div className="space-y-4">
          <div className="h-3 bg-background-tertiary rounded w-24" />
          <div className="h-8 bg-background-tertiary rounded w-3/4" />
          <div className="h-4 bg-background-tertiary rounded w-32" />
          <div className="h-10 bg-background-tertiary rounded w-40" />
          <div className="h-20 bg-background-tertiary rounded" />
          <div className="h-12 bg-background-tertiary rounded" />
        </div>
      </div>
    </div>
  );
}

const ProductDetailClient = dynamic(() => import('./ProductDetailClient'), {
  ssr: false,
  loading: ProductDetailSkeleton,
});

export default function ProductDetailIsland() {
  return <ProductDetailClient />;
}
