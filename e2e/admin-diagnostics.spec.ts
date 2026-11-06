import { expect, test, type Page, type Route } from '@playwright/test';

// A Bitwave admin bench-testing Access points on a router they don't own. The
// backend is mocked: GET /api/routers returns every router to an admin, and the
// diagnostics routes let an admin through by role. Nothing is clicked on an AP.

const ADMIN = { id: 1, email: 'admin@bitwave.test', role: 'admin', organization_name: 'Bitwave Admin', subscription_status: 'active' };

const router = (id: number, name: string, user_id: number) => ({
  id, name, identity: `Router-${id}`, ip_address: `10.0.0.${id % 200}`, user_id, status: 'online', is_online: true,
  lb_enabled: false, lb_config: null,
});

const credential = {
  ap_mac: 'AA:BB:CC:00:00:01', vendor: 'tenda', model: 'OAP1200V2', username: 'admin', has_password: true, login_method: null,
  last_login_ok: true, locked: false, failed_login_count: 0, last_error: null, last_status: null, last_status_at: null,
  last_action: null, last_action_at: null,
};
const accessPoint = (mac: string, hostname: string, cred: typeof credential | null) => ({
  mac, ip: '192.168.88.20', hostname, vendor: 'tenda', sources: ['arp'], router_mode_suspect: false, on_gateway: false,
  credential: cred, detector: { needs_safe_ap: false, in_router_mode: false, dhcp_server_on: false, on_gateway: false },
});

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function setup(page: Page) {
  const seen: string[] = [];
  const writes: string[] = [];
  await page.addInitScript((u) => {
    localStorage.setItem('auth_token', 'tok');
    localStorage.setItem('auth_user', JSON.stringify(u));
  }, ADMIN);
  await page.route(/\/api\//, (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^.*\/api/, '');
    seen.push(path);
    if (request.method() !== 'GET') writes.push(path);
    if (path === '/routers') return json(route, [router(7, 'Another shop', 30), router(563, 'Bench router', 20)]);
    if (path === '/routers/563/access-points') {
      return json(route, {
        router_id: 563, router_name: 'Bench router', gateway: '192.168.88.1', subnet: '192.168.88.0/24', ap_write_in_progress: false,
        access_points: [
          accessPoint('AA:BB:CC:00:00:01', 'Tenda-saved', credential),
          accessPoint('AA:BB:CC:00:00:02', 'Tenda-new', null),
        ],
      });
    }
    if (/\/(ports|port-analytics|overview)$|restart-options$/.test(path)) return json(route, { detail: 'Router is not reachable' }, 503);
    return json(route, {});
  });
  return { seen, writes };
}

for (const width of [1280, 375]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test('an admin stays on the deep link and gets the router they do not own', async ({ page }) => {
      const { seen, writes } = await setup(page);
      await page.goto('/diagnostics?tab=accesspoints&router=563');

      await expect(page.getByRole('heading', { name: 'Access points' })).toBeVisible();
      await expect(page).toHaveURL(/\/diagnostics\?tab=accesspoints&router=563/);
      await expect(page.locator('select').first()).toHaveValue('563');
      expect(seen).toContain('/routers/563/access-points');
      expect(seen.some((p) => p.startsWith('/routers/7/'))).toBe(false);

      // Password saved: the buttons work. Not saved: they say why.
      await expect(page.getByRole('button', { name: 'Reboot AP' }).first()).toBeEnabled();
      await expect(page.getByRole('button', { name: 'Make it a safe AP' }).first()).toBeEnabled();
      await expect(page.getByRole('button', { name: 'Reboot AP' }).nth(1)).toBeDisabled();
      await expect(page.getByText('Save the AP admin password first.')).toBeVisible();
      expect(writes).toEqual([]);
    });

    test('the other tabs stay up for an admin, with the admin navigation', async ({ page }) => {
      const { writes } = await setup(page);
      await page.goto('/diagnostics?tab=accesspoints&router=563');
      await expect(page.getByRole('heading', { name: 'Access points' })).toBeVisible();

      for (const tab of ['Hotspot', 'PPPoE', 'Port Map']) {
        await page.getByRole('button', { name: tab, exact: true }).click();
        await expect(page).toHaveURL(/\/diagnostics/);
        await expect(page.getByText('Router is not reachable').first()).toBeVisible();
        await expect(page.getByText('Something went wrong')).toHaveCount(0);
      }

      const nav = width >= 768 ? page.locator('aside').first() : page.locator('nav.fixed').first();
      await expect(nav.getByRole('link', { name: /Dashboard/ }).first()).toHaveAttribute('href', '/admin');
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over).toBeLessThanOrEqual(1);
      expect(writes).toEqual([]);
    });

    test('other reseller pages still send an admin to /admin', async ({ page }) => {
      await setup(page);
      await page.goto('/customers');
      await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 }); // a dev server compiles the page first
    });
  });
}
