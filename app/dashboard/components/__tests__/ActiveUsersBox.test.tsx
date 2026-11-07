import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../../../lib/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/i18n')>();
  return { ...actual, useT: () => (text: string, vars?: Record<string, string | number>) => actual.translate('en', text, vars) };
});
import { ActiveUsersBox } from '../LiveThroughputCard';
import type { MikroTikMetrics } from '../../../lib/types';

const metrics = (over: Partial<MikroTikMetrics>): MikroTikMetrics =>
  ({
    activeSessionCount: 0,
    activeHotspotUsers: 0,
    activePppoeUsers: 0,
    activeStaticUsers: 0,
    activeTotalUsers: 0,
    activePppoeCount: 0,
    snapshotAgeSeconds: 30,
    ...over,
  }) as MikroTikMetrics;

describe('ActiveUsersBox', () => {
  it('shows static-IP customers in their own column, not under Hotspot', () => {
    const html = renderToStaticMarkup(
      <ActiveUsersBox data={metrics({ activeHotspotUsers: 3, activePppoeUsers: 2, activeStaticUsers: 68, activeTotalUsers: 73 })} />,
    );
    expect(html).toContain('>Static<');
    expect(html).toContain('>68<');
    expect(html).toContain('>3<');
    expect(html).toContain('73 active');
  });

  it('keeps the two-column layout when a router has no static customers', () => {
    const html = renderToStaticMarkup(
      <ActiveUsersBox data={metrics({ activeHotspotUsers: 12, activePppoeUsers: 4, activeTotalUsers: 16 })} />,
    );
    expect(html).not.toContain('>Static<');
    expect(html).toContain('16 active');
  });
});
