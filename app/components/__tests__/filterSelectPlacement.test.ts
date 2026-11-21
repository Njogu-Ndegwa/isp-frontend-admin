import { describe, expect, it } from 'vitest';
import {
  computeDropdownPlacement,
  DROPDOWN_GAP,
  DROPDOWN_MAX_HEIGHT,
  VIEWPORT_MARGIN,
} from '../filterSelectPlacement';

// 22 options (20 banks + placeholder + Other) at 44px each.
const BANK_LIST_HEIGHT = 22 * 44 + 2;

describe('computeDropdownPlacement', () => {
  it('opens downward with a capped, scrollable height when there is room below', () => {
    const p = computeDropdownPlacement({ top: 100, bottom: 142, left: 20, width: 300 }, { width: 1440, height: 900 }, BANK_LIST_HEIGHT);
    expect(p.direction).toBe('down');
    expect(p.top).toBe(142 + DROPDOWN_GAP);
    expect(p.bottom).toBeUndefined();
    expect(p.maxHeight).toBe(DROPDOWN_MAX_HEIGHT);
  });

  it('flips upward on a phone bottom sheet where the field sits near the bottom', () => {
    // 390x844 phone, Bank select in the lower part of a bottom-sheet modal.
    const p = computeDropdownPlacement({ top: 640, bottom: 682, left: 20, width: 350 }, { width: 390, height: 844 }, BANK_LIST_HEIGHT);
    expect(p.direction).toBe('up');
    expect(p.top).toBeUndefined();
    expect(p.bottom).toBe(844 - 640 + DROPDOWN_GAP);
    expect(p.maxHeight).toBeLessThanOrEqual(640 - DROPDOWN_GAP - VIEWPORT_MARGIN);
  });

  it('never extends past the bottom of the viewport when opening down', () => {
    const vh = 740;
    const p = computeDropdownPlacement({ top: 380, bottom: 422, left: 16, width: 328 }, { width: 360, height: vh }, BANK_LIST_HEIGHT);
    expect(p.direction).toBe('down');
    expect(p.top! + p.maxHeight).toBeLessThanOrEqual(vh - VIEWPORT_MARGIN);
  });

  it('keeps a short list at its natural height', () => {
    const p = computeDropdownPlacement({ top: 100, bottom: 142, left: 20, width: 200 }, { width: 1440, height: 900 }, 3 * 44 + 2);
    expect(p.direction).toBe('down');
    expect(p.maxHeight).toBe(DROPDOWN_MAX_HEIGHT); // cap, content is shorter so it sizes itself
  });

  it('keeps the list inside the viewport horizontally', () => {
    const p = computeDropdownPlacement({ top: 100, bottom: 142, left: 300, width: 80 }, { width: 360, height: 740 }, 200);
    expect(p.left).toBe(360 - 160 - VIEWPORT_MARGIN);
  });
});
