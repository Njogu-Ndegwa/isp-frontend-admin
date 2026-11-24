import { describe, expect, it } from 'vitest';
import { answerHref, findRows, formatValue, parseInline, parseMarkdown, pickColumns, safeHref, viewFor } from '../assistantView';
import { parseSseChunk } from '../assistant';

describe('assistant results', () => {
  it('tables a wrapped list and keeps the total', () => {
    const view = viewFor({ customers: [{ id: 1, name: 'Jane', phone: '0712', status: 'active' }], total: 42, page: 1 });
    expect(view.kind).toBe('table');
    if (view.kind !== 'table') return;
    expect(view.total).toBe(42);
    expect(view.columns.slice(0, 3)).toEqual(['name', 'phone', 'status']);
    expect(view.meta).toEqual([['page', 1]]);
  });

  it('draws one record as fields and pulls out a router command to copy', () => {
    const view = viewFor({ id: 7, command: '/tool fetch url="https://x/provision.rsc"; /import provision.rsc;', expires_in_hours: 24 });
    expect(view.kind).toBe('record');
    if (view.kind !== 'record') return;
    expect(view.commands[0][0]).toBe('command');
    // a database id means nothing to the reader, so it is left out
    expect(view.fields.map(([k]) => k)).toEqual(['expires_in_hours']);
  });

  it('leaves out ids, lists of ids, housekeeping times and empty values', () => {
    const view = viewFor({ name: 'Main Tower', router_ids: [3, 4], uuid: 'x', extracted_at: '2026-11-20T10:00:00', note: '', online: 12 });
    expect(view.kind).toBe('record');
    if (view.kind !== 'record') return;
    expect(view.fields.map(([k]) => k)).toEqual(['name', 'online']);
  });

  it('finds the biggest list when no key is familiar', () => {
    expect(findRows({ a: [{ x: 1 }], b: [{ x: 1 }, { x: 2 }] })?.key).toBe('b');
    expect(findRows({ a: 1 })).toBeNull();
  });

  it('skips empty columns and prefers useful ones', () => {
    expect(pickColumns([{ zeta: 1, name: 'A', blank: null }])).toEqual(['name', 'zeta']);
  });

  it('formats naive API datetimes as UTC and never prints null', () => {
    expect(formatValue(null)).toBe('–');
    expect(formatValue(true)).toBe('Yes');
    const shown = formatValue('2026-11-19T07:00:00', 'en-GB');
    expect(shown).toContain('2026');
  });
});

describe('assistant markdown', () => {
  it('never lets a model write raw HTML or a javascript: link', () => {
    const inline = parseInline('<img src=x onerror=alert(1)> [click](javascript:alert(1)) [page](/customers/5)');
    expect(inline.some((n) => n.t === 'link' && n.href.startsWith('javascript'))).toBe(false);
    expect(inline.find((n) => n.t === 'link')).toEqual({ t: 'link', v: 'page', href: '/customers/5' });
    expect(inline[0]).toEqual({ t: 'text', v: '<img src=x onerror=alert(1)> ' });
    expect(safeHref('//evil.example')).toBeNull();
    expect(safeHref('https://wa.me/254795635364')).toBe('https://wa.me/254795635364');
  });

  it('parses lists, code blocks and bold', () => {
    const blocks = parseMarkdown('Do this:\n1. Open **Winbox**\n2. Paste\n\n```\n/ping 8.8.8.8 count=3\n```');
    expect(blocks.map((b) => b.t)).toEqual(['p', 'list', 'code']);
    expect(blocks[2]).toEqual({ t: 'code', v: '/ping 8.8.8.8 count=3' });
  });
});

describe('assistant stream', () => {
  it('splits SSE frames, skips pings and keeps a partial frame for later', () => {
    const { events, rest } = parseSseChunk(
      'event: text\ndata: {"type":"text","delta":"Hi"}\n\n: ping\n\nevent: done\ndata: {"type":"do',
    );
    expect(events).toEqual([{ type: 'text', delta: 'Hi' }]);
    expect(rest).toBe('event: done\ndata: {"type":"do');
  });
});

describe('answerHref', () => {
  it('keeps page links for platform admins', () => {
    expect(answerHref('/customers/5', true)).toBe('/customers/5');
  });
  it('turns dashboard page links into plain words for resellers', () => {
    for (const href of ['/customers/62005', '/messaging', '/settings', '/settings/account-statement', '/plans', '/routers/7/live', '/dashboard/x', '/dashboardx']) {
      expect(answerHref(href, false)).toBeNull();
    }
    expect(answerHref('/dashboard', false)).toBe('/dashboard'); // the way back, asked for
    expect(answerHref('/assistant', false)).toBe('/assistant');
    expect(answerHref('/assistant?start=setup', false)).toBe('/assistant?start=setup');
    expect(answerHref('/assistantx', false)).toBeNull();
    expect(answerHref('https://wa.me/254700000000', false)).toBe('https://wa.me/254700000000');
  });
});
