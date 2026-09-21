import { expect, test, type Page } from '@playwright/test';

const adminUser = {
  id: 1,
  email: 'admin@bitwave.test',
  role: 'admin',
  organization_name: 'Bitwave Admin',
  subscription_status: 'active',
};

function healthPayload(l2tpAvailable = true) {
  const primaryServices = {
    wireguard: {
      available: true,
      interface: 'wg0',
      listening_port: 51820,
      configured_peers: 120,
      recent_handshakes: 48,
      registered_routers: 110,
      online_routers: 91,
    },
    l2tp: {
      available: l2tpAvailable,
      required: true,
      listener_available: l2tpAvailable,
      ipsec_available: true,
      listening_port: 1701,
      configured_peers: 59,
      active_sessions: l2tpAvailable ? 16 : 0,
      registered_routers: 59,
      online_routers: l2tpAvailable ? 16 : 0,
    },
  };
  const insuranceServices = {
    wireguard: {
      available: true,
      interface: 'wg2',
      listening_port: 51823,
      configured_peers: 36,
      recent_handshakes: 30,
      stale_handshakes: 6,
      registered_routers: 36,
      online_routers: 30,
    },
    l2tp: {
      available: true,
      required: true,
      listener_available: true,
      ipsec_available: true,
      listening_port: 1701,
      configured_peers: 59,
      active_sessions: 16,
      registered_routers: 59,
      online_routers: 16,
    },
  };
  const summary = l2tpAvailable
    ? 'Primary AWS and Hetzner emergency tunnels are operational. Application failover to Hetzner is currently manual.'
    : 'Primary L2TP/IPsec is unavailable; 59 registered routers may be unreachable. Hetzner emergency tunnels are operational, but application failover is manual.';
  return {
    generated_at: new Date().toISOString(),
    overall_status: l2tpAvailable ? 'healthy' : 'critical',
    manager_reachable: true,
    summary,
    issues: l2tpAvailable
      ? []
      : ['L2TP/IPsec is unavailable; 59 registered routers may be unreachable.'],
    services: primaryServices,
    primary: {
      manager_reachable: true,
      overall_status: l2tpAvailable ? 'healthy' : 'critical',
      summary,
      services: primaryServices,
      ipsec_connmark: {
        available: true,
        healthy: l2tpAvailable,
        duplicate_tuple_count: l2tpAvailable ? 0 : 2,
        superseded_rule_count: l2tpAvailable ? 0 : 7,
        inspected_rule_count: 59,
      },
    },
    insurance: {
      manager_reachable: true,
      overall_status: 'healthy',
      summary: 'Hetzner emergency tunnels are operational.',
      services: insuranceServices,
      server_public_ip: '91.98.238.12',
      vpn_ip: '10.251.0.1',
      subnet: '10.251.0.0/16',
      mode: 'manual_rescue',
      automatic_failover_enabled: false,
    },
    fleet_status: {
      stale_after_seconds: 600,
      total_routers: 169,
      online_count: l2tpAvailable ? 160 : 156,
      watch_count: l2tpAvailable ? 1 : 2,
      offline_count: l2tpAvailable ? 0 : 3,
      unknown_count: 8,
      attention_count: l2tpAvailable ? 9 : 13,
      routers: l2tpAvailable ? [
        {
          router_id: 316,
          router_name: 'Remote site',
          identity: 'Router-0826',
          ip_address: '10.0.100.48',
          tunnel_type: 'l2tp',
          state: 'watch',
          reason: 'The latest probe failed; waiting for a second failure before declaring an outage.',
          last_checked_at: new Date().toISOString(),
          status_age_seconds: 20,
          status_source: 'bandwidth_snapshot',
          pending_outage: true,
          is_flapping: false,
          transition_count: 0,
          outage_count: 0,
          last_transition_at: null,
        },
      ] : [
        {
          router_id: 166,
          router_name: 'PAWACONNECT #1',
          identity: 'Router-0425',
          ip_address: '10.0.100.19',
          tunnel_type: 'l2tp',
          state: 'offline',
          reason: 'Two recent probes confirmed the management tunnel is down.',
          last_checked_at: new Date().toISOString(),
          status_age_seconds: 20,
          status_source: 'router_connect',
          pending_outage: false,
          is_flapping: true,
          transition_count: 6,
          outage_count: 3,
          last_transition_at: new Date().toISOString(),
        },
      ],
    },
    flapping: {
      window_hours: 24,
      monitored_routers: 63,
      affected_count: l2tpAvailable ? 0 : 2,
      total_transitions: l2tpAvailable ? 0 : 11,
      routers: l2tpAvailable ? [] : [
        {
          router_id: 166,
          router_name: 'PAWACONNECT #1',
          identity: 'Router-0425',
          ip_address: '10.0.100.19',
          tunnel_type: 'l2tp',
          current_status: 'online',
          sample_count: 35,
          transition_count: 6,
          outage_count: 3,
          is_flapping: true,
          last_transition_at: new Date().toISOString(),
        },
      ],
    },
    automatic_failover_enabled: false,
  };
}

async function authenticate(page: Page) {
  await page.addInitScript((user) => {
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token', 'test-admin-token');
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, adminUser);
}

async function stubHealth(page: Page, l2tpAvailable = true) {
  await page.route('**/api/**', (route) => {
    if (new URL(route.request().url()).pathname.endsWith('/admin/management-tunnels')) {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(healthPayload(l2tpAvailable)),
      });
    }
    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Not required for this focused UI test.' }),
    });
  });
}

test('admin dashboard shows primary and Hetzner emergency tunnel health', async ({ page }) => {
  await authenticate(page);
  await stubHealth(page);
  await page.goto('/admin');

  await expect(page.getByRole('heading', { name: 'Management Tunnel Health' })).toBeVisible();
  await expect(page.getByText(/Application failover to Hetzner is currently manual/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Primary AWS management' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hetzner emergency tunnel' })).toBeVisible();
  await expect(page.getByText(/Manual rescue only/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'L2TP / IPsec', exact: true })).toBeVisible();
  await expect(page.getByText('IPsec collision early warning')).toBeVisible();
  await expect(page.getByText(/59 live NAT-T mark rules inspected/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Router tunnel state' })).toBeVisible();
  await expect(page.getByText('Early warning', { exact: true })).toBeVisible();
  await expect(page.getByText('Remote site')).toBeVisible();
  await expect(page.getByText('Watch', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Router flapping history' })).toBeVisible();
  await expect(page.getByText('No repeated flaps')).toBeVisible();
  await expect(page.getByText('Active sessions').first()).toBeVisible();
  await expect(page.getByText('UDP 1701:').first()).toBeVisible();
});

test('critical tunnel incident is visible across admin pages on a phone', async ({ page }) => {
  await authenticate(page);
  await stubHealth(page, false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/settings');

  await expect(page.getByText('Management tunnel incident')).toBeVisible();
  await expect(page.getByText(/59 registered routers may be unreachable/)).toBeVisible();
  await page.goto('/admin');
  await expect(page.getByText('Risk detected')).toBeVisible();
  await expect(page.getByText(/2 duplicate NAT-T tuples/)).toBeVisible();
  const tunnelState = page.getByRole('region', { name: 'Router tunnel state' });
  await expect(tunnelState.getByText('PAWACONNECT #1')).toBeVisible();
  await expect(tunnelState.getByText('Down', { exact: true })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('health API failure is never hidden and does not leave stale status green', async ({ page }) => {
  await authenticate(page);
  let healthChecks = 0;
  await page.route('**/api/**', (route) => {
    if (new URL(route.request().url()).pathname.endsWith('/admin/management-tunnels')) {
      healthChecks += 1;
      return healthChecks === 1
        ? route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(healthPayload()),
          })
        : route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Health manager unavailable' }),
          });
    }
    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Not required for this focused UI test.' }),
    });
  });

  await page.goto('/admin');
  await expect(page.getByText(/Application failover to Hetzner is currently manual/)).toBeVisible();
  await page.getByRole('button', { name: 'Refresh management tunnel health' }).click();

  await expect(page.getByText('Unverified').first()).toBeVisible();
  await expect(page.getByText(/figures below are last known data/)).toBeVisible();
  await expect(page.getByText('Unknown').first()).toBeVisible();

  await page.goto('/admin/settings');
  await expect(page.getByText('Tunnel monitoring unavailable')).toBeVisible();
  await expect(page.getByText(/Unable to verify management tunnels/)).toBeVisible();
});
