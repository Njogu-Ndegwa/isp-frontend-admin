import { expect, test, type Page, type Route } from '@playwright/test';

// Per-router portal themes on /settings/portal-customization: a router picker
// ("All routers (default)" plus each router), per-router save that sends only
// the look, and "Reset to Default" for a router.
// Backend mocked statefully with payloads shaped like GET/PUT/DELETE
// /api/portal/router-themes/{id} and GET /api/portal/router-themes.

const RESELLER = { id: 20, email: 'net@example.com', role: 'reseller', organization_name: 'Xtiv Net', business_name: 'Xtiv Net', subscription_status: 'active', market_code: 'KE' };
const THEME_FIELDS = ['color_theme', 'header_style', 'show_welcome_banner', 'welcome_title', 'welcome_subtitle', 'company_logo_url', 'header_bg_image_url', 'footer_text'];

const ACCOUNT = {
  id: 1, user_id: 20, color_theme: 'ocean_blue', header_style: 'hero', show_ads: true, show_welcome_banner: true,
  welcome_title: 'Xtiv WiFi', welcome_subtitle: null, company_logo_url: null,
  header_bg_image_url: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=750&h=370&fit=crop&q=80',
  footer_text: null, portal_support_phone: '0700000001', portal_support_whatsapp: null, show_ratings: true,
  show_reconnect_button: true, show_social_links: false, facebook_url: null, whatsapp_group_url: null, instagram_url: null,
  show_announcement: false, announcement_type: 'info', announcement_text: null, portal_language: 'en',
  plans_section_title: null, featured_plan_ids: null, show_plan_speed: true, plan_sort_order: 'default',
  created_at: null, updated_at: null,
};
const ROUTERS = [{ id: 7, name: 'Shop' }, { id: 8, name: 'Estate' }];

const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

type Calls = { method: string; path: string; body: unknown }[];

async function open(page: Page, { oldBackend = false } = {}) {
  const overrides: Record<number, Record<string, unknown>> = {};
  const calls: Calls = [];
  const own = (id: number) => Object.keys(overrides[id] ?? {}).filter((k) => overrides[id][k] !== null);
  const payload = (id: number) => ({
    router_id: id, router_name: ROUTERS.find((r) => r.id === id)!.name,
    has_override: own(id).length > 0, overridden_fields: own(id), theme_fields: THEME_FIELDS,
    settings: { ...ACCOUNT, ...Object.fromEntries(own(id).map((k) => [k, overrides[id][k]])) },
    account_settings: ACCOUNT,
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  page.on('dialog', (d) => d.accept());
  await page.addInitScript((u) => {
    localStorage.setItem('auth_token', 'tok');
    localStorage.setItem('auth_user', JSON.stringify(u));
  }, RESELLER);
  await page.route(/\/api\//, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
    const method = req.method();
    if (path.startsWith('/portal/')) calls.push({ method, path, body: req.postDataJSON?.() ?? null });
    if (path === '/portal/settings') {
      return json(route, {
        settings: ACCOUNT, available_themes: [], available_header_styles: [], available_languages: [],
        available_announcement_types: [], available_plan_sort_orders: [],
      });
    }
    if (path === '/portal/router-themes') {
      if (oldBackend) return json(route, { detail: 'Not Found' }, 404);
      return json(route, {
        theme_fields: THEME_FIELDS,
        routers: ROUTERS.map((r) => ({ router_id: r.id, router_name: r.name, identity: `rt-${r.id}`, has_override: own(r.id).length > 0, overridden_fields: own(r.id), updated_at: null })),
      });
    }
    const m = path.match(/^\/portal\/router-themes\/(\d+)$/);
    if (m) {
      const id = Number(m[1]);
      if (method === 'PUT') overrides[id] = { ...(overrides[id] ?? {}), ...(req.postDataJSON() as object) };
      if (method === 'DELETE') delete overrides[id];
      return json(route, payload(id));
    }
    if (path === '/ads/manage' || path === '/public/spots') return json(route, { ads: [], pagination: {} });
    if (path === '/plans') return json(route, []);
    return json(route, {});
  });
  await page.goto('/settings/portal-customization');
  await expect(page.getByRole('heading', { name: 'Theme', exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  return { calls, overrides };
}

const picker = (page: Page) => page.locator('#portal-router');
const theme = (page: Page, label: string) => page.getByRole('button', { name: label, exact: true });
const isActive = (page: Page, label: string) => expect(theme(page, label)).toHaveClass(/border-accent-primary/);

test('the picker lists All routers (default) and every router; the default shows every section', async ({ page }) => {
  await open(page);
  await expect(picker(page).locator('option')).toHaveText(['All routers (default)', 'Shop', 'Estate']);
  await expect(picker(page)).toHaveValue('');
  await isActive(page, 'Ocean Blue');
  await expect(page.getByRole('heading', { name: 'Support Contacts' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible();
});

test('two routers get different themes and the default stays as it was', async ({ page }) => {
  const { calls, overrides } = await open(page);

  await picker(page).selectOption({ label: 'Shop' });
  await isActive(page, 'Ocean Blue'); // starts from the default look
  // Account-wide sections are not editable per router.
  await expect(page.getByRole('heading', { name: 'Support Contacts' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Features' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Language' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reset to Default' })).toBeDisabled();

  await theme(page, 'Cherry Red').click();
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('Saved the portal for Shop')).toBeVisible();
  const put = calls.find((c) => c.method === 'PUT');
  expect(put?.path).toBe('/portal/router-themes/7');
  expect(put?.body).toEqual({ color_theme: 'cherry_red' });
  await expect(picker(page).locator('option', { hasText: 'Shop' })).toHaveText('Shop · own theme');
  await expect(page.getByRole('button', { name: 'Reset to Default' })).toBeEnabled();

  await picker(page).selectOption({ label: 'Estate' });
  await isActive(page, 'Ocean Blue');
  await theme(page, 'Emerald Green').click();
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('Saved the portal for Estate')).toBeVisible();

  expect(overrides[7]).toEqual({ color_theme: 'cherry_red' });
  expect(overrides[8]).toEqual({ color_theme: 'emerald_green' });
  // The account default was never written.
  expect(calls.filter((c) => c.path === '/portal/settings' && c.method !== 'GET')).toEqual([]);

  await picker(page).selectOption({ label: 'All routers (default)' });
  await isActive(page, 'Ocean Blue');
  await expect(page.getByRole('heading', { name: 'Support Contacts' })).toBeVisible();

  await picker(page).selectOption({ label: 'Shop · own theme' });
  await isActive(page, 'Cherry Red');
  await page.screenshot({ path: 'test-results/router-theme-shop.png', fullPage: true });
});

test('Reset to Default puts a router back on the default look', async ({ page }) => {
  const { calls } = await open(page);
  await picker(page).selectOption({ label: 'Shop' });
  await theme(page, 'Hot Pink').click();
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('Saved the portal for Shop')).toBeVisible();

  await page.getByRole('button', { name: 'Reset to Default' }).click();
  await expect(page.getByText('Shop now uses the default portal look')).toBeVisible();
  expect(calls.some((c) => c.method === 'DELETE' && c.path === '/portal/router-themes/7')).toBe(true);
  await isActive(page, 'Ocean Blue');
  await expect(picker(page).locator('option', { hasText: 'Shop' })).toHaveText('Shop');
});

test('without per-router support on the backend the page is as before, with no picker', async ({ page }) => {
  await open(page, { oldBackend: true });
  await expect(picker(page)).toHaveCount(0);
  await isActive(page, 'Ocean Blue');
  await expect(page.getByRole('heading', { name: 'Support Contacts' })).toBeVisible();
});
