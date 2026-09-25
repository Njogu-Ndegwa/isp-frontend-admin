import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ProblemRoutersCard from '../ProblemRoutersCard';
import type { OpsHealthProblemRouter, OpsHealthProblemRoutersSection, OpsHealthRouterAilment } from '../../lib/types';

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

  it('shows what is ailing each router: badge, SSTP candidate, evidence and next step', () => {
    const html = render(section({
      counts: { attention: 3, recovering: 0, fixed: 0 },
      routers: [
        router(101, 'attention', '4 paid customers not connected in the last 24h', {
          diagnosis: {
            ailment: 'overloaded',
            evidence: 'TCP 5/5, API login timed out, CPU 100% (push 3 min ago)',
            action: 'Reboot the router; if it recurs, upgrade hardware or RouterOS',
            sstp_candidate: false,
            probed_at: '2026-09-25T12:00:00Z',
          },
        }),
        router(102, 'attention', 'Reachable 40% of the time in the last 24h (9 drops)', {
          tunnel: 'wireguard',
          diagnosis: {
            ailment: 'lossy_line', evidence: 'TCP 2/5, API login timed out, no push',
            action: 'Move management to SSTP', sstp_candidate: true,
          },
        }),
        router(103, 'attention', '2 paid customers not connected in the last 24h'),
      ],
    }));
    expect(html).toContain('Overloaded router');
    expect(html).toContain('TCP 5/5, API login timed out, CPU 100% (push 3 min ago) · Reboot the router');
    expect(html).toContain('Line losing packets');
    expect(html).toContain('Move management to SSTP');
    expect(html.match(/data-testid="problem-router-sstp-candidate"/g)).toHaveLength(1);
    expect(html.indexOf('SSTP candidate')).toBeGreaterThan(html.indexOf('R102'));
    // A row the probe has not reached yet renders exactly as before.
    expect(html.match(/data-testid="problem-router-diagnosis"/g)).toHaveLength(2);
  });

  it.each<[OpsHealthRouterAilment, string]>([
    ['udp_blocked', 'UDP blocked'],
    ['offline', 'Offline'],
    ['healthy_now', 'Healthy now'],
  ])('labels the %s ailment as "%s"', (ailment, label) => {
    const html = render(section({
      routers: [router(7, 'attention', 'x', {
        diagnosis: { ailment, evidence: 'TCP 0/5, no push', action: 'Do the thing', sstp_candidate: false },
      })],
    }));
    expect(html).toContain(`data-ailment="${ailment}"`);
    expect(html).toContain(`>${label}<`);
    expect(html).not.toContain('SSTP candidate');
  });

  it('renders rows unchanged when the backend sends no diagnosis (null or absent)', () => {
    const html = render(section({
      routers: [router(281, 'attention', '6 paid customers not connected in the last 24h', { diagnosis: null })],
    }));
    expect(html).toContain('R281');
    expect(html).not.toContain('problem-router-diagnosis');
    expect(render(section())).not.toContain('problem-router-diagnosis');
  });

  it('renders nothing for snapshots taken before the backend shipped the section', () => {
    expect(render(undefined)).toBe('');
  });
});
