import { describe, expect, it } from 'vitest';
import { DICTIONARIES, loadLanguage, translate } from '../i18n';
import { FR } from '../locales/fr';

describe('on-demand dictionaries', () => {
  it('loads French (vitest.setup.ts preloads it) and translates with it', async () => {
    await loadLanguage('fr');
    const [key, value] = Object.entries(FR).find(([k, v]) => k !== v && !k.includes('{'))!;
    expect(DICTIONARIES.fr).toBe(FR);
    expect(translate('fr', key)).toBe(value);
  });

  it('is a no-op for English and unknown languages', async () => {
    await expect(loadLanguage('en')).resolves.toBeUndefined();
    await expect(loadLanguage('sw')).resolves.toBeUndefined();
    expect(DICTIONARIES.en).toBeUndefined();
    expect(translate('sw', 'Customers')).toBe('Customers');
  });

  it('accepts any letter case and loads once', async () => {
    await Promise.all([loadLanguage('FR'), loadLanguage('fr')]);
    expect(DICTIONARIES.fr).toBe(FR);
  });
});
