import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ProblemRoutersCard from '../ProblemRoutersCard';
import type { OpsHealthProblemRouter, OpsHealthProblemRoutersSection } from '../../lib/types';

const win = { payments: 0, lost: 0, first_try_pct: null, reach_pct: null, drops: 0 };

function router(id: number, state: OpsHealthProblemRouter['state'], reason: string, extra: Partial<OpsHealthProblemRouter> = {}): OpsHealthProblemRouter {
  return {
    router_id: id, router_name: `R${id}`, reseller: 'Net net', tunnel: 'sstp', state, reason,
    fix: null, window: 'last_24h', after: win, before: win, last_online_at: null, ...extra,
  };
}

const section = (over: Partial<OpsHealthProblemRoutersSection> = {}): OpsHealthProblemRoutersSection => ({
  status: 'healthy',
  counts: { attention: 1, recovering: 0, fixed: 1 },
  paid_not_connected_24h: 15,
  paid_not_connected_daily_avg_before: 36.5,
  routers: [
    router(281, 'attention', '6 paid customers not connected in the last 24h'),
    router(383, 'fixed', 'Clean since the move to SSTP (24 Sep 10:58 UTC): 1 payment, all connected'),
  ],
  routers_total: 2,
  ...over,
});

const render = (s?: OpsHealthProblemRoutersSection) =>
  renderToStaticMarkup(<ProblemRoutersCard section={s} onOpen={() => {}} tunnelLabels={{ sstp: 'SSTP' }} />);

describe('ProblemRoutersCard', () => {
  it('leads with paid customers not connected, compared with the week before', () => {
    const html = render(section());
    expect(html).toContain('15 paid customers not connected');
    expect(html).toContain('down from 36.5/day before');
    expect(html).toContain('1 need attention');
    expect(html).toContain('1 fixed');
  });

  it('lists attention routers with their reason and keeps fixes collapsed', () => {
    const html = render(section());
    expect(html).toContain('R281');
    expect(html).toContain('6 paid customers not connected in the last 24h');
    expect(html).toContain('>SSTP<');
    expect(html).toContain('Fixes and recoveries (1)');
    expect(html).not.toContain('Clean since the move to SSTP'); // collapsed by default
  });

  it('says so plainly when nothing is costing customers, and flags a worse day in red', () => {
    const calm = render(section({ counts: { attention: 0, recovering: 0, fixed: 0 }, routers: [], paid_not_connected_24h: 0 }));
    expect(calm).toContain('No router is costing customers right now.');
    const worse = render(section({ paid_not_connected_24h: 50 }));
    expect(worse).toContain('up from 36.5/day before');
    expect(worse).toContain('text-red-500');
  });

  it('renders nothing for snapshots taken before the backend shipped the section', () => {
    expect(render(undefined)).toBe('');
  });
});
