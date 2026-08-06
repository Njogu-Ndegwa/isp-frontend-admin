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

/**
 * How long a window must be settled on before it is fetched.
 *
 * Each of these endpoints aggregates over an unindexed `created_at`, so every
 * one is a full table scan -- cheap in isolation, but dragging through six
 * windows must not leave six scans running on a 1 GB box. Cached windows still
 * render instantly (no request at all); only an uncached window waits, and
 * only for the length of one more drag.
 */
const SETTLE_MS = 180;

/**
 * Cached windows kept per hook instance.
 *
 * Bounded so a long session panning across periods cannot grow without limit.
 * 48 covers more than a full pan to `max_offset` in one period, which is far
 * more history than anyone reads in a sitting.
 */
const MAX_CACHED_WINDOWS = 48;

export interface PannedSeriesState<T> {
  data: T | null;
  loading: boolean;
  /** True once a response has landed for the window being shown. */
  loaded: boolean;
}

export function usePannedSeries<T>(
  fetcher: (period: string, offset: number, signal?: AbortSignal) => Promise<T | null>,
  period: string,
  offset: number,
  options: { enabled?: boolean } = {},
): PannedSeriesState<T> {
  const { enabled = true } = options;

  // The cache is the source of truth and lives in a ref, so the effect can
  // consult it without listing it as a dependency (which would re-run the
  // effect on every landed response). `version` exists only to re-render.
  const cacheRef = useRef(new Map<string, T | null>());
  const [, setVersion] = useState(0);
  // Keys with a request currently in the air. Separate from the cache so an
  // evicted window becomes refetchable rather than being remembered forever.
  const inFlightRef = useRef(new Set<string>());

  // `fetcher` is a dependency, so callers must pass a stable reference
  // (useCallback); an inline arrow would refetch on every render.
  useEffect(() => {
    if (!enabled) return;

    const key = `${period}:${offset}`;
    const cache = cacheRef.current;
    const inFlight = inFlightRef.current;
    // Aborting matters more than the wasted bytes: an in-flight request is a
    // held DB connection running a full scan, and dragging past a window is an
    // explicit signal that nobody is waiting for it any more.
    const controller = new AbortController();
    let cancelled = false;
    let warmTimer: number | undefined;

    const store = (k: string, value: T | null) => {
      cache.set(k, value);
      // Map iterates in insertion order, and the window in view was just
      // written, so dropping from the front never evicts what is on screen.
      while (cache.size > MAX_CACHED_WINDOWS) {
        const oldest = cache.keys().next().value as string | undefined;
        if (oldest === undefined) break;
        cache.delete(oldest);
      }
      setVersion((v) => v + 1);
    };

    const fetchWindow = async (o: number, k: string) => {
      if (inFlight.has(k)) return;
      inFlight.add(k);
      try {
        const result = await fetcher(period, o, controller.signal);
        if (cancelled) return;
        store(k, result);
      } catch {
        // Swallowed: an abort is the user moving on, and a genuine failure
        // leaves the window uncached so revisiting it simply tries again.
      } finally {
        inFlight.delete(k);
      }
    };

    // Debounced so a multi-step drag queries only the window it settles on.
    const settleTimer = window.setTimeout(() => {
      void (async () => {
        // Closed windows are immutable; only the live one is worth re-reading.
        if (offset === 0 || !cache.has(key)) {
          await fetchWindow(offset, key);
          if (cancelled) return;
        }

        // Deferred so four charts' prefetches never race the page's first load.
        const nextKey = `${period}:${offset + 1}`;
        if (cache.has(nextKey)) return;
        warmTimer = window.setTimeout(() => { void fetchWindow(offset + 1, nextKey); }, PREFETCH_DELAY_MS);
      })();
    }, SETTLE_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(settleTimer);
      if (warmTimer !== undefined) window.clearTimeout(warmTimer);
    };
  }, [fetcher, period, offset, enabled]);

  const key = `${period}:${offset}`;
  const landed = enabled && cacheRef.current.has(key);
  return {
    data: landed ? cacheRef.current.get(key) ?? null : null,
    loading: !landed,
    loaded: landed,
  };
}

export default usePannedSeries;
