import { describe, it, expect } from 'vitest';
import { resolveDragOffset, COMMIT_FRACTION } from '../TimeTravelPane';

const WIDTH = 600;
const COMMIT = WIDTH * COMMIT_FRACTION; // 150px

describe('resolveDragOffset', () => {
  it('ignores a drag too small to be intentional', () => {
    expect(resolveDragOffset(COMMIT - 1, WIDTH, 3, 36)).toBe(3);
    expect(resolveDragOffset(-(COMMIT - 1), WIDTH, 3, 36)).toBe(3);
    expect(resolveDragOffset(0, WIDTH, 3, 36)).toBe(3);
  });

  it('walks back in time when the content is dragged right', () => {
    expect(resolveDragOffset(COMMIT + 1, WIDTH, 0, 36)).toBe(1);
    expect(resolveDragOffset(400, WIDTH, 5, 36)).toBe(6);
  });

  it('walks forward in time when the content is dragged left', () => {
    expect(resolveDragOffset(-(COMMIT + 1), WIDTH, 4, 36)).toBe(3);
  });

  it('commits exactly one window however far the drag travels', () => {
    // Snapping is the whole point: a long flick must not skip six months.
    expect(resolveDragOffset(5000, WIDTH, 2, 36)).toBe(3);
    expect(resolveDragOffset(-5000, WIDTH, 2, 36)).toBe(1);
  });

  it('refuses to pan into the future', () => {
    expect(resolveDragOffset(-1000, WIDTH, 0, 36)).toBe(0);
  });

  it('stops at the oldest window it is allowed to load', () => {
    expect(resolveDragOffset(1000, WIDTH, 36, 36)).toBe(36);
  });

  it('treats a chart with no history as fixed to the present', () => {
    // `all` reports max_offset 0 -- it already spans everything.
    expect(resolveDragOffset(1000, WIDTH, 0, 0)).toBe(0);
  });

  it('keeps narrow cards draggable via the minimum threshold', () => {
    // 25% of 80px is 20px, below the 40px floor, so 30px must not commit.
    expect(resolveDragOffset(30, 80, 0, 36)).toBe(0);
    expect(resolveDragOffset(50, 80, 0, 36)).toBe(1);
  });

  it('survives a zero-width host without committing a phantom step', () => {
    expect(resolveDragOffset(10, 0, 2, 36)).toBe(2);
  });
});
