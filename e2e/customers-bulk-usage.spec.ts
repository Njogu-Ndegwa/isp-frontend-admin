import { expect, test, type Page, type Route } from '@playwright/test';

const RESELLER = {
  id: 7,
  email: 'reseller@bitwave.test',
  role: 'reseller',
  organization_name: 'FastNet ISP',
  subscription_status: 'active',
};

const CUSTOMERS = [
  {
    id: 101,
    name: 'Alice Fibre',
    phone: '+254700000101',
    mac_address: '',
    status: 'active',
    expiry: '2026-09-01T12:00:00Z',
    hours_remaining: 24,
    connection_type: 'pppoe',
    pppoe_username: 'alice-fibre',
    plan: { id: 1, name: 'Home Fibre', price: 1500, connection_type: 'pppoe' },
    router: { id: 11, name: 'Main Router' },
    router_id: 11,
  },
  {
    id: 102,
    name: 'Bob Hotspot',
    phone: '+254700000102',
    mac_address: 'AA:BB:CC:DD:EE:02',
    status: 'active',
    expiry: '2026-09-01T12:00:00Z',
    hours_remaining: 24,
    connection_type: 'hotspot',
    plan: { id: 2, name: 'Hotspot Plus', price: 500, connection_type: 'hotspot' },
    router: { id: 12, name: 'Estate Router' },
    router_id: 12,
  },
];

const PERIOD_BASE = {
  period_start: '2026-08-01T00:00:00Z',
  period_end: '2026-09-01T00:00:00Z',
  upload_mb: 100,
  download_mb: 1436,
  cap_mb: 2048,
  percent_used: 75,
  fup_action: null,
  fup_triggered_at: null,
  fup_action_taken: null,
  fup_reverted_at: null,
  fup_active: false,
  closed_at: null,
};

function json(route: Route, body: unknown) {
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
}

async function authenticate(page: Page) {
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token', 'test-reseller-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(RESELLER))});
  `);
}

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`customers usage is rendered through one bulk request on ${viewport.name}`, async ({ page }) => {
    let bulkCalls = 0;
    let legacyCalls = 0;
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (message) => {
      if (
        message.type() === 'error'
        && !message.text().includes('eval() is not supported in this environment')
      ) {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await authenticate(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;

      if (/\/api\/customers\/\d+\/usage$/.test(path)) {
        legacyCalls += 1;
        return json(route, {});
      }
      if (path.endsWith('/customers/usage/bulk')) {
        bulkCalls += 1;
        expect(request.method()).toBe('POST');
        expect(request.headers().authorization).toBe('Bearer test-reseller-token');
        expect(request.postDataJSON()).toEqual({ customer_ids: [101, 102] });
        return json(route, [
          {
            customer_id: 101,
            connection_type: 'pppoe',
            pppoe_username: 'alice-fibre',
            plan_name: 'Home Fibre',
            plan_data_cap_mb: 2048,
            plan_fup_action: null,
            period: { ...PERIOD_BASE, id: 501, total_mb: 1536 },
          },
          {
            customer_id: 102,
            connection_type: 'hotspot',
            pppoe_username: null,
            plan_name: 'Hotspot Plus',
            plan_data_cap_mb: null,
            plan_fup_action: null,
            period: { ...PERIOD_BASE, id: 502, total_mb: 512, cap_mb: null, percent_used: 0 },
          },
        ]);
      }
      if (path.endsWith('/customers/active') || path.endsWith('/customers')) {
        const pageNumber = Number(url.searchParams.get('page') || 1);
        const perPage = Number(url.searchParams.get('per_page') || CUSTOMERS.length);
        const start = (pageNumber - 1) * perPage;
        return json(route, {
          data: CUSTOMERS.slice(start, start + perPage),
          page: pageNumber,
          per_page: perPage,
          total: CUSTOMERS.length,
          total_pages: Math.ceil(CUSTOMERS.length / perPage),
        });
      }
      if (/\/pppoe\/\d+\/users$/.test(path) || /\/hotspot\/\d+\/users$/.test(path)) {
        return json(route, {
          router_id: Number(path.split('/').at(-2)),
          router_name: 'Test Router',
          generated_at: '2026-08-31T00:00:00Z',
          success: true,
          cached: false,
          router_reachable: true,
          cache_age_seconds: 0,
          users: [],
          summary: { total: 0, online: 0, offline: 0, disabled: 0 },
        });
      }
      if (path.endsWith('/messaging/inbox')) return json(route, { unread: 0, messages: [] });
      return json(route, {});
    });

    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    const alice = viewport.name === 'desktop'
      ? page.getByRole('row', { name: /Alice Fibre/ })
      : page.getByRole('link', { name: /Alice Fibre/ });
    const bob = viewport.name === 'desktop'
      ? page.getByRole('row', { name: /Bob Hotspot/ })
      : page.getByRole('link', { name: /Bob Hotspot/ });
    // The first page compile can take longer when the full suite starts four
    // workers at once. Wait for the real customer content, not a fixed delay.
    await expect(alice).toBeVisible({ timeout: 15_000 });
    await expect(bob).toBeVisible({ timeout: 15_000 });
    await expect(alice).toContainText('1.50 GB');
    await expect(bob).toContainText('512 MB');
    await expect.poll(() => bulkCalls).toBe(1);
    expect(legacyCalls).toBe(0);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}
