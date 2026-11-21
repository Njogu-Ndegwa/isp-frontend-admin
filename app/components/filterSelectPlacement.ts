/**
 * Where FilterSelect's dropdown goes, given the trigger's rect and the viewport.
 *
 * The list opens below the trigger when it fits. When the space below is short
 * (a bottom-sheet modal on a phone puts the field near the bottom of the screen)
 * it flips above if there is more room there. Either way it gets a max height
 * that keeps it on screen, so a long list scrolls inside itself instead of
 * running off the bottom.
 */

export interface TriggerRect {
  top: number;
  bottom: number;
  left: number;
  width: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface DropdownPlacement {
  /** Set when the list opens downward. */
  top?: number;
  /** Set when the list opens upward: distance from the viewport's bottom edge. */
  bottom?: number;
  left: number;
  minWidth: number;
  maxHeight: number;
  direction: 'down' | 'up';
}

/** Gap between the trigger and the list. */
export const DROPDOWN_GAP = 6;
/** Space kept clear between the list and the viewport edges. */
export const VIEWPORT_MARGIN = 8;
/** Tallest the list gets even when the screen has room for more. */
export const DROPDOWN_MAX_HEIGHT = 320;
/** Below this much room underneath, prefer opening upward if above is bigger. */
const MIN_COMFORTABLE_HEIGHT = 200;

export function computeDropdownPlacement(
  rect: TriggerRect,
  viewport: Viewport,
  /** Height the list would take with no cap (row count x row height). */
  contentHeight: number,
): DropdownPlacement {
  const dropdownWidth = Math.max(rect.width, 160);
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(rect.left, viewport.width - dropdownWidth - VIEWPORT_MARGIN),
  );

  const spaceBelow = viewport.height - rect.bottom - DROPDOWN_GAP - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - DROPDOWN_GAP - VIEWPORT_MARGIN;
  const wanted = Math.min(contentHeight, DROPDOWN_MAX_HEIGHT);

  const fitsBelow = spaceBelow >= wanted || spaceBelow >= MIN_COMFORTABLE_HEIGHT;
  const direction: 'down' | 'up' = fitsBelow || spaceBelow >= spaceAbove ? 'down' : 'up';
  const available = direction === 'down' ? spaceBelow : spaceAbove;
  // Never collapse to nothing, even on a tiny viewport.
  const maxHeight = Math.max(120, Math.min(DROPDOWN_MAX_HEIGHT, available));

  return direction === 'down'
    ? { top: rect.bottom + DROPDOWN_GAP, left, minWidth: rect.width, maxHeight, direction }
    : { bottom: viewport.height - rect.top + DROPDOWN_GAP, left, minWidth: rect.width, maxHeight, direction };
}
