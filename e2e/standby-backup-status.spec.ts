import { expect, test } from '@playwright/test';


const adminUser = {
  id: 1,
  email: 'admin@bitwave.test',
  role: 'admin',
  organization_name: 'Bitwave Admin',
  subscription_status: 'active',
};


for (const width of [390, 1280]) {
  test(`L2TP standby is clearly shown as inactive at ${width}px`, async ({ page }) => {
    await page.addInitScript(`
      localStorage.removeItem('demo_mode');
      localStorage.setItem('auth_token','test-admin-token');
      localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(adminUser))});
    `);
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/routers') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 83,
            name: 'RouterOS 6 Standby',
            identity: 'routeros-6-standby',
            ip_address: '10.0.0.83',
            port: 8728,
            auth_method: 'DIRECT_API',
            payment_methods: ['mpesa'],
            status: 'online',
            status_is_stale: false,
            emergency_active: false,
            owner_name: 'Demo ISP',
            owner_user_id: 1,
            owner_role: 'reseller',
            owner_subscription_status: 'active',
            token_vpn_type: 'l2tp',
            planned_insurance_tunnel_type: 'l2tp',
            backup_ip: '10.251.0.83',
            insurance_backup_status: 'standby',
            insurance_backup_active: false,
            insurance_backup_verification: {
              mode: 'configured_standby',
              active: false,
              reason: 'L2TP backup is intentionally disabled for single-active failover',
            },
          }]),
        });
        return;
      }
      if (url.pathname.endsWith('/insurance-tunnel-batch/current')) {
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, job: null }) });
        return;
      }
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.setViewportSize({ width, height: 900 });
    await page.goto('/routers', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Routers' })).toBeVisible();
    const standbyBadge = page.locator('span:visible').filter({ hasText: /^Standby \(off\)$/ }).first();
    await expect(standbyBadge).toBeVisible();
    await expect(standbyBadge).toHaveAttribute(
      'title',
      'L2TP backup is configured but intentionally disabled until controlled failover',
    );
    const routerName = page.locator('h3:visible, span:visible').filter({ hasText: /^RouterOS 6 Standby$/ }).first();
    await expect(routerName).toBeVisible();
  });
}
