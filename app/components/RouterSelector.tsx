'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Router } from '../lib/types';

interface RouterSelectorProps {
  selectedRouterId: number | null;
  onRouterChange: (routerId: number | null) => void;
  onRoutersLoaded?: (routers: Router[]) => void;
  userId?: number;
  /** Stretch the control to fill its container below the `md` breakpoint (used in the dashboard toolbar). */
  fullWidthOnMobile?: boolean;
}

export default function RouterSelector({
  selectedRouterId,
  onRouterChange,
  onRoutersLoaded,
  userId = 1,
  fullWidthOnMobile = false,
}: RouterSelectorProps) {
  const [routers, setRouters] = useState<Router[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rootClass = `flex items-center gap-2${fullWidthOnMobile ? ' w-full md:w-auto' : ''}`;

  useEffect(() => {
    const loadRouters = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getRoutersByUserId(userId);
        setRouters(data);
        onRoutersLoaded?.(data);
        if (data.length > 0 && !selectedRouterId) {
          onRouterChange(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load routers');
        onRoutersLoaded?.([]);
      } finally {
        setLoading(false);
      }
    };

    loadRouters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading) {
    return (
      <div className={rootClass}>
        <span className="text-foreground-muted text-sm flex-none">Router:</span>
        <div className={`h-9 skeleton rounded-lg ${fullWidthOnMobile ? 'flex-1 md:flex-none md:w-40' : 'w-40'}`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={rootClass}>
        <span className="text-foreground-muted text-sm flex-none">Router:</span>
        <span className="text-xs text-red-400 truncate">{error}</span>
      </div>
    );
  }

  if (routers.length === 0) {
    return (
      <div className={rootClass}>
        <span className="text-foreground-muted text-sm flex-none">Router:</span>
        <span className="text-xs text-foreground-muted truncate">No routers configured</span>
      </div>
    );
  }

  return (
    <div className={rootClass}>
      <span className="text-foreground-muted text-sm flex-none">Router:</span>
      <div className={`relative ${fullWidthOnMobile ? 'flex-1 md:flex-none' : ''}`}>
        <select
          value={selectedRouterId ?? ''}
          onChange={(e) => {
            const value = e.target.value;
            if (value) onRouterChange(parseInt(value, 10));
          }}
          className={`appearance-none px-3 py-2 pr-8 text-sm bg-background-tertiary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer min-w-[160px] ${fullWidthOnMobile ? 'w-full md:w-auto' : ''}`}
        >
          {routers.map((router) => (
            <option key={router.id} value={router.id}>
              {router.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <svg
            className="h-4 w-4 text-foreground-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
