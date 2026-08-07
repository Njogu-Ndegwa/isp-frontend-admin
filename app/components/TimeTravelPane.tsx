'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Drag-to-pan wrapper for a time-series chart.
 *
 * Dragging right walks the window backwards in time (the chart content follows
 * your finger, so the past slides in from the left) and dragging left walks it
 * forward again. It snaps a whole window per gesture rather than scrolling
 * continuously: every position is a separate server request, and whole-window
 * steps are also how the periods are actually reasoned about -- "this month vs
 * last month", not "the 23 days ending Tuesday".
 *
 * Offset 0 is the live window and is a hard forward stop; you cannot pan into
 * the future.
 */

/** Fraction of the card's width a drag must cover before it commits a step. */
export const COMMIT_FRACTION = 0.25;
/** Past this, extra travel stops moving the card -- a rubber-band edge stop. */
const RESIST_PX = 90;
/** Floor for the commit threshold, so narrow cards stay draggable. */
const MIN_COMMIT_PX = 40;

/**
 * Resolve a finished drag into the offset it should land on.
 *
 * Content follows the finger, so dragging *right* pulls earlier data into
 * view (offset increases) and dragging left returns towards the present.
 * Returns the current offset unchanged when the gesture was too small to
 * count or would run past either end.
 */
export function resolveDragOffset(
  travelledPx: number,
  widthPx: number,
  offset: number,
  maxOffset: number,
): number {
  const threshold = Math.max(widthPx * COMMIT_FRACTION, MIN_COMMIT_PX);
  if (!Number.isFinite(travelledPx) || Math.abs(travelledPx) < threshold) return offset;
  const next = offset + (travelledPx > 0 ? 1 : -1);
  return Math.min(Math.max(next, 0), Math.max(maxOffset, 0));
}

interface Props {
  offset: number;
  maxOffset: number;
  onOffsetChange: (next: number) => void;
  /** Suppresses gestures while a fetch is in flight for the current window. */
  disabled?: boolean;
  children: React.ReactNode;
}

export default function TimeTravelPane({
  offset,
  maxOffset,
  onOffsetChange,
  disabled = false,
  children,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number | null>(null);
  const widthRef = useRef(1);
  const [dragPx, setDragPx] = useState(0);
  const [dragging, setDragging] = useState(false);

  const atPresent = offset <= 0;
  const atOldest = offset >= maxOffset;

  const step = useCallback(
    (delta: number) => {
      const next = Math.min(Math.max(offset + delta, 0), maxOffset);
      if (next !== offset) onOffsetChange(next);
    },
    [offset, maxOffset, onOffsetChange],
  );

  const endDrag = useCallback(
    (clientX: number | null) => {
      const startX = startXRef.current;
      startXRef.current = null;
      setDragging(false);
      setDragPx(0);
      if (startX === null || clientX === null) return;

      const next = resolveDragOffset(clientX - startX, widthRef.current, offset, maxOffset);
      if (next !== offset) onOffsetChange(next);
    },
    [offset, maxOffset, onOffsetChange],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Let the tooltip/legend keep working with a plain click; only the primary
    // button starts a pan.
    if (disabled || e.button !== 0) return;
    startXRef.current = e.clientX;
    widthRef.current = hostRef.current?.clientWidth || 1;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const startX = startXRef.current;
    if (startX === null) return;
    const raw = e.clientX - startX;
    // Rubber-band at the two ends so the stop is felt rather than just refused.
    const blocked = (raw < 0 && atPresent) || (raw > 0 && atOldest);
    setDragPx(blocked ? Math.sign(raw) * Math.min(Math.abs(raw), RESIST_PX) * 0.25 : raw);
  };

  // A pointer released outside the card still has to end the gesture, or the
  // chart stays stuck mid-drag.
  useEffect(() => {
    if (!dragging) return;
    const up = (e: PointerEvent) => endDrag(e.clientX);
    const cancel = () => endDrag(null);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
  }, [dragging, endDrag]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(-1); }
    else if (e.key === 'Home') { e.preventDefault(); onOffsetChange(0); }
  };

  return (
    <div
      ref={hostRef}
      role="group"
      aria-label="Chart history — drag or use arrow keys to move through time"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
      className={`relative select-none outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-accent-primary/40 ${
        disabled ? '' : dragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      // Vertical scrolling must still work on touch; only horizontal is ours.
      style={{ touchAction: 'pan-y' }}
    >
      <div
        style={{
          transform: `translateX(${dragPx}px)`,
          transition: dragging ? 'none' : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        {children}
      </div>

      {/* Drag affordance — only while a gesture is live, so it never competes
          with the chart itself for attention. */}
      {dragging && (
        <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-background-tertiary/90 text-foreground-muted">
            {dragPx > 0 ? 'Release for the earlier period' : dragPx < 0 ? 'Release for the later period' : 'Drag right for older'}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * The ‹ › / "Now" cluster that sits in a chart card header.
 *
 * Kept separate from the drag surface because the header renders outside the
 * pane -- and because a drag gesture alone is not discoverable or accessible.
 */
export function TimeTravelNav({
  offset,
  maxOffset,
  windowLabel,
  onOffsetChange,
  disabled = false,
}: {
  offset: number;
  maxOffset: number;
  windowLabel?: string;
  onOffsetChange: (next: number) => void;
  disabled?: boolean;
}) {
  const atPresent = offset <= 0;
  const btn = 'w-6 h-6 grid place-items-center rounded-md border text-foreground-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:border-border-hover enabled:hover:text-foreground border-border';

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onOffsetChange(Math.min(offset + 1, maxOffset))}
        disabled={disabled || offset >= maxOffset}
        className={btn}
        aria-label="Earlier period"
        title="Earlier period"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onOffsetChange(Math.max(offset - 1, 0))}
        disabled={disabled || atPresent}
        className={btn}
        aria-label="Later period"
        title="Later period"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {!atPresent && (
        <button
          type="button"
          onClick={() => onOffsetChange(0)}
          disabled={disabled}
          className="text-[10px] px-2 py-1 rounded-lg border border-accent-primary/30 bg-accent-primary/10 text-accent-primary transition-colors hover:bg-accent-primary/20"
          title={windowLabel ? `Showing ${windowLabel} — back to the current period` : 'Back to the current period'}
        >
          Now
        </button>
      )}
    </div>
  );
}
