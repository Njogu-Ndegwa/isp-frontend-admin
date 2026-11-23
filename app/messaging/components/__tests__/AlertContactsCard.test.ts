import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FR } from '../../../lib/locales/fr';

// Every string the Alert contacts section shows goes through t() and has a
// French translation with the same {placeholders}.
const source = readFileSync(join(__dirname, '..', 'AlertContactsCard.tsx'), 'utf8')
  + readFileSync(join(__dirname, '..', 'AlertsView.tsx'), 'utf8');
const keys = [...source.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'"));
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('Alert contacts strings', () => {
  it('uses t() for its copy', () => {
    expect(keys).toContain('Alert contacts');
    expect(keys).toContain('+ Add mobile number');
    expect(keys).toContain('SMS credits are used for each recipient. Keep at least one mobile number.');
  });

  it.each(keys)('has a French translation: %s', (key) => {
    expect(FR[key], key).toBeTruthy();
    expect(placeholders(FR[key])).toEqual(placeholders(key));
  });
});
