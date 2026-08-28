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
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
