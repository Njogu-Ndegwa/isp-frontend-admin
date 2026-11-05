import { expect, test, type Page, type Route } from '@playwright/test';

// Router settings -> "Redirect expired PPPoE users to payment page", against a
// mocked API. The switch calls PUT /routers/{id}/pppoe-expired-redirect at
// once (it changes the router), and only flips when the API accepted it.

const OWNER = { id: 7, email: 'owner@bitwave.test', role: 'reseller', organization_name: 'FastNet ISP', subscription_status: 'active' };
const ROUTER = {
  id: 22, name: 'Fibre Router', identity: 'fibre-router', ip_address: '10.0.0.22', port: 8728,
  auth_method: 'DIRECT_API', payment_methods: ['mpesa'], status: 'online', status_is_stale: false,
  emergency_active: false, pppoe_ports: ['ether4'], pppoe_expired_redirect: false,
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function setup(page: Page, user: Record<string, unknown>, opts: { fail?: boolean } = {}) {
  const puts: { path: string; body: unknown }[] = [];
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(user))});
  `);
  await page.route('**/_vercel/insights/script.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path.endsWith('/staff/me')) {
      const staff = user.staff as { permissions: string[] } | undefined;
      if (!staff) return json(route, {}, 404);
      return json(route, { is_staff: true, staff, permissions: staff.permissions });
    }
    if (path.endsWith('/pppoe-expired-redirect') && req.method() === 'PUT') {
      const body = req.postDataJSON() as { enabled: boolean };
      puts.push({ path, body });
      if (opts.fail) return json(route, { detail: 'Router not updated: Failed to connect to router' }, 502);
      return json(route, {
        router_id: ROUTER.id, pppoe_expired_redirect: body.enabled, message: 'ok',
        result: body.enabled ? { config: { cidr: '10.254.252.0/22' } } : { secrets_removed: ['jane', 'otis'] },
      });
    }
    if (path === '/api/routers') return json(route, [ROUTER]);
    if (path.endsWith('/insurance-tunnel-batch/current')) return json(route, { success: true, job: null });
    if (path.endsWith('/messaging/inbox')) return json(route, { unread: 0, messages: [] });
    return json(route, {});
  });
  return puts;
}

async function openEdit(page: Page) {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/routers', { waitUntil: 'domcontentloaded' });
  await page.locator('button[title="Edit"]:visible').first().click();
  await expect(page.getByRole('heading', { name: 'Edit Router' })).toBeVisible();
}

test('owner turns the payment-page redirect on and off from router settings', async ({ page }) => {
  const puts = await setup(page, OWNER);
  await openEdit(page);

  const toggle = page.getByRole('switch', { name: 'Redirect expired PPPoE users to payment page' });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('pppoe-expired-redirect')).toContainText('disconnected and cannot connect');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('Expired PPPoE customers will now see the payment page')).toBeVisible();
  await expect(page.getByTestId('pppoe-expired-redirect')).toContainText('every website opens your payment page');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByText('2 expired customers waiting on it were disconnected')).toBeVisible();

  expect(puts).toEqual([
    { path: '/api/routers/22/pppoe-expired-redirect', body: { enabled: true } },
    { path: '/api/routers/22/pppoe-expired-redirect', body: { enabled: false } },
  ]);
});

test('a router that cannot be reached leaves the switch off and says why', async ({ page }) => {
  await setup(page, OWNER, { fail: true });
  await openEdit(page);

  const toggle = page.getByRole('switch', { name: 'Redirect expired PPPoE users to payment page' });
  await toggle.click();

  await expect(page.getByTestId('pppoe-expired-redirect').getByRole('alert')).toContainText('Could not reach the router');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
});

test('French resellers get the switch in French', async ({ page }) => {
  await setup(page, { ...OWNER, preferred_language: 'fr' });
  await openEdit(page);
  await expect(page.getByRole('switch', { name: 'Rediriger les clients PPPoE expirés vers la page de paiement' })).toBeVisible();
});

test('staff without Manage routers do not see the switch', async ({ page }) => {
  // Staff who can only view routers never get the Edit button; the switch also
  // hides itself, so check it through a staff member who can edit nothing else.
  await setup(page, {
    ...OWNER,
    staff: { id: 3, name: 'Tech', email: 't@x.test', phone: null, permissions: ['routers.view'], parent_reseller_id: 7, business_name: 'FastNet ISP' },
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/routers', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Routers' })).toBeVisible();
  await expect(page.locator('button[title="Edit"]:visible')).toHaveCount(0);
  await expect(page.getByRole('switch', { name: 'Redirect expired PPPoE users to payment page' })).toHaveCount(0);
});
