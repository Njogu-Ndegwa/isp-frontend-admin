import { describe, expect, it } from 'vitest';
import { ANTI_TETHER_HELP, antiTetherToggleLabel } from '../antiTether';

describe('anti-tethering toggle label', () => {
  it('explains what it does in one line', () => {
    expect(ANTI_TETHER_HELP).toBe(
      'Blocks customers sharing their plan via phone hotspot or their own router',
    );
    expect(ANTI_TETHER_HELP).not.toContain('\n');
  });

  it('says the current state and the action, plus the explanation', () => {
    expect(antiTetherToggleLabel(true)).toBe(
      'Anti-tethering on (click to turn off). Blocks customers sharing their plan via phone hotspot or their own router',
    );
    expect(antiTetherToggleLabel(false)).toContain('Anti-tethering off (click to turn on).');
    expect(antiTetherToggleLabel(undefined)).toContain(ANTI_TETHER_HELP);
  });
});
