'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Router } from '../lib/types';

interface RouterSelectorProps {
  selectedRouterId: number | null;
  onRouterChange: (routerId: number | null) => void;
  onRoutersLoaded?: (routers: Router[]) => void;
  userId?: number;
}

export default function RouterSelector({
  selectedRouterId,
  onRouterChange,
  onRoutersLoaded,
  userId = 1,
}: RouterSelectorProps) {
  const [routers, setRouters] = useState<Router[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex items-center gap-2">
        <span className="text-foreground-muted text-sm">Router:</span>
        <div className="h-9 w-40 skeleton rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-foreground-muted text-sm">Router:</span>
        <span className="text-xs text-red-400">{error}</span>
      </div>
    );
  }

  if (routers.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-foreground-muted text-sm">Router:</span>
        <span className="text-xs text-foreground-muted">No routers configured</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-foreground-muted text-sm">Router:</span>
      <div className="relative">
        <select
          value={selectedRouterId ?? ''}
          onChange={(e) => {
            const value = e.target.value;
            if (value) onRouterChange(parseInt(value, 10));
          }}
          className="appearance-none px-3 py-2 pr-8 text-sm bg-background-tertiary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer min-w-[160px]"
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
