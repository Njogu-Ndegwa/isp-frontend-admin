import { describe, expect, it } from 'vitest';
import { frameHeight, opensKeyboard } from '../useVisibleFrame';

const el = (tagName: string, extra: Record<string, unknown> = {}) => ({ tagName, ...extra }) as unknown as Element;

describe('the assistant frame follows the keyboard only while someone types', () => {
  it('uses the full screen when nothing is typed in, however short the visible area reads', () => {
    // after signing in the password keyboard is still closing: the screen reads half height
    expect(frameHeight(false, 420, 1)).toBeNull();
  });

  it('sits above the keyboard while a field is typed in', () => {
    expect(frameHeight(true, 420, 1)).toBe(420);
    expect(frameHeight(true, 720, 0.8)).toBe(900);   // a laptop frame drawn at 80%
    expect(frameHeight(true, 0, 1)).toBeNull();
  });

  it('knows which fields bring up a keyboard', () => {
    expect(opensKeyboard(el('TEXTAREA'))).toBe(true);
    expect(opensKeyboard(el('INPUT', { type: 'text' }))).toBe(true);
    expect(opensKeyboard(el('INPUT', { type: 'tel' }))).toBe(true);
    expect(opensKeyboard(el('INPUT', { type: 'checkbox' }))).toBe(false);
    expect(opensKeyboard(el('BUTTON'))).toBe(false);
    expect(opensKeyboard(el('DIV', { isContentEditable: true }))).toBe(true);
    expect(opensKeyboard(null)).toBe(false);
  });
});

describe('leaving a form puts the keyboard away first', () => {
  it('blurs the field and returns at once when the screen is already whole', async () => {
    const { closeKeyboard } = await import('../useVisibleFrame');
    let blurred = false;
    const field = { tagName: 'INPUT', type: 'password', blur: () => { blurred = true; } };
    const g = globalThis as Record<string, unknown>;
    const before = { document: g.document, window: g.window };
    g.document = { activeElement: field };
    g.window = { innerHeight: 812, visualViewport: { height: 812 } };
    try {
      const t = Date.now();
      await closeKeyboard(700);
      expect(blurred).toBe(true);
      expect(Date.now() - t).toBeLessThan(100);
    } finally { g.document = before.document; g.window = before.window; }
  });
});
