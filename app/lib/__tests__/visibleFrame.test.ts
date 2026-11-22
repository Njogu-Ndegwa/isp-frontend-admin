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
