'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardIsland from '../dashboard/DashboardIsland';
import { captureAttribution } from '../lib/attribution';

export default function DemoEntry() {
  const { isDemo, loginAsDemo } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Preserve the ad click before initializing the public demo. The global
    // attribution component also records it, but doing it here avoids relying
    // on sibling effect ordering during the immediate client-side transition.
    captureAttribution();
    loginAsDemo();
  }, [loginAsDemo]);

  if (isDemo) {
    return <DashboardIsland />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" role="status" aria-live="polite">
      <div className="text-center">
        <div className="w-10 h-10 mx-auto border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        <h1 className="mt-4 text-lg font-semibold text-foreground">Opening the Bitwave demo</h1>
        <p className="mt-1 text-sm text-foreground-muted">Loading the dashboard with sample ISP data…</p>
      </div>
    </div>
  );
}
