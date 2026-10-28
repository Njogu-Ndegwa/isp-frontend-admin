import { expect, test, type Page, type Route } from '@playwright/test';

// "Activate without payment" in the Activate popup (customer list) and the
// static-IP panel, against a mocked API. The request must carry
// payment_method "none"; the backend records no money for it.

const OWNER = { id: 7, email: 'owner@bitwave.test', role: 'reseller', organization_name: 'FastNet ISP', subscription_status: 'active' };
const PAST = '2026-01-01T00:00:00';
const ROUTER = { id: 22, name: 'Fibre Router' };
const PPPOE_PLAN = { id: 2, name: 'Gold Monthly', price: 2500, connection_type: 'pppoe', duration_value: 30, duration_unit: 'days' };
const STATIC_PLAN = { id: 3, name: 'Static 10M', price: 1500, connection_type: 'static_ip', speed: '10M/10M', duration_value: 30, duration_unit: 'days' };

function customers() {
  return [
    {
      id: 301, name: 'Brian Lapsed', phone: '+254700000301', mac_address: '', status: 'inactive', expiry: PAST,
      connection_type: 'pppoe', pppoe_username: 'brian-fibre', plan: PPPOE_PLAN, plan_id: 2,
      router: ROUTER, router_id: ROUTER.id,
    },
    {
      id: 302, name: 'Static Lapsed', phone: 'N/A', account_number: 'ST302', status: 'inactive', expiry: PAST,
      connection_type: 'static_ip', static_ip: '192.168.2.40', static_mac: null, plan: STATIC_PLAN, plan_id: 3,
      router: ROUTER, router_id: ROUTER.id,
    },
  ];
}

function json(route: Route, body: unknown) {
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
}

async function setup(page: Page, user: Record<string, unknown>, activations: Record<string, unknown>[]) {
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('customers.filter.status');
    localStorage.removeItem('customers.filter.connection');
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(user))});
  `);
  await page.route('**/_vercel/insights/script.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }));
  const rows = customers();
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path.endsWith('/staff/me')) {
      const staff = user.staff as { permissions: string[] } | undefined;
      if (!staff) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      return json(route, { is_staff: true, staff, permissions: staff.permissions });
    }
    if (/\/activate-(pppoe|static)$/.test(path) && req.method() === 'POST') {
      activations.push({ path, ...(req.postDataJSON() as Record<string, unknown>) });
      return json(route, { success: true, status: 'active', expiry: '2099-01-01T00:00:00', payment_recorded: false, router_result: 'ok', provision_result: 'ok', changes: [] });
    }
    if (path.endsWith('/static/status')) {
      return json(route, {
        customer_id: 302, static_ip: '192.168.2.40', static_mac: null, status: 'inactive', expiry: PAST,
        router_name: ROUTER.name, router: { reachable: true, gateway_ok: true, pinned_mac: null, observed_mac: null, enabled: false },
      });
    }
    if (path.endsWith('/customers/302/usage')) {
      return json(route, { customer_id: 302, connection_type: 'static_ip', plan_name: STATIC_PLAN.name, plan_data_cap_mb: null, period: null, live: null });
    }
    if (path.endsWith('/usage/timeline')) {
      return json(route, { points: [], total_mb: 0, window_start: '2026-10-01', window_end: '2026-10-13', granularity: 'day' });
    }
    if (path.endsWith('/customers/302')) return json(route, rows[1]);
    if (path.endsWith('/customers/active') || path.endsWith('/customers')) {
      const list = path.endsWith('/active') ? [] : rows;
      return json(route, { data: list, page: 1, per_page: 50, total: list.length, total_pages: 1 });
    }
    if (path.endsWith('/customers/usage/bulk')) return json(route, []);
    if (path.endsWith('/usage/history') || path.endsWith('/mpesa/transactions')) return json(route, []);
    if (path.endsWith('/payment-summary')) return route.fulfill({ status: 404, body: '{}' });
    if (path.endsWith('/plans')) return json(route, [PPPOE_PLAN, STATIC_PLAN]);
    if (path.endsWith('/routers')) return json(route, [ROUTER]);
    if (path.endsWith('/messaging/inbox')) return json(route, { unread: 0, messages: [] });
    return json(route, {});
  });
}

async function openActivate(page: Page, title: string) {
  await page.goto('/customers', { waitUntil: 'domcontentloaded' });
  const all = page.getByRole('tablist', { name: 'Filter by status' }).getByRole('tab', { name: /^All/ });
  await expect(all).toBeVisible({ timeout: 20_000 });
  await all.click();
  const row = page.getByRole('row', { name: /Brian Lapsed/ });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByTitle(title).click();
}

test('owner activates a PPPoE customer without payment from the list', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  const activations: Record<string, unknown>[] = [];
  await setup(page, OWNER, activations);
  await openActivate(page, 'Activate PPPoE');

  const select = page.locator('select').filter({ has: page.locator('option[value="none"]') });
  await expect(select.locator('option')).toHaveText(['Cash received', 'Paid outside the system', 'Activate without payment']);
  await select.selectOption('none');
  await expect(page.getByTestId('activate-payment-hint')).toHaveText(/No money is recorded/);
  await expect(page.getByText(/sets expiry without recording a payment/)).toBeVisible();

  await page.getByRole('button', { name: 'Activate', exact: true }).click();
  await expect(page.getByText('Brian Lapsed activated without payment')).toBeVisible();
  expect(activations).toEqual([expect.objectContaining({ path: '/api/customers/301/activate-pppoe', payment_method: 'none' })]);
  expect(errors).toEqual([]);
});

test('staff with customers.manage get the option; the default stays cash', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const activations: Record<string, unknown>[] = [];
  const staff = { ...OWNER, email: 'desk@bitwave.test', staff: { id: 5, name: 'Front desk', email: 'desk@bitwave.test', permissions: ['customers.view', 'customers.manage'] } };
  await setup(page, staff, activations);
  await openActivate(page, 'Activate PPPoE');

  await expect(page.locator('option[value="none"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Activate', exact: true }).click();
  await expect(page.getByText('Brian Lapsed activated successfully')).toBeVisible();
  expect(activations).toEqual([expect.objectContaining({ payment_method: 'cash' })]);
});

test('staff without customers.manage see no Activate at all', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const staff = { ...OWNER, email: 'view@bitwave.test', staff: { id: 6, name: 'Viewer', email: 'view@bitwave.test', permissions: ['customers.view'] } };
  await setup(page, staff, []);
  await page.goto('/customers', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tablist', { name: 'Filter by status' }).getByRole('tab', { name: /^All/ }).click();
  const row = page.getByRole('row', { name: /Brian Lapsed/ });
  await expect(row).toBeVisible({ timeout: 20_000 });
  await expect(row.getByTitle('Activate PPPoE')).toHaveCount(0);
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`static-IP panel activates without payment at ${viewport.width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize(viewport);
    const activations: Record<string, unknown>[] = [];
    await setup(page, OWNER, activations);
    await page.goto('/customers/302', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Record payment & activate' }).click({ timeout: 20_000 });
    await page.getByLabel('Payment method').selectOption('none');
    await expect(page.getByRole('heading', { name: 'Activate without payment' })).toBeVisible();
    await expect(page.getByTestId('activate-payment-hint')).toHaveText(/No money is recorded/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await page.getByRole('button', { name: 'Activate without payment', exact: true }).click();
    await expect(page.getByText('Activated without payment and access opened')).toBeVisible();
    expect(activations).toEqual([expect.objectContaining({ path: '/api/customers/302/activate-static', payment_method: 'none' })]);
    expect(errors).toEqual([]);
  });
}
