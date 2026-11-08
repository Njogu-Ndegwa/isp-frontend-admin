import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FR } from '../../../lib/locales/fr';
import {
  NO_PPPOE_PORT_ON_CREATE_MESSAGE,
  NO_PPPOE_SERVER_MESSAGE,
  OPEN_PORTS_CONFIGURATION,
  portsConfigHref,
  portsRouterIdFromSearch,
  routerHasPPPoEPort,
} from '../../../lib/pppoePorts';
import type { PPPoECustomerPresenceResponse } from '../../../lib/types';

// Same lookup as app/lib/i18n.ts translate(), without pulling in AuthContext.
vi.mock('../../../lib/i18n', () => ({
  useT: () => (text: string) => text,
}));

const { default: PPPoEAccountCheck } = await import('../PPPoEAccountCheck');

function presence(
  overrides: Partial<PPPoECustomerPresenceResponse> = {},
): PPPoECustomerPresenceResponse {
  return {
    cached: false,
    success: true,
    generated_at: '2026-11-08T10:00:00',
    customer: { id: 53925, name: 'First', plan: 'Home', plan_speed: '5M/5M', pppoe_username: 'first', status: 'active' },
    router: { id: 599, name: 'Antidote connect #1' },
    speed_enforcement: { expected_rate_limit: '5400000/5400000', profile_rate_limit: '5400000/5400000' },
    mikrotik: {
      present_on_router: true,
      online: false,
      state: 'offline',
      active_sessions: [],
      profile_detail: { name: 'pppoe_5M_5M', rate_limit: '5400000/5400000' },
      secret: { name: 'first', profile: 'pppoe_5M_5M', disabled: false },
    },
    verdict: { code: 'router_account_exists_but_customer_offline', message: '', our_side_confirmed: true },
    ...overrides,
  };
}

describe('PPPoEAccountCheck', () => {
  it('warns in amber, with a link to Ports configuration, when no port runs PPPoE', () => {
    const html = renderToStaticMarkup(
      <PPPoEAccountCheck
        presence={presence({
          verdict: { code: 'no_pppoe_server', message: '', our_side_confirmed: false },
          pppoe_server: { available: false, enabled_interfaces: [], configured_pppoe_ports: [], configured_dual_ports: [] },
        })}
      />,
    );
    expect(html).toContain(NO_PPPOE_SERVER_MESSAGE.replace(/'/g, '&#x27;'));
    expect(html).toContain('href="/routers?ports=599"');
    expect(html).toContain(OPEN_PORTS_CONFIGURATION);
    expect(html).toContain('bg-warning/10');
    expect(html).not.toContain('set up correctly');
  });

  it('also warns when only the pppoe_server block says no server', () => {
    const html = renderToStaticMarkup(
      <PPPoEAccountCheck
        presence={presence({
          pppoe_server: { available: false, enabled_interfaces: [], configured_pppoe_ports: [], configured_dual_ports: [] },
        })}
      />,
    );
    expect(html).not.toContain('set up correctly');
    expect(html).toContain('/routers?ports=599');
  });

  it('keeps the green line when a port runs PPPoE', () => {
    const html = renderToStaticMarkup(
      <PPPoEAccountCheck
        presence={presence({
          pppoe_server: { available: true, enabled_interfaces: ['ether4'], configured_pppoe_ports: ['ether4'], configured_dual_ports: [] },
        })}
      />,
    );
    expect(html).toContain('Login is set up correctly on the router, at the plan speed.');
    expect(html).not.toContain('/routers?ports=');
  });

  it('keeps the green line on an older backend with no pppoe_server block', () => {
    const html = renderToStaticMarkup(<PPPoEAccountCheck presence={presence()} />);
    expect(html).toContain('Login is set up correctly on the router');
  });

  it('keeps the green line when the server read failed', () => {
    const html = renderToStaticMarkup(
      <PPPoEAccountCheck
        presence={presence({
          pppoe_server: { available: null, enabled_interfaces: [], configured_pppoe_ports: [], configured_dual_ports: [] },
        })}
      />,
    );
    expect(html).toContain('Login is set up correctly on the router');
  });
});

describe('pppoePorts helpers', () => {
  it('counts PPPoE-only and PPPoE + hotspot ports, not hotspot-only routers', () => {
    expect(routerHasPPPoEPort({ pppoe_ports: [], dual_ports: null })).toBe(false);
    expect(routerHasPPPoEPort({})).toBe(false);
    expect(routerHasPPPoEPort(null)).toBe(false);
    expect(routerHasPPPoEPort({ pppoe_ports: ['ether4'] })).toBe(true);
    expect(routerHasPPPoEPort({ pppoe_ports: [], dual_ports: ['ether3'] })).toBe(true);
  });

  it('round-trips the Ports configuration link', () => {
    expect(portsConfigHref(599)).toBe('/routers?ports=599');
    expect(portsRouterIdFromSearch('?ports=599')).toBe(599);
    expect(portsRouterIdFromSearch('?ports=abc')).toBeNull();
    expect(portsRouterIdFromSearch('')).toBeNull();
  });

  it('has the French for every new message', () => {
    for (const key of [NO_PPPOE_SERVER_MESSAGE, NO_PPPOE_PORT_ON_CREATE_MESSAGE, OPEN_PORTS_CONFIGURATION]) {
      expect(FR[key], key).toBeTruthy();
    }
  });
});
