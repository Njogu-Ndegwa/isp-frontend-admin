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

  it('leads with customers waiting right now and badges the router they are stuck on', () => {
    const html = render(section({
      waiting_now: 23,
      waiting_routers: 1,
      counts: { attention: 2, recovering: 0, fixed: 0 },
      routers: [
        router(448, 'attention', '23 paid customers waiting to be connected (oldest 2h 05m) · no contact since 25 Sep 08:05 UTC',
          { waiting: 23, oldest_waiting_at: '2026-09-25T08:07:41Z', tunnel: 'wireguard' }),
        router(281, 'attention', '6 paid customers not connected in the last 24h'),
      ],
    }));
    expect(html).toContain('23 paid customers waiting to be connected now');
    expect(html).toContain('on 1 router');
    expect(html).toContain('23 waiting');
    expect(html.indexOf('R448')).toBeLessThan(html.indexOf('R281'));
    expect(html.match(/data-testid="problem-router-waiting"/g)).toHaveLength(1);
  });

  it('explains what the list is and hides the waiting line when nobody is waiting', () => {
    const html = render(section({ waiting_now: 0, waiting_routers: 0 }));
    expect(html).toContain('Routers where paid customers are waiting or were not connected');
    expect(html).not.toContain('problem-routers-waiting');
  });

  it('offers the time windows with 24h (the snapshot) picked, plus the rules toggle', () => {
    const html = renderToStaticMarkup(
      <ProblemRoutersCard section={section()} onOpen={() => {}} loadWindow={async () => null} />);
    for (const label of ['1h', '3h', '6h', '12h', '24h', '3 days']) expect(html).toContain(`>${label}</button>`);
    expect(html).toMatch(/aria-pressed="true"[^>]*>24h</);
    expect(html).toContain('How is this judged?');
    expect(html).toContain('15 paid customers not connected'); // snapshot shown straight away
  });

  it('hides the picker when no loader is wired, as before', () => {
    expect(render(section())).not.toContain('problem-routers-window');
  });

  it('shows a checking state until a non-snapshot window has loaded', () => {
    const html = renderToStaticMarkup(
      <ProblemRoutersCard section={section()} onOpen={() => {}} loadWindow={async () => null} initialHours={1} />);
    expect(html).toContain('Checking the last 1h…');
    expect(html).not.toContain('R281');
    expect(html).toMatch(/aria-pressed="true"[^>]*>1h</);
  });

  it('words the headline for the chosen window', () => {
    const windowed = section({
      window_hours: 1, window_label: '1h', paid_not_connected_window: 0, paid_not_connected_avg_before: 0.4,
      counts: { attention: 0, recovering: 0, fixed: 1 },
      routers: [router(383, 'fixed', 'Clean in the last 1h: 2 payments, all connected (before: 3 not connected)',
        { window: 'last_window' })],
      criteria: ['Needs attention: ...'],
    });
    const html = render(windowed);
    expect(html).toContain('0 paid customers not connected');
    expect(html).toContain('in the last 1h · down from 0.4 per 1h before');
    expect(html).toContain('No router is costing customers in the last 1h.');
    expect(html).toContain('Fixes and recoveries (1)');
  });

  it('renders nothing for snapshots taken before the backend shipped the section', () => {
    expect(render(undefined)).toBe('');
  });
});
