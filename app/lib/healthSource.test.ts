import { describe, expect, it } from 'vitest';
import { healthSourceCaption } from './healthSource';

const now = new Date('2026-09-25T00:10:00Z');

describe('healthSourceCaption', () => {
  it('shows push data with its age', () => {
    expect(healthSourceCaption('push', '2026-09-25T00:08:00', now)).toEqual({
      text: 'Reported by router · 2 min ago', tone: 'good' });
  });
  it('treats naive backend timestamps as UTC', () => {
    expect(healthSourceCaption('push', '2026-09-25T00:09:40', now)?.text).toBe('Reported by router · just now');
  });
  it('labels SNMP as CPU only', () => {
    expect(healthSourceCaption('snmp', '2026-09-24T22:10:00Z', now)).toEqual({
      text: 'CPU via SNMP · 2 h ago', tone: 'info' });
  });
  it('says plainly when the router is not pushing', () => {
    expect(healthSourceCaption('routeros', undefined, now)).toEqual({
      text: 'Checked directly (router not pushing)', tone: 'muted' });
  });
  it('shows nothing for an older backend that sends no source', () => {
    expect(healthSourceCaption(undefined, undefined, now)).toBeNull();
  });
  it('survives an unparseable time', () => {
    expect(healthSourceCaption('push', 'garbage', now)?.text).toBe('Reported by router');
  });
});
