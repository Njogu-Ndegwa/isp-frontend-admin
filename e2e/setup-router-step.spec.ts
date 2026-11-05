import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * The router step of /setup, for an owner whose router has not come online.
 * 134 accounts in 90 days generated a code and stopped here (account 747,
 * RB5009, sat with two expired codes).
 *
 * Backend calls are stubbed (page.route) and auth injected into localStorage, as
 * in sms-gateway-status.spec.ts. Timestamps are naive UTC, as the backend sends
 * them. Screens land in e2e/screens/setup/.
 */

const RESELLER = {
  id: 747, email: 'reseller@bitwave.test', role: 'reseller',
  organization_name: 'Accra Hotspot', subscription_status: 'active',
};

const naiveUtc = (minutesAgo: number) =>
  new Date(Date.now() - minutesAgo * 60_000).toISOString().replace('Z', '');

const COMMAND = (t: string) =>
  `/tool fetch url="https://isp.bitwavetechnologies.com/api/provision/${t}" dst-path=provision.rsc;:delay 2s;/import provision.rsc;`;

const token = (t: string, minutesAgo: number, over: Record<string, unknown> = {}) => ({
  id: 1, token: t, router_name: 'Router-0747', identity: 'Router-0747', vpn_type: 'wireguard',
  vpn_ip: '10.0.7.47', status: 'pending', expired: false, command: COMMAND(t),
  created_at: naiveUtc(minutesAgo), provisioned_at: null, router_id: null, ...over,
});

type Tokens = { list: ReturnType<typeof token>[]; created: ReturnType<typeof token> };

function json(route: Route, body: unknown) {
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
}

async function stubApi(page: Page, tokens: Tokens) {
  await page.route('**/api/**', async (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p.endsWith('/provision/tokens')) return json(route, tokens.list);
    if (p.endsWith('/provision/create')) {
      tokens.list = [tokens.created, ...tokens.list];
      return json(route, {
        token: tokens.created.token, router_name: 'Router-0747', identity: 'Router-0747',
        vpn_type: tokens.created.vpn_type, vpn_ip: '10.0.7.47', command: tokens.created.command, note: 'ignored',
        created_at: tokens.created.created_at, expires_in_hours: 24,
      });
    }
    if (p.endsWith('/routers') || p.endsWith('/plans') || p.endsWith('/payment-methods')) return json(route, []);
    if (p.endsWith('/profile')) return json(route, { support_phone: '' });
    return json(route, {});
  });
}

const DIR = 'e2e/screens/setup';
const WAIT = 'router-wait-status';

for (const viewport of [{ name: 'mobile', width: 390, height: 844 },
                        { name: 'desktop', width: 1280, height: 900 }]) {
  const open = async (page: Page, tokens: Tokens) => {
    await page.addInitScript(`
      localStorage.removeItem('demo_mode');
      localStorage.setItem('auth_token','test-reseller-token');
      localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(RESELLER))});
    `);
    await stubApi(page, tokens);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/setup');
    await expect(page.getByRole('heading', { name: 'Add Your First Router' })).toBeVisible();
  };

  const noSideScroll = async (page: Page) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  };

  test(`generating a code leads with device-mode and promises nothing (${viewport.name})`, async ({ page }) => {
    test.setTimeout(120_000);
    const tokens: Tokens = { list: [], created: token('newcode', 0) };
    await open(page, tokens);

    // Before generating: the warning is there on v7, closed, and gone on v6.
    const help = page.getByTestId('device-mode-help');
    await expect(help).toContainText('RouterOS 7: allow hotspot first');
    await page.screenshot({ path: `${DIR}/${viewport.name}-1-before-code.png`, fullPage: true });
    await page.getByRole('button', { name: /RouterOS v6/ }).click();
    await expect(help).toHaveCount(0);
    await page.getByRole('button', { name: /RouterOS v7/ }).click();

    await page.getByRole('button', { name: 'Generate setup code' }).click();
    await expect(page.getByText('Your setup code is ready')).toBeVisible();
    await expect(page.getByText(/router is not connected yet/)).toBeVisible();

    // Device-mode fix: open, correct command, 5 minutes everywhere.
    await expect(help).toContainText('/system/device-mode/update fetch=yes scheduler=yes hotspot=yes');
    await expect(help).toContainText('Within 5 minutes');
    await expect(help).toContainText('Do not hold it');
    await expect(help).toContainText('mode=advanced');
    await expect(page.getByText('60 seconds')).toHaveCount(0);

    // What happens next, in place of the old promise.
    await expect(page.getByText('will connect automatically')).toHaveCount(0);
    await expect(page.getByTestId(WAIT)).toHaveAttribute('data-state', 'waiting');
    await expect(page.getByTestId(WAIT)).toContainText('Winbox will disconnect');

    const whatsapp = page.getByRole('link', { name: 'Send your RustDesk ID on WhatsApp' });
    await expect(whatsapp).toHaveAttribute('href', /^https:\/\/wa\.me\/254795635364\?text=.*RustDesk/);
    await noSideScroll(page);
    await page.screenshot({ path: `${DIR}/${viewport.name}-2-code-ready.png`, fullPage: true });

    // Asking and getting nothing back is an answer, not silence.
    await page.getByRole('button', { name: 'Check if router connected' }).click();
    await expect(page.getByTestId(WAIT)).toHaveAttribute('data-state', 'not_heard');
    await expect(page.getByText("We haven't heard from your router yet")).toBeVisible();
    await noSideScroll(page);
    await page.screenshot({ path: `${DIR}/${viewport.name}-3-not-heard-after-check.png`, fullPage: true });
  });

  test(`RouterOS 6 skips device-mode everywhere (${viewport.name})`, async ({ page }) => {
    test.setTimeout(120_000);
    const tokens: Tokens = { list: [], created: token('v6code', 0, { vpn_type: 'l2tp' }) };
    await open(page, tokens);
    await page.getByRole('button', { name: /RouterOS v6/ }).click();
    await page.getByRole('button', { name: 'Generate setup code' }).click();
    await expect(page.getByText('Your setup code is ready')).toBeVisible();
    await expect(page.getByTestId('device-mode-help')).toHaveCount(0);

    await page.getByRole('button', { name: 'Check if router connected' }).click();
    await expect(page.getByText("We haven't heard from your router yet")).toBeVisible();
    await expect(page.getByText(/not allowed by device-mode/)).toHaveCount(0);
    await noSideScroll(page);
    await page.screenshot({ path: `${DIR}/${viewport.name}-9-routeros-6.png`, fullPage: true });
  });

  test(`a code left unused shows the checks after a reload (${viewport.name})`, async ({ page }) => {
    test.setTimeout(120_000);
    const tokens: Tokens = { list: [token('oldcode', 180)], created: token('newcode', 0) };
    await open(page, tokens);

    const wait = page.getByTestId(WAIT);
    await expect(wait).toHaveAttribute('data-state', 'not_heard');
    await expect(wait).toContainText('Internet on port 1');
    await expect(wait).toContainText('/ping 8.8.8.8 count=3');
    await expect(wait).toContainText('/system clock print');
    await expect(wait).toContainText('/import provision.rsc;');
    await expect(wait).toContainText('This code has about 20 hours left.');
    await noSideScroll(page);
    await page.screenshot({ path: `${DIR}/${viewport.name}-4-not-heard-after-reload.png`, fullPage: true });
  });

  test(`a recent code stays calm and the page moves on by itself (${viewport.name})`, async ({ page }) => {
    test.setTimeout(120_000);
    const tokens: Tokens = { list: [token('recent', 1)], created: token('newcode', 0) };
    await open(page, tokens);
    await expect(page.getByTestId(WAIT)).toHaveAttribute('data-state', 'waiting');

    // The router calls home: polling picks it up with no click.
    tokens.list = [token('recent', 1, { status: 'provisioned', router_id: 9 })];
    await expect(page.getByRole('heading', { name: 'Create Your First Plan' })).toBeVisible({ timeout: 15_000 });
  });

  test(`the Routers page shows the same corrected fix (${viewport.name})`, async ({ page }) => {
    test.setTimeout(120_000);
    const tokens: Tokens = { list: [], created: token('newcode', 0) };
    await page.addInitScript(`
      localStorage.removeItem('demo_mode');
      localStorage.setItem('auth_token','test-reseller-token');
      localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(RESELLER))});
    `);
    await stubApi(page, tokens);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/routers');

    await page.getByRole('button', { name: 'Add Router' }).first().click();
    const help = page.getByTestId('device-mode-help');
    await expect(help).toContainText('RouterOS 7: allow hotspot first');
    await help.getByRole('button', { name: /allow hotspot first/ }).click();
    await expect(help).toContainText('/system/device-mode/update fetch=yes scheduler=yes hotspot=yes');
    await expect(help).toContainText('Within 5 minutes');
    await expect(page.getByText('mode=enterprise')).toBeVisible();
    await expect(page.getByText('Enterprise Mode')).toHaveCount(0);
    await page.screenshot({ path: `${DIR}/${viewport.name}-7-routers-add-modal.png`, fullPage: true });

    await page.getByRole('button', { name: 'Generate Provisioning Token' }).click();
    await expect(page.getByText('Expires in 24 hours')).toBeVisible();
    await expect(page.getByTestId('device-mode-help').last()).toContainText('RouterOS 7: allow hotspot first');
    await page.screenshot({ path: `${DIR}/${viewport.name}-8-routers-token-modal.png`, fullPage: true });
  });

  test(`an expired code says so, in both forms the backend uses (${viewport.name})`, async ({ page }) => {
    test.setTimeout(120_000);
    const tokens: Tokens = {
      list: [
        token('swept', 3000, { status: 'expired', expired: false, command: null }),
        token('stale', 1600, { status: 'pending', expired: true, command: null }),
      ],
      created: token('newcode', 0),
    };
    await open(page, tokens);
    await expect(page.getByText('Your last setup code has expired')).toBeVisible();
    await noSideScroll(page);
    await page.screenshot({ path: `${DIR}/${viewport.name}-5-expired.png`, fullPage: true });

    await page.getByRole('button', { name: 'Generate setup code' }).click();
    await expect(page.getByText('Your setup code is ready')).toBeVisible();

    // The open code runs out while the page is up: polling swaps in the fix.
    tokens.list = [token('newcode', 1500, { expired: true, command: null })];
    await expect(page.getByText('This setup code has expired')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Generate a new code' })).toBeVisible();
    await page.screenshot({ path: `${DIR}/${viewport.name}-6-open-code-expired.png`, fullPage: true });
  });
}
