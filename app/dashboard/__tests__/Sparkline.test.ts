import { describe, it, expect } from 'vitest';
import { sparklinePoints } from '../components/Sparkline';

describe('sparklinePoints', () => {
  it('returns empty for <2 points', () => {
    expect(sparklinePoints([], 100, 20)).toBe('');
    expect(sparklinePoints([5], 100, 20)).toBe('');
  });
  it('maps an ascending series with inverted y (first highest y, last y=0)', () => {
    const pts = sparklinePoints([0, 10], 100, 20).split(' ');
    expect(pts).toHaveLength(2);
    expect(pts[0]).toBe('0,20');   // min value -> bottom
    expect(pts[1]).toBe('100,0');  // max value -> top
  });
  it('renders a flat series at vertical center', () => {
    expect(sparklinePoints([5, 5, 5], 100, 20)).toBe('0,10 50,10 100,10');
  });
});
