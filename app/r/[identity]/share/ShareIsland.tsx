'use client';

import dynamic from 'next/dynamic';

function ShareSkeleton() {
  return (
    <main className="min-h-screen bg-[#fffcf2] text-[#1a1a1a]">
      <div className="max-w-xl mx-auto px-5 py-8 animate-pulse">
        <div className="h-14 rounded-2xl bg-white/80 mb-6" />
        <div className="rounded-3xl bg-white shadow-sm border border-black/5 p-5 space-y-4">
          <div className="h-5 rounded bg-black/10 w-2/3" />
          <div className="h-4 rounded bg-black/10 w-full" />
          <div className="h-12 rounded-2xl bg-black/10" />
          <div className="h-12 rounded-2xl bg-black/10" />
          <div className="h-12 rounded-2xl bg-black/10" />
        </div>
      </div>
    </main>
  );
}

const ShareClient = dynamic(() => import('./ShareClient'), {
  ssr: false,
  loading: ShareSkeleton,
});

export default function ShareIsland() {
  return <ShareClient />;
}
