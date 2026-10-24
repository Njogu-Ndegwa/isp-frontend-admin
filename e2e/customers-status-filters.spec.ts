import { expect, test, type Page, type Route } from '@playwright/test';

// Customers page: Online / Offline / Overdue status filters and plan-name
// search, against a mocked API.

const RESELLER = {
  id: 7,
  email: 'reseller@bitwave.test',
  role: 'reseller',
  organization_name: 'FastNet ISP',
  subscription_status: 'active',
};

const FUTURE = '2099-01-01T00:00:00';
const PAST = '2026-01-01T00:00:00';

const PUSH_ROUTER = { id: 21, name: 'Push Router' };
const POLLED_ROUTER = { id: 22, name: 'Polled Router' };

const CUSTOMERS = [
  {
    id: 201, name: 'Alice Online', phone: '+254700000201', mac_address: 'AA:00:00:00:02:01',
    status: 'active', expiry: FUTURE, connection_type: 'hotspot',
    plan: { id: 1, name: 'Daily 5GB', price: 50, connection_type: 'hotspot' },
    router: PUSH_ROUTER, router_id: PUSH_ROUTER.id,
  },
  {
    id: 202, name: 'Brian Lapsed', phone: '+254700000202', mac_address: 'AA:00:00:00:02:02',
    status: 'inactive', expiry: PAST, connection_type: 'hotspot',
    plan: { id: 1, name: 'Daily 5GB', price: 50, connection_type: 'hotspot' },
    router: PUSH_ROUTER, router_id: PUSH_ROUTER.id,
  },
  {
    id: 203, name: 'Carol Fibre', phone: '+254700000203', mac_address: '',
    status: 'active', expiry: FUTURE, connection_type: 'pppoe', pppoe_username: 'carol-fibre',
    plan: { id: 2, name: 'Gold Monthly', price: 2500, connection_type: 'pppoe' },
    router: POLLED_ROUTER, router_id: POLLED_ROUTER.id,
  },
  {
    id: 204, name: 'Dan Grace', phone: '+254700000204', mac_address: '',
    status: 'active', expiry: PAST, in_grace: true, grace_period_minutes: 1440,
    effective_expiry: FUTURE, connection_type: 'pppoe', pppoe_username: 'dan-fibre',
    plan: { id: 3, name: 'Silver Monthly', price: 1500, connection_type: 'pppoe' },
    router: POLLED_ROUTER, router_id: POLLED_ROUTER.id,
  },
  {
    id: 205, name: 'Eve Paid', phone: '+254700000205', mac_address: 'AA:00:00:00:02:05',
    status: 'active', expiry: FUTURE, connection_type: 'hotspot',
    plan: { id: 1, name: 'Daily 5GB', price: 50, connection_type: 'hotspot' },
    router: PUSH_ROUTER, router_id: PUSH_ROUTER.id,
  },
];

function json(route: Route, body: unknown) {
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
}

function pppoeUser(username: string, online: boolean) {
  return {
    username, service: 'pppoe', profile: '', disabled: false, comment: '', online,
    address: online ? '10.10.0.2' : null, uptime: online ? '1h' : null, caller_id: null,
    upload_bytes: 0, download_bytes: 0, upload_rate: '0', download_rate: '0', max_limit: '',
    last_logged_out: '', last_disconnect_reason: '', last_caller_id: '', customer: null,
  };
}

async function setup(page: Page, calls: { realtime: number }) {
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('customers.filter.status');
    localStorage.removeItem('customers.filter.connection');
    localStorage.setItem('auth_token', 'test-reseller-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(RESELLER))});
  `);
  await page.route('**/_vercel/insights/script.js', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith('/realtime/customers/online')) {
      calls.realtime += 1;
      return json(route, { router_ids: [PUSH_ROUTER.id], online_customer_ids: [201] });
    }
    if (path.endsWith('/realtime/routers')) return json(route, [PUSH_ROUTER.id]);
    if (path.endsWith('/customers/usage/bulk')) return json(route, []);
    if (path.endsWith('/customers/active') || path.endsWith('/customers')) {
      const rows = path.endsWith('/active') ? CUSTOMERS.filter((c) => c.status === 'active') : CUSTOMERS;
      const pageNumber = Number(url.searchParams.get('page') || 1);
      const perPage = Number(url.searchParams.get('per_page') || rows.length);
      const start = (pageNumber - 1) * perPage;
      return json(route, {
        data: rows.slice(start, start + perPage), page: pageNumber, per_page: perPage,
        total: rows.length, total_pages: Math.ceil(rows.length / perPage),
      });
    }
    if (/\/pppoe\/\d+\/users$/.test(path)) {
      return json(route, {
        router_id: POLLED_ROUTER.id, router_name: POLLED_ROUTER.name, success: true, cached: false,
        router_reachable: true, cache_age_seconds: 0,
        users: [pppoeUser('carol-fibre', true), pppoeUser('dan-fibre', false)],
        summary: { total: 2, online: 1, offline: 1, disabled: 0 },
      });
    }
    if (/\/hotspot\/\d+\/users$/.test(path)) {
      return json(route, {
        router_id: Number(path.split('/').at(-2)), success: true, cached: false,
        router_reachable: true, cache_age_seconds: 0, users: [],
        summary: { total: 0, online: 0, offline: 0, disabled: 0 },
      });
    }
    if (path.endsWith('/messaging/inbox')) return json(route, { unread: 0, messages: [] });
    return json(route, {});
  });
}

function row(page: Page, name: string) {
  return page.getByRole('row', { name: new RegExp(name) });
}

async function expectRows(page: Page, visible: string[], hidden: string[]) {
  for (const name of visible) await expect(row(page, name)).toBeVisible({ timeout: 15_000 });
  for (const name of hidden) await expect(row(page, name)).toHaveCount(0);
}

test('status pills list customers online now, offline now and overdue', async ({ page }) => {
  const calls = { realtime: 0 };
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await setup(page, calls);
  await page.goto('/customers', { waitUntil: 'domcontentloaded' });

  const pills = page.getByRole('tablist', { name: 'Filter by status' });
  await expect(row(page, 'Alice Online')).toBeVisible({ timeout: 20_000 });

  await pills.getByRole('tab', { name: /^Online/ }).click();
  // Alice: online per the real-time push. Carol: online per the PPPoE monitor.
  await expectRows(page, ['Alice Online', 'Carol Fibre'], ['Brian Lapsed', 'Dan Grace', 'Eve Paid']);
  await expect(pills.getByRole('tab', { name: /^Online/ })).toHaveText(/2/);
  await expect(pills.getByRole('tab', { name: /^Offline/ })).toHaveText(/1/);
  expect(calls.realtime).toBeGreaterThan(0);

  // Offline: paid up but not connected. Overdue customers are not listed here.
  await pills.getByRole('tab', { name: /^Offline/ }).click();
  await expectRows(page, ['Eve Paid'], ['Alice Online', 'Carol Fibre', 'Brian Lapsed', 'Dan Grace']);

  // Overdue: paid expiry has passed, including a customer still in grace.
  await pills.getByRole('tab', { name: /^Overdue/ }).click();
  await expectRows(page, ['Brian Lapsed', 'Dan Grace'], ['Alice Online', 'Carol Fibre', 'Eve Paid']);
  await expect(pills.getByRole('tab', { name: /^Overdue/ })).toHaveText(/2/);

  // Online / Offline still split each connection tab.
  await pills.getByRole('tab', { name: /^Online/ }).click();
  await page.getByRole('tab', { name: /PPPoE/ }).click();
  await expectRows(page, ['Carol Fibre'], ['Alice Online', 'Brian Lapsed', 'Dan Grace', 'Eve Paid']);

  expect(pageErrors).toEqual([]);
});

test('search matches the plan name', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await setup(page, { realtime: 0 });
  await page.goto('/customers', { waitUntil: 'domcontentloaded' });
  await expect(row(page, 'Alice Online')).toBeVisible({ timeout: 20_000 });

  await page.getByRole('tablist', { name: 'Filter by status' }).getByRole('tab', { name: /^All/ }).click();
  await page.getByPlaceholder(/or plan/).fill('gold');
  await expectRows(page, ['Carol Fibre'], ['Alice Online', 'Brian Lapsed', 'Dan Grace']);

  await page.getByPlaceholder(/or plan/).fill('daily 5gb');
  await expectRows(page, ['Alice Online', 'Brian Lapsed', 'Eve Paid'], ['Carol Fibre', 'Dan Grace']);
});

test('status pills fit a phone screen and still filter', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 375, height: 812 });
  await setup(page, { realtime: 0 });
  await page.goto('/customers', { waitUntil: 'domcontentloaded' });

  const pills = page.getByRole('tablist', { name: 'Filter by status' });
  await expect(pills).toBeVisible({ timeout: 20_000 });
  // The pill row scrolls inside itself; the page never scrolls sideways.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const overdue = pills.getByRole('tab', { name: /^Overdue/ });
  await overdue.scrollIntoViewIfNeeded();
  await overdue.click();
  await expect(page.getByText('Dan Grace').locator('visible=true').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Eve Paid')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
