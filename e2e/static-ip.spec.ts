import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`static customers can be monitored, suspended and resumed at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/_vercel/insights/script.js', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
    const user = { id: 7, email: 'static@example.test', role: 'reseller', subscription_status: 'active' };
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'test-static-token');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.removeItem('demo_mode');
    }, user);
    const plan = { id: 1, name: 'Static 10M', connection_type: 'static_ip', speed: '10M/10M', price: 1500, duration_value: 30, duration_unit: 'days' };
    const customer = { id: 101, name: 'Static Test', phone: 'N/A', account_number: 'ST12345', connection_type: 'static_ip', static_ip: '192.168.2.24', static_mac: '50:0F:F5:C1:07:50', status: 'active', expiry: '2099-11-12T00:00:00', plan, plan_id: 1, router_id: 11, router: { id: 11, name: 'Test Router' } };
    const mutations: string[] = [];
    let registration: Record<string, unknown> | null = null;
    const live = { online: true, ip: customer.static_ip, rate_up_bps: 1000000, rate_down_bps: 2000000, max_limit: '10M/10M', queue_status: 'ok', stale: false, sample_age_seconds: 1 };
    const usage = { customer_id: 101, connection_type: 'static_ip', plan_name: plan.name, plan_data_cap_mb: null, period: null, live };
    await page.route('**/api/**', async route => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      if (path.endsWith('/customers/register')) {
        registration = req.postDataJSON();
        return json({ ...customer, id: 102, ...registration });
      }
      if (path.endsWith('/static/status')) return json({
        customer_id: 101, static_ip: customer.static_ip, static_mac: customer.static_mac,
        status: customer.status, expiry: customer.expiry, router_name: 'Test Router',
        expected_access: customer.status === 'active' ? 'enabled' : 'suspended',
        actual_access: customer.status === 'active' ? 'enabled' : 'suspended',
        router: { reachable: true, gateway_ok: true, pinned_mac: customer.static_mac,
          observed_mac: customer.static_mac, host: { mac: customer.static_mac },
          queue: { max_limit: '10M/10M', shadowed: false } },
      });
      if (req.method() === 'POST' && /\/(suspend-static|resume-static|activate-static|static\/sync)$/.test(path)) {
        mutations.push(path);
        if (path.endsWith('/suspend-static')) customer.status = 'inactive';
        if (path.endsWith('/resume-static') || path.endsWith('/activate-static')) customer.status = 'active';
        return json({ success: true, customer_id: 101, router_result: 'ok', changes: [], status: customer.status });
      }
      if (path.endsWith('/customers/101') && req.method() === 'DELETE') {
        mutations.push(path);
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Router unavailable; customer was not deleted' }) });
      }
      if (path.endsWith('/customers/usage/bulk')) return json([usage]);
      if (path.endsWith('/customers/101/usage')) return json(usage);
      if (path.endsWith('/usage/timeline')) return json({ points: [], total_mb: 0, window_start: '2026-10-01', window_end: '2026-10-13', granularity: 'day' });
      if (path.endsWith('/usage/history') || path.endsWith('/mpesa/transactions')) return json([]);
      if (path.endsWith('/payment-summary')) return route.fulfill({ status: 404, body: '{}' });
      if (path.endsWith('/plans')) return json([plan]);
      if (path.endsWith('/routers')) return json([{ id: 11, name: 'Test Router' }]);
      if (path.endsWith('/customers') || path.endsWith('/customers/active')) return json([customer]);
      if (path.endsWith('/messaging/inbox')) return json({ unread: 0, messages: [] });
      return json({});
    });

    await page.goto('/customers');
    await page.getByRole('tab', { name: /Static IP/ }).click();
    await expect(page.getByText('Static IP · 192.168.2.24').filter({ visible: true })).toBeVisible();
    await expect(page.getByText('Online', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    // Same quick actions as PPPoE: an active static customer can be suspended from the list.
    await expect(page.getByTitle(/^(Suspend|Suspend static IP)$/).filter({ visible: true }).first()).toBeVisible();
    await page.goto('/customers/101');
    await expect(page.getByRole('heading', { name: 'Static IP control' })).toBeVisible();
    await expect(page.getByText('Paybill Payment Instructions')).toBeVisible();
    await page.getByRole('button', { name: 'Suspend now' }).click();
    await page.getByRole('button', { name: 'Suspend', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Resume remaining access' })).toBeVisible();
    await page.getByRole('button', { name: 'Resume remaining access' }).click();
    await expect(page.getByText('Enabled', { exact: true })).toBeVisible();
    expect(mutations.filter(x => x.endsWith('activate-static'))).toHaveLength(0);
    await page.getByRole('button', { name: 'Re-sync router' }).click();
    await expect.poll(() => mutations.some(x => x.endsWith('/static/sync'))).toBe(true);
    await page.getByRole('button', { name: 'Record payment & activate' }).click();
    await page.getByLabel('Payment method').selectOption('cash');
    await page.getByLabel('Reference (optional)').fill('Cash test');
    await page.getByRole('button', { name: 'Record payment', exact: true }).click();
    await expect.poll(() => mutations.some(x => x.endsWith('/activate-static'))).toBe(true);
    await expect(page.getByRole('heading', { name: 'Static IP control' })).toBeVisible();
    await page.getByRole('button', { name: /Delete Customer/i }).first().click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Router unavailable; customer was not deleted')).toBeVisible();
    await expect(page).toHaveURL(/\/customers\/101$/);
    await page.goto('/customers/register');
    await page.getByLabel('Customer Name').fill('New static customer');
    await page.getByLabel('Phone Number').fill('254700000001');
    await page.getByLabel('Plan', { exact: true }).selectOption('1');
    await page.getByLabel('Router', { exact: true }).selectOption('11');
    await page.getByLabel('Static IP address').fill('192.168.2.25');
    await page.getByLabel('Device MAC (optional)').fill('AA:BB:CC:DD:EE:FF');
    await page.getByRole('button', { name: 'Register Customer', exact: true }).click();
    await expect(page).toHaveURL(/\/customers$/);
    expect(registration).toMatchObject({ static_ip: '192.168.2.25', static_mac: 'AA:BB:CC:DD:EE:FF', router_id: 11, plan_id: 1 });
    expect(registration).not.toHaveProperty('mac_address');
    if (viewport.width === 390) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.evaluate(() => window.scrollTo(0, 0));
      const nav = page.locator('nav.fixed');
      await expect(nav).toBeVisible();
      const box = await nav.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(389);
      await expect(nav.getByRole('link')).toHaveCount(5);
      // The dev-tools badge (<nextjs-portal>) only exists in dev and can sit over the nav.
      await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
      for (const link of await nav.getByRole('link').all()) await link.click({ trial: true });
    }
    expect(errors).toEqual([]);
  });
}
