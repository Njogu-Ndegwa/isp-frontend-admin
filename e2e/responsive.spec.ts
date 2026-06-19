import { test, expect, type Page } from '@playwright/test';
import { WIDTHS, RESELLER_PAGES, ADMIN_PAGES, PUBLIC_PAGES } from './pages';

function demoInit(role: 'reseller' | 'admin') {
  const user = {
    id: 0, email: 'demo@bitwave.co.ke', role,
    organization_name: 'Demo ISP Network', subscription_status: 'trial',
  };
  return `
    localStorage.setItem('demo_mode','true');
    localStorage.setItem('auth_token','demo-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(user))});
  `;
}

async function checkPage(page: Page, role: 'reseller' | 'admin' | null, path: string, width: number) {
  if (role) await page.addInitScript(demoInit(role));
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  // Wait for the app shell to mount (auth resolves -> <main> renders; the auth
  // loading spinner has no <main>), so we assert against real content. Use
  // 'attached' (not 'visible') to avoid blocking on a breakpoint-hidden element,
  // and skip networkidle — demo-mode pages keep some backend fetches pending.
  await page.waitForSelector('main', { state: 'attached', timeout: 15_000 }).catch(() => {});
  // Freeze animations/transitions so screenshots capture the settled layout.
  await page
    .addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;}' })
    .catch(() => {});
  await page.waitForTimeout(500); // settle async data / cards / charts

  const { scrollW, clientW, offenders } = await page.evaluate(() => {
    const de = document.documentElement;
    const clientW = de.clientWidth;
    // Collect elements that extend past the viewport's right edge — useful for debugging.
    const offenders: string[] = [];
    if (de.scrollWidth > clientW + 1) {
      for (const el of Array.from(document.body.querySelectorAll('*'))) {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.right > clientW + 1 && r.width > 0 && r.height > 0) {
          const e = el as HTMLElement;
          const id = e.id ? `#${e.id}` : '';
          const cls = typeof e.className === 'string' && e.className
            ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.')
            : '';
          offenders.push(`${e.tagName.toLowerCase()}${id}${cls} (right=${Math.round(r.right)})`);
        }
      }
    }
    return { scrollW: de.scrollWidth, clientW, offenders: offenders.slice(0, 8) };
  });

  await page.screenshot({
    path: `e2e/screens/${role ?? 'public'}${path.replace(/\//g, '_')}-${width}.png`,
    fullPage: true,
  });

  expect(
    scrollW,
    `horizontal overflow on ${path} @ ${width}px (scrollW ${scrollW} > clientW ${clientW}). Offenders: ${offenders.join(' | ') || 'n/a'}`,
  ).toBeLessThanOrEqual(clientW + 1);
}

test.describe('responsive: no horizontal overflow', () => {
  for (const path of RESELLER_PAGES) for (const w of WIDTHS) {
    test(`reseller ${path} @ ${w}`, async ({ page }) => checkPage(page, 'reseller', path, w));
  }
  for (const path of ADMIN_PAGES) for (const w of WIDTHS) {
    test(`admin ${path} @ ${w}`, async ({ page }) => checkPage(page, 'admin', path, w));
  }
  for (const path of PUBLIC_PAGES) for (const w of WIDTHS) {
    test(`public ${path} @ ${w}`, async ({ page }) => checkPage(page, null, path, w));
  }
});

test('admin desktop sidebar stays available after navigating to routers', async ({ page }) => {
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token','test-admin-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify({
      id: 1,
      email: 'admin@bitwave.test',
      role: 'admin',
      organization_name: 'Bitwave Admin',
      subscription_status: 'active',
    }))});
  `);
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/admin/resellers/stats') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          period: '30d',
          revenue_over_time: [],
          signups_over_time: [],
          totals: { revenue: 0, mpesa_revenue: 0, new_resellers: 0 },
        }),
      });
      return;
    }
    if (url.pathname === '/api/admin/resellers') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          total: 1,
          filters_applied: { sort_by: 'created_at', sort_order: 'desc', filter: null, search: null },
          resellers: [{
            id: 1,
            email: 'demo@isp.test',
            organization_name: 'Demo ISP',
            business_name: 'Demo ISP',
            support_phone: '+254700000000',
            mpesa_shortcode: '123456',
            created_at: '2026-06-01T00:00:00Z',
            last_login_at: '2026-06-18T00:00:00Z',
            total_revenue: 1000,
            mpesa_revenue: 800,
            total_customers: 10,
            active_customers: 8,
            last_payment_date: '2026-06-18T00:00:00Z',
            router_count: 1,
            unpaid_balance: 0,
          }],
        }),
      });
      return;
    }
    if (url.pathname === '/api/routers') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 1,
          name: 'Core Router',
          identity: 'core-router',
          ip_address: '10.0.0.1',
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
        }]),
      });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({}) });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/admin/resellers', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('main', { state: 'attached', timeout: 15_000 });

  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();

  await sidebar.getByRole('link', { name: 'Routers' }).click();
  await expect(page).toHaveURL(/\/routers$/);
  await expect(page.getByRole('heading', { name: 'Routers' })).toBeVisible();
  await expect(page.getByText('Manage your MikroTik routers and hotspot users')).toBeVisible();
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible();

  await sidebar.getByRole('link', { name: 'Dashboard' }).click();
  await expect(page).toHaveURL(/\/admin$/);
});
