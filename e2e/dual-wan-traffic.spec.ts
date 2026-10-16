import { expect, test, type Page } from '@playwright/test';
import { demoRouters, demoPortAnalytics, demoDashboardAnalytics, demoBandwidthHistory, demoTopUsers, demoRevenueOverTime } from '../app/lib/demoData';

async function openDashboard(page: Page, mode: 'flowing' | 'missing' | 'stale' | 'down' = 'flowing') {
  await page.addInitScript(() => {
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token', 'local-wan-test');
    localStorage.setItem('auth_user', JSON.stringify({ id: 679, role: 'reseller', email: 'wan@example.test', subscription_status: 'active' }));
    localStorage.setItem('onboarding_checklist_dismissed', 'true');
  });
  await page.route('**/_vercel/insights/script.js', route => route.fulfill({ body: '', contentType: 'application/javascript' }));
  const router = { ...demoRouters[0], id: 606, name: 'Dual-WAN test router', lb_enabled: true, lb_config: { wan_ports: ['ether1', 'ether2'] } };
  const analytics = demoPortAnalytics(1);
  analytics.router.id = 606;
  analytics.router.name = router.name;
  analytics.warnings = [];
  analytics.ports = analytics.ports.map(p => ['ether1', 'ether2'].includes(p.port)
    ? { ...p, bridge: '', counts: { ...p.counts, learned_macs: 0 }, downstream_devices_sample: [],
      link: { ...p.link, up: !(mode === 'down' && p.port === 'ether2'), rate: '1Gbps' },
      health: { status: mode === 'down' && p.port === 'ether2' ? 'down' : 'active', warnings: [] } } : p);
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = {};
    if (path.endsWith('/routers')) body = [router];
    else if (path.endsWith('/port-analytics')) body = analytics;
    else if (path.endsWith('/live')) {
      if (mode === 'missing') return route.fulfill({ status: 404, json: { detail: 'No report yet' } });
      body = { router_id: 606, report_age_seconds: mode === 'stale' ? 600 : 12, interval_seconds: 60,
        ports: [
          { name: 'ether1', running: true, rx_bps: 80_000_000, tx_bps: 4_000_000 },
          { name: 'ether2', running: mode !== 'down', rx_bps: 76_000_000, tx_bps: 3_900_000 },
        ] };
    } else if (path.endsWith('/dashboard/analytics')) body = demoDashboardAnalytics;
    else if (path.endsWith('/bandwidth-history')) body = demoBandwidthHistory;
    else if (path.endsWith('/top-users')) body = demoTopUsers;
    else if (path.endsWith('/mikrotik/health')) body = { router_id: 606, bandwidth: { download_mbps: 999, upload_mbps: 999 } };
    else if (path.includes('/subscription')) body = { status: 'active', pending_invoice: null };
    else if (path.includes('notifications')) body = { notifications: [], unread_count: 0 };
    else if (path.includes('revenue')) body = demoRevenueOverTime();
    await route.fulfill({ json: body });
  });
  await page.goto('/dashboard');
  await expect(page.getByRole('region', { name: 'Internet links' })).toBeVisible();
}

test('shows each modem rate, recognizes WAN2, and refreshes without live sampling', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await openDashboard(page);
  await expect(page.getByTestId('ether1-wan-download')).toHaveText('80.0 Mbps');
  await expect(page.getByTestId('ether2-wan-download')).toHaveText('76.0 Mbps');
  await expect(page.getByTestId('ether2-wan-upload')).toHaveText('3.9 Mbps');
  await expect(page.getByText('Traffic flowing', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'WAN 2 · ether2', exact: true }).click();
  await expect(page.getByText('WAN uplink — brings the internet into this router.')).toBeVisible();
  await expect(page.getByRole('button', { name: /ether2 · Uplink/ })).toBeVisible();
  await expect(page.getByText('0 devices ·', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Refresh dashboard' }).click();
  await expect(page.getByTestId('ether2-wan-download')).toHaveText('76.0 Mbps');
  expect(requests.filter(url => url.includes('/uplink-traffic'))).toHaveLength(0);
  expect(errors).toEqual([]);
});

for (const mode of ['missing', 'stale', 'down'] as const) {
  test(`${mode} report does not claim WAN2 is carrying traffic`, async ({ page }) => {
    await openDashboard(page, mode);
    const card = page.getByLabel('WAN 2 · ether2', { exact: true });
    await expect(card.getByText('Traffic flowing', { exact: true })).toHaveCount(0);
    await expect(card.getByText(mode === 'missing' ? 'Waiting for traffic report' : mode === 'stale' ? 'Report is stale' : 'Link down', { exact: true })).toBeVisible();
    if (mode !== 'stale') await expect(page.getByTestId('ether2-wan-download')).toHaveText('—');
  });
}

test('WAN cards and all five mobile navigation items remain usable after scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDashboard(page);
  await expect(page.getByTestId('ether2-wan-download')).toHaveText('76.0 Mbps');
  const nav = page.locator('nav.fixed.bottom-0');
  for (const y of [1800, 0]) {
    await page.evaluate(y => window.scrollTo(0, y), y);
    await expect(nav).toBeVisible();
    const bounds = await nav.boundingBox();
    expect(bounds?.x).toBe(0);
    expect(bounds?.width).toBe(390);
    const links = nav.getByRole('link');
    await expect(links).toHaveCount(5);
    for (const link of await links.all()) await link.click({ trial: true });
  }
  await page.getByRole('button', { name: 'WAN 2 · ether2', exact: true }).click();
  await expect(page.getByRole('button', { name: /ether2 · Uplink/ })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  if (process.env.WAN_SCREENSHOT_DIR) {
    await page.getByRole('region', { name: 'Internet links' }).evaluate(el => window.scrollBy(0, el.getBoundingClientRect().top - 190));
    await page.screenshot({ path: `${process.env.WAN_SCREENSHOT_DIR}/wan-links-mobile.png` });
  }
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  const diagnostics = page.getByRole('link', { name: 'Diagnostics', exact: true }).filter({ visible: true });
  await diagnostics.click();
  await expect(page).toHaveURL(/\/diagnostics$/);
});
