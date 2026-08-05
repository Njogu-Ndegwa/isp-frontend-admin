'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Loads one window of a time series that can be panned back through history.
 *
 * Two behaviours make the drag gesture feel like scrolling rather than like
 * submitting a form:
 *
 * * **Closed windows are cached.** A window that has already ended does not
 *   change, so re-visiting it is free. The live window (offset 0) is always
 *   refetched -- "Now" has to mean now -- but it keeps showing the previous
 *   result while it does, so returning to the present never flashes a skeleton.
 * * **The next window back is prefetched.** Panning is overwhelmingly
 *   one-directional, so once a window settles we quietly warm the one behind
 *   it and the following drag resolves out of cache.
 *
 * Results are stored per window key rather than as a single "current" value,
 * which is also what makes fast dragging safe: several requests may be in
 * flight, each writes only its own key, and render always reads the key the
 * user is actually looking at. A slow response can never overwrite a fast one.
 */

/** Quiet gap before warming the next window, to stay clear of the page load. */
const PREFETCH_DELAY_MS = 1200;

export interface PannedSeriesState<T> {
  data: T | null;
  loading: boolean;
  /** True once a response has landed for the window being shown. */
  loaded: boolean;
}

export function usePannedSeries<T>(
  fetcher: (period: string, offset: number) => Promise<T | null>,
  period: string,
  offset: number,
  options: { enabled?: boolean } = {},
): PannedSeriesState<T> {
  const { enabled = true } = options;

  const [cache, setCache] = useState<Record<string, T | null>>({});
  // Which keys have been requested, as opposed to which have landed. Kept in a
  // ref so re-requesting is decided without re-running this effect.
  const requestedRef = useRef(new Set<string>());

  // `fetcher` is a dependency, so callers must pass a stable reference
  // (useCallback); an inline arrow would refetch on every render.
  useEffect(() => {
    if (!enabled) return;

    const key = `${period}:${offset}`;
    const requested = requestedRef.current;
    let cancelled = false;
    let warmTimer: number | undefined;

    void (async () => {
      // Closed windows are immutable; only the live one is worth re-reading.
      if (offset === 0 || !requested.has(key)) {
        requested.add(key);
        const result = await fetcher(period, offset).catch(() => null);
        if (cancelled) return;
        setCache((prev) => ({ ...prev, [key]: result }));
      }

      // Deferred so four charts' prefetches never race the page's first load.
      const nextKey = `${period}:${offset + 1}`;
      if (requested.has(nextKey)) return;
      warmTimer = window.setTimeout(() => {
        requested.add(nextKey);
        void fetcher(period, offset + 1)
          .catch(() => null)
          .then((warmed) => {
            if (cancelled) return;
            setCache((prev) => ({ ...prev, [nextKey]: warmed ?? null }));
          });
      }, PREFETCH_DELAY_MS);
    })();

    return () => {
      cancelled = true;
      if (warmTimer !== undefined) window.clearTimeout(warmTimer);
    };
  }, [fetcher, period, offset, enabled]);

  const key = `${period}:${offset}`;
  const landed = enabled && Object.prototype.hasOwnProperty.call(cache, key);
  return {
    data: landed ? cache[key] : null,
    loading: !landed,
    loaded: landed,
  };
}

export default usePannedSeries;
