import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Mobile (390x844) verification that the Generate Vouchers modal keeps its
 * Cancel/Generate buttons visible: the footer is pinned below a scrollable
 * field area instead of living at the bottom of one tall scroll container.
 * Also checked at a shortened viewport (390x560) approximating the space
 * left when browser chrome / keyboard is showing.
 *
 * All backend calls are stubbed via page.route so nothing real is touched;
 * auth is injected into localStorage (AuthContext trusts localStorage).
 */

const RESELLER = {
  id: 7, email: 'reseller@bitwave.test', role: 'reseller',
  organization_name: 'FastNet ISP', subscription_status: 'active',
};

const PLANS = [
  { id: 1, name: 'Home 10Mbps', price: 500 },
  { id: 2, name: 'Biz 20Mbps', price: 1200 },
];

const ROUTERS = [
  { id: 1, name: 'Main Tower' },
  { id: 2, name: 'Estate B' },
];

function json(route: Route, body: unknown) {
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
}

async function stubApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p.endsWith('/vouchers/stats')) {
      return json(route, { total: 0, active: 0, used: 0, expired: 0, disabled: 0, total_value: 0, used_value: 0 });
    }
    if (p.endsWith('/vouchers/compensation-allowance')) {
      return json(route, { daily_limit: 10, used_today: 2, remaining: 8 });
    }
    if (p.endsWith('/vouchers')) return json(route, { vouchers: [], total: 0, has_more: false });
    if (p.endsWith('/plans')) return json(route, PLANS);
    if (p.endsWith('/routers')) return json(route, ROUTERS);
    return json(route, {});
  });
}

async function openModal(page: Page, viewport: { width: number; height: number }) {
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token','test-reseller-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(RESELLER))});
  `);
  await stubApi(page);
  await page.setViewportSize(viewport);
  await page.goto('/vouchers', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;}' }).catch(() => {});
  await page.getByRole('button', { name: 'Generate Vouchers' }).first().click();
  await page.getByRole('heading', { name: 'Generate Vouchers' }).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(300);
}

async function expectFooterVisible(page: Page, viewportHeight: number) {
  const form = page.locator('form[autocomplete="off"]');
  const cancel = form.getByRole('button', { name: 'Cancel' });
  const generate = form.getByRole('button', { name: /Generate/ });
  await expect(cancel).toBeVisible();
  await expect(generate).toBeVisible();
  for (const btn of [cancel, generate]) {
    const box = await btn.boundingBox();
    expect(box, 'button should have a bounding box').toBeTruthy();
    expect(box!.y, 'button top should be on screen').toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height, 'button bottom should be on screen').toBeLessThanOrEqual(viewportHeight + 1);
    // Not covered by app UI (e.g. the mobile bottom nav). The Next.js
    // dev-tools overlay (<nextjs-portal>) only exists in dev — ignore it.
    const coveredBy = await btn.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!hit || hit === el || el.contains(hit)) return null;
      if (hit.closest('nextjs-portal')) return null;
      return `${hit.tagName}.${(hit as HTMLElement).className}`;
    });
    expect(coveredBy, 'button should not be covered by another element').toBeNull();
  }
}

test('generate-vouchers modal buttons visible on mobile', async ({ page }) => {
  await openModal(page, { width: 390, height: 844 });
  await expectFooterVisible(page, 844);
  await page.screenshot({ path: 'e2e/screens/mobile/voucher-modal-390x844.png' });
});

test('generate-vouchers modal buttons visible on short viewport, fields scrollable', async ({ page }) => {
  await openModal(page, { width: 390, height: 560 });
  await expectFooterVisible(page, 560);

  // The field area must actually scroll so everything stays reachable.
  const scroll = await page.evaluate(() => {
    const form = document.querySelector('form[autocomplete="off"]');
    const body = form?.firstElementChild as HTMLElement | null;
    if (!body) return null;
    return {
      overflowY: getComputedStyle(body).overflowY,
      scrollable: body.scrollHeight > body.clientHeight,
    };
  });
  expect(scroll?.overflowY).toBe('auto');
  await page.screenshot({ path: 'e2e/screens/mobile/voucher-modal-390x560.png' });
});
