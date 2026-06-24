import { describe, it, expect } from 'vitest';
import { bulletStatus } from '../components/BulletBar';

describe('bulletStatus', () => {
  it('normal below warning', () => expect(bulletStatus(50, 60, 80)).toBe('normal'));
  it('warning at/above warning, below danger', () => {
    expect(bulletStatus(60, 60, 80)).toBe('warning');
    expect(bulletStatus(79, 60, 80)).toBe('warning');
  });
  it('critical at/above danger', () => expect(bulletStatus(80, 60, 80)).toBe('critical'));
});
