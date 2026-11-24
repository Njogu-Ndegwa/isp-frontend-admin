import { describe, expect, it } from 'vitest';
import data from '../assistantIntents.json';
import catalog from './fixtures/assistantCatalogGets.json';
import { DISPLAY_RULES, displayFor, displayRuleFor } from '../assistantTables';

/*
 * The same question always gets the same kind of display. Each case is a real question
 * of 19-24 Nov (paraphrased), the route the assistant read and the display the model
 * asked for; the page must draw what the intent's route draws, whatever the model asked.
 * Add a case: one line in app/lib/assistantIntents.json.
 */

type Case = { intent: string; q: string; call: string; query?: Record<string, unknown>; seen: string; expect?: string; wrong_route?: boolean };
type Intent = { label: string; route: string; query?: Record<string, unknown>; display: string };
const intents = data.intents as Record<string, Intent>;
const cases = data.cases as Case[];
const pathOf = (call: string) => call.replace(/^GET\s+/, '');
const concrete = (template: string) => template.replace(/\{mac_address\}/g, '02:00:00:00:00:01').replace(/\{[^}]+\}/g, '7');

describe('every intent', () => {
  for (const [name, it_] of Object.entries(intents)) {
    it(`${name}: its route draws as ${it_.display}, whatever the hint`, () => {
      for (const hint of ['auto', 'table', 'card', 'tiles', 'trend', 'bars', 'share']) {
        const shown = displayFor(concrete(pathOf(it_.route)), it_.query ?? {}, hint);
        // a chart route may be read as a table when that is asked; nothing else moves it
        if (hint === 'table' && ['trend', 'bars'].includes(it_.display)) expect(shown).toBe('table');
        else if (hint !== it_.display && displayRuleFor(concrete(pathOf(it_.route)))?.allow?.includes(hint as never)) expect(shown).toBe(hint);
        else expect(shown, `${name} with show=${hint}`).toBe(it_.display);
      }
    });
  }
});

describe('the questions of 19-24 Nov', () => {
  for (const c of cases) {
    it(`${c.intent}: "${c.q}" (${c.call}, show=${c.seen})`, () => {
      expect(intents[c.intent], `unknown intent ${c.intent}`).toBeDefined();
      const want = c.expect ?? intents[c.intent].display;
      expect(displayFor(pathOf(c.call), c.query ?? {}, c.seen)).toBe(want);
    });
  }

  it('cover every intent, and about 40-60 questions', () => {
    for (const name of Object.keys(intents)) expect(cases.some((c) => c.intent === name), name).toBe(true);
    expect(cases.length).toBeGreaterThanOrEqual(40);
  });

  it('never name a person, a phone or a MAC other than the made-up 02:00:… ones', () => {
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/\b(07|01|2547|2541)\d{7,8}\b/);
    expect(text.match(/\b([0-9A-F]{2}:){5}[0-9A-F]{2}\b/gi)?.every((m) => m.startsWith('02:00:00')) ?? true).toBe(true);
  });
});

describe('the display rules', () => {
  const templates = new Set((catalog as { template: string }[]).map((r) => r.template));
  it('name only routes the assistant can read', () => {
    for (const rule of DISPLAY_RULES) for (const p of rule.paths) expect(templates.has(p), p).toBe(true);
  });

  it('give every intent route a rule', () => {
    for (const [name, it_] of Object.entries(intents)) expect(displayRuleFor(concrete(pathOf(it_.route))), name).not.toBeNull();
  });

  it('keep the server-made login card and a lookup that is not drawn', () => {
    expect(displayFor('/api/customers/7/pppoe-credentials', {}, 'pppoe_login')).toBe('pppoe_login');
    expect(displayFor('/api/customers', {}, 'none')).toBe('none');
  });

  it('leave a route without a rule to the hint', () => {
    expect(displayFor('/api/something/new', {}, 'bars')).toBe('bars');
  });

  it('decide one route that serves two intents by its query', () => {
    expect(displayFor('/api/mikrotik/health', { router_id: 7 }, 'card')).toBe('tiles');
    expect(displayFor('/api/mikrotik/health', {}, 'tiles')).toBe('table');
  });
});
