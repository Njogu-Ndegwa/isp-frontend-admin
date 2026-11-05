import { expect, test, type Page, type Route } from '@playwright/test';

// The portal customization preview shows what the portal would show: with no
// offers there is no deals section and nothing asks anyone to advertise.
// Backend mocked with payloads shaped like GET /api/ads/manage and GET /api/public/spots.

const RESELLER = { id: 20, email: 'net@example.com', role: 'reseller', organization_name: 'Acme Net', business_name: 'Acme Net', subscription_status: 'active', market_code: 'KE' };
const ASKS_TO_ADVERTISE = /your ad here|advertise here|your business here/i;

const ad = (over: Record<string, unknown> = {}) => ({
  id: 12, title: 'Fresh mandazi', seller_name: 'E2E Test Shop', seller_location: 'By the stage', phone_number: '0722111222',
  price: 'KSH 20', badge_type: 'new', badge_text: 'NEW', placement: 'local', media_type: 'image', image_url: null, poster_url: null,
  status: 'approved', is_active: true, starts_at: null, expires_at: null, slot: 'house', owner_user_id: 20, ...over,
});

const json = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

type Mock = { own?: unknown[]; network?: unknown[]; showAds?: boolean; fail?: boolean };

async function open(page: Page, width: number, { own = [], network = [], showAds = true, fail = false }: Mock) {
  await page.setViewportSize({ width, height: 844 });
  await page.addInitScript((u) => {
    localStorage.setItem('auth_token', 'tok');
    localStorage.setItem('auth_user', JSON.stringify(u));
  }, RESELLER);
  await page.route(/\/api\//, (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api/, '');
    if (path === '/portal/settings') {
      return json(route, {
        settings: { show_ads: showAds, header_style: 'standard', color_theme: 'ocean_blue', welcome_title: 'Welcome' },
        available_themes: [], available_header_styles: [], available_languages: [], available_announcement_types: [], available_plan_sort_orders: [],
      });
    }
    if (path === '/ads/manage') return fail ? route.fulfill({ status: 500, json: { detail: 'boom' } }) : json(route, { ads: own, pagination: {} });
    if (path === '/public/spots') return fail ? route.abort('failed') : json(route, { ads: network, pagination: {} });
    if (path === '/plans') return json(route, []);
    return json(route, {});
  });
  await page.goto('/settings/portal-customization');
  if (width < 1280) await page.getByRole('button', { name: 'Open preview' }).click();
  await expect(page.locator('.pp-plans-title:visible')).toBeVisible();
  // Give the offers call time to answer, so an empty result is really empty.
  await page.waitForLoadState('networkidle');
}

const strip = (page: Page) => page.locator('.pp-ads:visible');

test.describe.configure({ mode: 'parallel' });

for (const width of [375, 1280]) {
  test(`${width}px: no ads, no section, and nothing asking to advertise`, async ({ page }) => {
    await open(page, width, {});
    await expect(strip(page)).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(ASKS_TO_ADVERTISE);
    await expect(page.locator('body')).not.toContainText('Soko Deals Today');
    await expect(page.locator('body')).not.toContainText('Fresh Maize');
    await page.screenshot({ path: `test-results/preview-no-ads-${width}.png` });
  });

  test(`${width}px: real offers show, with no empty ask at the end`, async ({ page }) => {
    await open(page, width, { own: [ad()], network: [ad({ id: 30, title: 'Network offer', badge_text: null, badge_type: null, seller_location: null })] });
    await expect(strip(page)).toBeVisible();
    await expect(strip(page).locator('.pp-ad-card')).toHaveCount(2);
    await expect(strip(page)).toContainText('Fresh mandazi');
    await expect(strip(page)).toContainText('E2E Test Shop - By the stage');
    await expect(strip(page)).toContainText('Network offer');
    await expect(strip(page)).not.toContainText(ASKS_TO_ADVERTISE);
    await page.screenshot({ path: `test-results/preview-with-ads-${width}.png` });
  });
}

test('a live hero ad hides the strip, as on the portal', async ({ page }) => {
  await open(page, 375, { own: [ad({ placement: 'hero' })], network: [ad({ id: 30 })] });
  await expect(strip(page)).toHaveCount(0);
});

test('a paused ad does not show', async ({ page }) => {
  await open(page, 375, { own: [ad({ is_active: false })] });
  await expect(strip(page)).toHaveCount(0);
});

test('Show Ads off hides real offers too', async ({ page }) => {
  await open(page, 375, { own: [ad()], showAds: false });
  await expect(strip(page)).toHaveCount(0);
});

test('failed offer calls leave the page working, with no section and no alert', async ({ page }) => {
  await open(page, 375, { fail: true });
  await expect(strip(page)).toHaveCount(0);
  await expect(page.locator('.pp-plans-title:visible')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('boom');
});
