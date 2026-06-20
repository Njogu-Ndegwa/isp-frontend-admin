'use client';

import dynamic from 'next/dynamic';

function LoginSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8 animate-pulse">
        <div className="h-8 bg-background-tertiary rounded w-40 mx-auto mb-3" />
        <div className="h-4 bg-background-tertiary rounded w-64 mx-auto mb-8" />
        <div className="space-y-4">
          <div className="h-12 bg-background-tertiary rounded-xl" />
          <div className="h-12 bg-background-tertiary rounded-xl" />
          <div className="h-12 bg-background-tertiary rounded-xl" />
        </div>
      </div>
    </div>
  );
}

const LoginClient = dynamic(() => import('./LoginClient'), {
  ssr: false,
  loading: LoginSkeleton,
});

export default function LoginIsland() {
  return <LoginClient />;
}
