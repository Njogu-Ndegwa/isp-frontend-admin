'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { Router } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useT } from '../lib/i18n';
import {
  pickDefaultRouterId,
  readRememberedRouterId,
  rememberRouterId,
  routerOptionLabel,
} from '../lib/routerPick';

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
  const { user } = useAuth();
  const t = useT();
  const memoryKey = user?.id ?? null;

  const rootClass = `flex items-center gap-2${fullWidthOnMobile ? ' w-full md:w-auto' : ''}`;

  // Router the page was given before the list arrived: the parent's own
  // selection, or the one this user had last time. Pages load their
  // router-scoped data as soon as an id is set, so starting from the
  // remembered router saves a full round trip (the router list) per visit.
  const earlyPick = useRef<{ fromMemory: boolean; id: number | null } | null>(null);
  if (earlyPick.current === null) {
    // No user id yet (auth still loading) = no memory to use: behave as before.
    const remembered = selectedRouterId == null && memoryKey != null ? readRememberedRouterId(memoryKey) : null;
    earlyPick.current = { fromMemory: remembered != null, id: selectedRouterId ?? remembered };
  }

  useEffect(() => {
    const early = earlyPick.current;
    if (early?.fromMemory && early.id != null) onRouterChange(early.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  useEffect(() => {
    const loadRouters = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getRoutersByUserId(userId);
        setRouters(data);
        onRoutersLoaded?.(data);
        const early = earlyPick.current;
        const parentChose = selectedRouterId != null && !early?.fromMemory;
        if (!parentChose) {
          // Keep the remembered router if it still exists, else the usual default.
          const defaultId = pickDefaultRouterId(data, readRememberedRouterId(memoryKey));
          if (defaultId !== (early?.fromMemory ? early.id : null)) onRouterChange(defaultId);
          // Remember the default too, so the next visit starts early.
          if (defaultId != null && memoryKey != null) rememberRouterId(memoryKey, defaultId);
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

  const selectedStatus = routers.find((r) => r.id === selectedRouterId)?.status;
  // Same colours as router status elsewhere (OpsHealthLookback, RoutersClient).
  const dotClass =
    selectedStatus === 'online' ? 'bg-emerald-500' : selectedStatus === 'offline' ? 'bg-red-500' : null;

  return (
    <div className={rootClass}>
      <span className="text-foreground-muted text-sm flex-none">Router:</span>
      <div className={`relative ${fullWidthOnMobile ? 'flex-1 md:flex-none' : ''}`}>
        {dotClass && (
          <span
            aria-hidden="true"
            data-testid="router-status-dot"
            className={`pointer-events-none absolute z-10 left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${dotClass}`}
          />
        )}
        <select
          value={selectedRouterId ?? ''}
          onChange={(e) => {
            const value = e.target.value;
            if (!value) return;
            const id = parseInt(value, 10);
            rememberRouterId(memoryKey, id);
            onRouterChange(id);
          }}
          className={`appearance-none ${dotClass ? 'pl-7' : 'pl-3'} pr-8 py-2 text-sm bg-background-tertiary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer min-w-[160px] ${fullWidthOnMobile ? 'w-full md:w-auto' : ''}`}
        >
          {routers.map((router) => (
            <option key={router.id} value={router.id}>
              {routerOptionLabel(router, routers, t, { statusGlyph: false })}
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
