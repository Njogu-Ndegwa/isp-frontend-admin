// Dictionaries load on demand in the app (app/lib/i18n.ts). Tests translate
// synchronously, so load every language before any test runs.
import { loadLanguage } from './app/lib/i18n';

await loadLanguage('fr');
