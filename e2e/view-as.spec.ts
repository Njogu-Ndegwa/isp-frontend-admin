import { expect, test, type Page } from '@playwright/test';

// Admin "View as reseller" (read-only). Backend fully mocked:
//   POST /api/admin/impersonate/{id}  -> impersonation token for the reseller
//   POST /api/impersonation/end       -> { ended: true }
//   writes with the impersonation token -> 403 impersonation_read_only
//   once ended/expired                  -> 401 impersonation_ended

const ADMIN = { id: 1, email: 'admin@example.test', role: 'admin', organization_name: 'Bitwave', subscription_status: 'active' };
const RESELLER = { id: 42, email: 'netnet@example.test', role: 'reseller', organization_name: 'Net Net ISP', subscription_status: 'active' };
const READ_ONLY = "Read-only: you are viewing this reseller's dashboard. Changes are disabled.";
const SHOTS = process.env.REVIEW_SHOTS; // folder for review screenshots (optional)

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

const detail = {
  id: 42, email: RESELLER.email, organization_name: RESELLER.organization_name, business_name: 'Net Net Ltd',
  support_phone: '+254700000042', mpesa_shortcode: '600042', created_at: '2026-01-10T08:00:00Z', last_login_at: '2026-10-12T09:00:00Z',
  revenue: { today: 1200, this_week: 8400, this_month: 30000, all_time: 250000 },
  customers: { active: 40, inactive: 5, pending: 1, total: 46 },
  routers: [], recent_payments: [],
  payouts: { total_paid: 100000, last_payout_date: null, unpaid_balance: 5000 },
  payment_methods: [], currency: 'KES',
};

const banner = (page: Page) => page.getByTestId('view-as-banner');

type Mock = {
  impersonateBodies: unknown[];
  endCalls: string[];
  writes: { path: string; auth: string }[];
  ended: boolean;
};

async function setup(page: Page, theme: 'light' | 'dark' = 'dark'): Promise<Mock> {
  const mock: Mock = { impersonateBodies: [], endCalls: [], writes: [], ended: false };
  await page.route('**/_vercel/insights/script.js', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  // Seed the admin session once per tab; later navigations keep whatever the app stored.
  await page.addInitScript(({ admin, theme }) => {
    if (sessionStorage.getItem('e2e_seeded')) return;
    sessionStorage.setItem('e2e_seeded', '1');
    localStorage.setItem('auth_token', 'admin-token');
    localStorage.setItem('auth_user', JSON.stringify(admin));
    localStorage.setItem('theme', theme);
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('impersonation_origin');
  }, { admin: ADMIN, theme });

  await page.route('**/api/**', async route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const method = req.method();
    const auth = req.headers()['authorization'] ?? '';
    const asReseller = auth === 'Bearer imp-token';
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (path.endsWith('/admin/impersonate/42') && method === 'POST') {
      if (auth !== 'Bearer admin-token') return json({ detail: 'Admin only' }, 403);
      mock.impersonateBodies.push(req.postDataJSON());
      mock.ended = false;
      return json({
        access_token: 'imp-token', token_type: 'bearer', session_id: 77,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        read_only: true, user: RESELLER, impersonator: { id: ADMIN.id, email: ADMIN.email },
      });
    }
    if (path.endsWith('/impersonation/end') && method === 'POST') {
      mock.endCalls.push(auth);
      mock.ended = true;
      return json({ ended: true });
    }
    if (asReseller && mock.ended) return json({ detail: 'View-as session ended', code: 'impersonation_ended' }, 401);
    if (asReseller && method !== 'GET') {
      mock.writes.push({ path, auth });
      return json({ detail: READ_ONLY, code: 'impersonation_read_only' }, 403);
    }
    if (path.endsWith('/profile')) {
      const u = asReseller ? RESELLER : ADMIN;
      return json({ ...u, user_code: 100042, business_name: 'Net Net Ltd', support_phone: '+254700000042', mpesa_shortcode: '600042', created_at: '2026-01-10T08:00:00Z', last_login_at: '2026-10-12T09:00:00Z', preferred_language: null });
    }
    if (path.endsWith('/admin/resellers/42')) return json(detail);
    if (path.endsWith('/admin/resellers/42/payments')) return json({ payments: [], page: 1, per_page: 20, total_pages: 1, total_count: 0, summary: null });
    if (path.endsWith('/admin/resellers/42/routers')) return json({ routers: [] });
    if (path.endsWith('/messaging/inbox')) return json({ unread: 0, messages: [] });
    if (/\/(customers|plans|routers|transactions|vouchers)(\/active)?$/.test(path)) return json([]);
    return json({});
  });
  return mock;
}

async function startViewAs(page: Page, mock: Mock) {
  await page.goto('/admin/resellers/42');
  await expect(page.getByRole('heading', { name: 'Net Net ISP' }).filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: 'View as reseller' }).filter({ visible: true }).click();
  const dialog = page.getByRole('dialog', { name: 'View as reseller' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("You'll see Net Net ISP's full dashboard, read-only, for 30 minutes. This is logged.");
  const start = dialog.getByRole('button', { name: 'Start', exact: true });
  await dialog.getByLabel(/Reason/).fill('abc');
  await expect(start).toBeDisabled();
  await dialog.getByLabel(/Reason/).fill('Support ticket 481: customers missing');
  return { dialog, start, submit: async () => {
    await start.click();
    await expect(page).toHaveURL(/\/dashboard$/);
    // First visit compiles /dashboard in dev; give it time.
    await expect(banner(page)).toBeVisible({ timeout: 30_000 });
    expect(mock.impersonateBodies.at(-1)).toEqual({ reason: 'Support ticket 481: customers missing' });
  } };
}

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  const tag = viewport.width === 390 ? 'mobile' : 'desktop';

  test(`admin views a reseller read-only, writes are blocked, Exit restores the admin at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const mock = await setup(page);

    const { dialog, submit } = await startViewAs(page, mock);
    if (SHOTS) await dialog.screenshot({ path: `${SHOTS}/view-as-dialog-${tag}.png` });
    await submit();

    // Banner: reseller name, read-only, a running mm:ss countdown and Exit.
    await expect(banner(page)).toBeVisible();
    await expect(banner(page)).toContainText('Viewing as Net Net ISP');
    await expect(banner(page)).toContainText('read-only');
    await expect(page.getByTestId('view-as-countdown')).toHaveText(/^(29:[0-5]\d|30:00) left$/);
    const stored = await page.evaluate(() => ({
      token: localStorage.getItem('auth_token'),
      user: JSON.parse(localStorage.getItem('auth_user') || '{}'),
      origin: JSON.parse(localStorage.getItem('impersonation_origin') || 'null'),
    }));
    expect(stored.token).toBe('imp-token');
    expect(stored.user.role).toBe('reseller');
    expect(stored.origin).toMatchObject({ adminToken: 'admin-token', resellerId: 42, sessionId: 77, resellerName: 'Net Net ISP' });

    // Nothing admin-only leaks into the reseller's dashboard.
    await expect(page.getByRole('button', { name: 'View as reseller' })).toHaveCount(0);
    await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);

    // Sticky at the top and clear of the mobile bottom nav.
    await expect(page.getByText('Your dashboard is almost ready')).toBeVisible({ timeout: 30_000 });
    const box = await banner(page).boundingBox();
    expect(Math.abs(box!.y)).toBeLessThanOrEqual(1);
    if (viewport.width === 390) {
      const nav = page.locator('nav.fixed');
      await expect(nav).toBeVisible();
      const navBox = await nav.boundingBox();
      expect(navBox!.width).toBeGreaterThanOrEqual(389);
      expect(box!.y + box!.height).toBeLessThan(navBox!.y);
      await expect(nav.getByRole('link')).toHaveCount(5);
    }
    // `html { scroll-behavior: smooth }`: scroll instantly so positions are settled.
    const scrollTo = (top: number) => page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), top);
    await scrollTo(100_000);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect(Math.abs((await banner(page).boundingBox())!.y)).toBeLessThanOrEqual(1);
    await scrollTo(0);
    await shot(page, `view-as-banner-${tag}-dark`);

    // A write is refused by the server; the read-only message reaches the user.
    await page.goto('/settings/profile');
    await expect(banner(page)).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.locator('input[type="text"]').nth(1).fill('Changed Ltd');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText(READ_ONLY).first()).toBeVisible();
    await expect(banner(page)).toContainText('Read-only: changes are disabled while viewing as.');
    expect(mock.writes).toEqual([{ path: '/api/profile', auth: 'Bearer imp-token' }]);

    if (viewport.width === 390) {
      // The dev-tools badge (<nextjs-portal>) only exists in dev and can sit over the nav.
      await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
      for (const link of await page.locator('nav.fixed').getByRole('link').all()) await link.click({ trial: true });
    }

    // Exit ends the session server-side and puts the admin back on the reseller page.
    await banner(page).getByRole('button', { name: 'Exit' }).click();
    await expect(page).toHaveURL(/\/admin\/resellers\/42$/);
    await expect(page.getByRole('heading', { name: 'Net Net ISP' }).filter({ visible: true })).toBeVisible();
    await expect(banner(page)).toHaveCount(0);
    expect(mock.endCalls).toEqual(['Bearer imp-token']);
    const after = await page.evaluate(() => ({
      token: localStorage.getItem('auth_token'),
      role: JSON.parse(localStorage.getItem('auth_user') || '{}').role,
      origin: localStorage.getItem('impersonation_origin'),
    }));
    expect(after).toEqual({ token: 'admin-token', role: 'admin', origin: null });
    expect(errors).toEqual([]);
  });

  test(`a 401 impersonation_ended returns to the admin instead of logging out at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const mock = await setup(page, 'light');
    const { submit } = await startViewAs(page, mock);
    await submit();
    await expect(page.getByText('Your dashboard is almost ready')).toBeVisible({ timeout: 30_000 });
    await shot(page, `view-as-banner-${tag}-light`);

    // The server ends the session (e.g. revoked); the next requests get 401.
    mock.ended = true;
    // Any in-flight dashboard poll may hit the 401 first and redirect, which
    // aborts this navigation; either way the app must land back on the admin.
    await page.goto('/customers', { waitUntil: 'commit' }).catch(() => {});
    await expect(page).toHaveURL(/\/admin\/resellers\/42$/, { timeout: 20_000 });
    await expect(page.getByText('View-as session ended. You are back in your admin account.')).toBeVisible();
    await expect(banner(page)).toHaveCount(0);
    const after = await page.evaluate(() => ({ token: localStorage.getItem('auth_token'), origin: localStorage.getItem('impersonation_origin') }));
    expect(after).toEqual({ token: 'admin-token', origin: null });
    expect(errors).toEqual([]);
  });
}

test('the banner exits by itself when the countdown reaches zero', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const mock = await setup(page);
  const { submit } = await startViewAs(page, mock);
  await submit();
  // Fast-forward: the session now has 3 seconds left (reload so the banner re-reads it).
  await page.evaluate(() => {
    const origin = JSON.parse(localStorage.getItem('impersonation_origin')!);
    origin.expiresAt = new Date(Date.now() + 3000).toISOString();
    localStorage.setItem('impersonation_origin', JSON.stringify(origin));
  });
  await page.reload({ waitUntil: 'commit' });
  await expect(page).toHaveURL(/\/admin\/resellers\/42$/, { timeout: 15_000 });
  await expect(page.getByText('View-as session ended. You are back in your admin account.')).toBeVisible();
  expect(mock.endCalls).toEqual(['Bearer imp-token']);
  expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBe('admin-token');
});

test('logging out while viewing as clears both sessions', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const mock = await setup(page);
  const { submit } = await startViewAs(page, mock);
  await submit();
  await page.getByRole('button', { name: /^Log ?out$/i }).filter({ visible: true }).first().click();
  await expect.poll(() => mock.endCalls).toEqual(['Bearer imp-token']);
  const after = await page.evaluate(() => ({
    token: localStorage.getItem('auth_token'),
    user: localStorage.getItem('auth_user'),
    origin: localStorage.getItem('impersonation_origin'),
  }));
  expect(after).toEqual({ token: null, user: null, origin: null });
});
