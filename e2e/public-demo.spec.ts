import { expect, test, type Page } from '@playwright/test';

const DESKTOP_SIDEBAR_ROUTES = [
  { path: '/dashboard', title: 'Dashboard', proof: /Revenue|Customers/i },
  { path: '/customers', title: 'Customers', proof: 'John Kamau' },
  { path: '/plans', title: 'Plans', proof: 'Daily Lite' },
  { path: '/transactions', title: 'Transactions', proof: /M-Pesa|Revenue/i },
  { path: '/vouchers', title: 'Vouchers', proof: /Available|Used/i },
  { path: '/compensation', title: 'Outage Compensation', proof: 'No compensations yet' },
  { path: '/access-credentials', title: 'Access Credentials', proof: /Active|In Use/i },
  { path: '/account-statement', title: 'Account Statement', proof: 'Revenue Collected' },
  { path: '/messaging', title: 'Messaging', proof: 'Compose' },
  { path: '/routers', title: 'Routers', proof: 'Kilimani Tower' },
  { path: '/pppoe-monitor', title: 'PPPoE Monitor', proof: /Total Users|Kilimani Tower/i },
  { path: '/diagnostics', title: 'Network Diagnostics', proof: /PPPoE Infrastructure|Select a router/i },
  { path: '/walled-garden', title: 'Walled Garden', proof: /safaricom\.co\.ke|Allowed/i },
  { path: '/settings/profile', title: 'Settings', proof: /Demo ISP Network|Profile/i },
  { path: '/settings/subscription', title: 'Settings', proof: /Subscription|Current Plan/i },
  { path: '/settings/payment-methods', title: 'Settings', proof: /M-Pesa|Payment Methods/i },
  { path: '/settings/portal-customization', title: 'Settings', proof: 'Header Layout' },
] as const;

const MOBILE_BOTTOM_NAV = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Customers', path: '/customers' },
  { name: 'Transactions', path: '/transactions' },
  { name: 'Routers', path: '/routers' },
  { name: 'Settings', path: '/settings' },
] as const;

test.beforeEach(async ({ page }) => {
  // Vercel serves this endpoint only after deployment. Stub the platform
  // script locally so console assertions remain focused on application errors.
  await page.route('**/_vercel/insights/script.js', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  );
});

async function enterPublicDemo(page: Page) {
  await page.goto('/demo?utm_source=playwright&utm_medium=test&utm_campaign=public_demo');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Demo Mode', { exact: true })).toBeVisible();
  await expect(page.locator('main')).toBeVisible();
}

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function expectSafeDemoPage(page: Page, title: string, proof: string | RegExp) {
  await expect(page.getByRole('heading', { name: title, exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText(proof).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('Demo Mode', { exact: true })).toBeVisible();
  await expect(page.getByText(/Something went wrong|Application error|Failed to load/i)).toHaveCount(0);
  await expect.poll(() => page.locator('main').innerText()).not.toMatch(/\b(undefined|null)\b/i);
}

test('landing page exposes the public demo as a real link', async ({ page }) => {
  await page.goto('/');

  const desktopDemoLink = page.getByRole('link', { name: 'Demo', exact: true });
  await expect(desktopDemoLink).toHaveAttribute('href', '/demo');
  await desktopDemoLink.click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Demo Mode', { exact: true })).toBeVisible();
});

test('public /demo initializes the real dashboard and preserves campaign attribution', async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.addInitScript(() => {
    (window as Window & { __trackedEvents?: unknown[]; gtag?: (...args: unknown[]) => void }).__trackedEvents = [];
    (window as Window & { __trackedEvents?: unknown[]; gtag?: (...args: unknown[]) => void }).gtag = (...args: unknown[]) => {
      (window as Window & { __trackedEvents?: unknown[] }).__trackedEvents?.push(args);
    };
  });

  await enterPublicDemo(page);
  await expectSafeDemoPage(page, 'Dashboard', /Revenue|Customers/i);

  const session = await page.evaluate(() => ({
    demoMode: localStorage.getItem('demo_mode'),
    token: localStorage.getItem('auth_token'),
    user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
    attribution: JSON.parse(localStorage.getItem('bw_attrib_v1') || 'null'),
  }));
  expect(session.demoMode).toBe('true');
  expect(session.token).toBe('demo-token');
  expect(session.user).toMatchObject({ role: 'reseller', organization_name: 'Demo ISP Network' });
  expect(session.attribution.first).toMatchObject({
    utm_source: 'playwright',
    utm_medium: 'test',
    utm_campaign: 'public_demo',
    landing_path: '/demo',
  });

  await expect(page.locator('aside')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('href', '/');
  await expect(page.getByRole('link', { name: 'Pricing', exact: true })).toHaveAttribute('href', '/pricing');
  await expect(page.getByRole('link', { name: 'Sign Up', exact: true })).toHaveAttribute('href', '/signup');
  const whatsapp = page.getByRole('link', { name: 'Chat with Bitwave on WhatsApp' });
  await expect(whatsapp).toHaveAttribute('href', /^https:\/\/wa\.me\/254795635364/);
  expect(errors).toEqual([]);
});

test('demo banner keeps public routes and signup within one tap', async ({ page }) => {
  await enterPublicDemo(page);

  const demoActions = page.getByRole('navigation', { name: 'Demo actions' });
  await expect(demoActions.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
  await expect(demoActions.getByRole('link', { name: 'Pricing', exact: true })).toBeVisible();
  await expect(demoActions.getByRole('link', { name: 'Chat with Bitwave on WhatsApp' })).toBeVisible();
  await expect(demoActions.getByRole('link', { name: 'Sign Up', exact: true })).toBeVisible();

  await demoActions.getByRole('link', { name: 'Pricing', exact: true }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  const attribution = await page.evaluate(() => JSON.parse(localStorage.getItem('bw_attrib_v1') || 'null'));
  expect(attribution.first).toMatchObject({
    utm_source: 'playwright',
    utm_campaign: 'public_demo',
    landing_path: '/demo',
  });
});

test('exiting the demo returns to Home and clears the demo session', async ({ page }) => {
  await enterPublicDemo(page);
  await page.getByRole('button', { name: 'Exit', exact: true }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /The Billing System/i })).toBeVisible();
  const session = await page.evaluate(() => ({
    demoMode: localStorage.getItem('demo_mode'),
    token: localStorage.getItem('auth_token'),
  }));
  expect(session).toEqual({ demoMode: null, token: null });
});

for (const route of DESKTOP_SIDEBAR_ROUTES) {
  test(`desktop demo renders useful safe content at ${route.path}`, async ({ page }) => {
    const errors = collectRuntimeErrors(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await enterPublicDemo(page);
    await page.goto(route.path);
    await expect(page).toHaveURL(new RegExp(`${route.path.replaceAll('/', '\\/')}$`));
    await expectSafeDemoPage(page, route.title, route.proof);
    expect(errors).toEqual([]);
  });
}

test('desktop sidebar exposes every audited demo destination', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await enterPublicDemo(page);

  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();
  for (const { path } of DESKTOP_SIDEBAR_ROUTES) {
    await expect(sidebar.locator(`a[href="${path}"]`).first()).toBeAttached();
  }
});

test('mobile bottom navigation stays full-width and every item navigates', async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await enterPublicDemo(page);

  const demoActions = page.getByRole('navigation', { name: 'Demo actions' });
  await expect(demoActions).toBeVisible();
  const bannerDimensions = await demoActions.evaluate((element) => ({
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    viewport: document.documentElement.clientWidth,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(bannerDimensions.left).toBeGreaterThanOrEqual(0);
  expect(bannerDimensions.right).toBeLessThanOrEqual(bannerDimensions.viewport);
  expect(bannerDimensions.scrollWidth).toBeLessThanOrEqual(bannerDimensions.clientWidth);

  for (const item of MOBILE_BOTTOM_NAV) {
    const nav = page.locator('nav.fixed.bottom-0');
    await expect(nav).toBeVisible();
    const dimensions = await nav.evaluate((element) => ({
      left: element.getBoundingClientRect().left,
      right: element.getBoundingClientRect().right,
      viewport: document.documentElement.clientWidth,
    }));
    expect(dimensions.left).toBe(0);
    expect(dimensions.right).toBe(dimensions.viewport);

    await nav.getByRole('link', { name: item.name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${item.path.replaceAll('/', '\\/')}$`));
    await expect(page.locator('main')).toBeVisible();
    await expect(nav).toBeVisible();
  }

  expect(errors).toEqual([]);
});
