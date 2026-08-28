import { expect, test, type Page } from '@playwright/test';

const adminUser = {
  id: 1,
  email: 'admin@bitwave.test',
  role: 'admin',
  organization_name: 'Bitwave Admin',
  subscription_status: 'active',
};

function healthPayload(l2tpAvailable = true) {
  return {
    generated_at: new Date().toISOString(),
    overall_status: l2tpAvailable ? 'healthy' : 'critical',
    manager_reachable: true,
    summary: l2tpAvailable
      ? 'All primary management tunnel services are operational.'
      : 'L2TP/IPsec is unavailable; 59 registered routers may be unreachable.',
    issues: l2tpAvailable
      ? []
      : ['L2TP/IPsec is unavailable; 59 registered routers may be unreachable.'],
    services: {
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
    },
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

test('admin dashboard shows live WireGuard and L2TP health', async ({ page }) => {
  await authenticate(page);
  await stubHealth(page);
  await page.goto('/admin');

  await expect(page.getByRole('heading', { name: 'Management Tunnel Health' })).toBeVisible();
  await expect(page.getByText('All primary management tunnel services are operational.')).toBeVisible();
  await expect(page.getByText('L2TP / IPsec')).toBeVisible();
  await expect(page.getByText('Active sessions')).toBeVisible();
  await expect(page.getByText('UDP 1701:')).toBeVisible();
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
