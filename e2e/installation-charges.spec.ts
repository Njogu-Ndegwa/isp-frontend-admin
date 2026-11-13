import { expect, test, type Page, type Route } from '@playwright/test';
import type { InstallationCharge } from '../app/lib/installationCharges';

const OWNER = { id: 597, email: 'owner@example.test', role: 'reseller', organization_name: 'Test account', subscription_status: 'active' };
const PLAN = { id: 2, name: 'Monthly', price: 2500, connection_type: 'pppoe', duration_value: 30, duration_unit: 'days' };
const ROUTER = { id: 22, name: 'Test router' };
const CUSTOMER = { id: 301, name: 'Test customer', phone: '', mac_address: '', status: 'inactive', expiry: '2026-01-01T00:00:00', connection_type: 'pppoe', pppoe_username: '', plan: PLAN, plan_id: 2, router: ROUTER, router_id: 22, wallet_credit_kes: 750 };
const initial: InstallationCharge = { id: 1, customer_id: 301, customer_id_snapshot: 301, customer_name: CUSTOMER.name, description: 'Cable installation', currency: 'KES', original_minor: 100000, outstanding_minor: 100000, payments_minor: 0, waivers_minor: 0, reversed: false, created_at: null,
  events: [{ id: 1, kind: 'charge', delta_minor: 100000, reason: 'Cable installation', external_reference: null, actor_id: 597, created_at: null, reversed: false, reverses_event_id: null }] };
const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function setup(page: Page, opts: { user?: typeof OWNER & { staff?: object; account_admin?: object }; canCreate?: boolean; empty?: boolean; uncertain?: boolean; type?: string; next?: boolean; planless?: boolean; loadFails?: boolean } = {}) {
  const user: typeof OWNER & { staff?: object; account_admin?: object } = opts.user ?? OWNER;
  const ledger = opts.empty ? [] : [structuredClone(initial)];
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const reads: string[] = [];
  const committed = new Map<string, InstallationCharge>();
  let releaseRefresh: (() => void) | null = null;
  let delayRefresh = false;
  let uncertain = opts.uncertain;
  await page.context().addCookies([{ name: 'auth_token', value: 'test-token', domain: 'localhost', path: '/' }, { name: 'auth_user', value: encodeURIComponent(JSON.stringify(user)), domain: 'localhost', path: '/' }]);
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'test-token'); localStorage.setItem('auth_user', JSON.stringify(user)); localStorage.removeItem('demo_mode');
  }, user);
  await page.route('**/_vercel/**', route => route.fulfill({ body: '' }));
  const customer = { ...CUSTOMER, connection_type: opts.type ?? 'pppoe', plan: opts.planless ? null : opts.type === 'hotspot' ? { ...PLAN, connection_type: 'hotspot' } : PLAN };
  await page.route('**/api/**', async route => {
    const req = route.request(); const url = new URL(req.url()); const path = url.pathname;
    if (path.includes('/installation-charges')) {
      if (req.method() === 'GET') {
        if (opts.loadFails) return json(route, { detail: 'Unavailable' }, 503);
        reads.push(url.search);
        if (delayRefresh) { delayRefresh = false; await new Promise<void>(resolve => { releaseRefresh = resolve; }); }
        return json(route, { charges: url.searchParams.get('offset') === '50' ? [{ ...initial, id: 2, description: 'Older installation' }] : ledger, can_create: opts.canCreate !== false, next_offset: opts.next && url.searchParams.get('offset') !== '50' ? 50 : null });
      }
      const body = req.postDataJSON(); writes.push({ path, body });
      if (committed.has(body.idempotency_key)) return json(route, committed.get(body.idempotency_key), 201);
      let charge = ledger[0];
      if (!path.includes('/events')) {
        charge = { ...structuredClone(initial), id: 10 + ledger.length, description: body.description, original_minor: body.amount_minor, outstanding_minor: body.amount_minor }; ledger.unshift(charge);
      } else if (path.endsWith('/reversal')) {
        charge.outstanding_minor = 100000; charge.payments_minor = 0;
        charge.events[1].reversed = true;
        charge.events.push({ id: 3, kind: 'reversal', delta_minor: 25025, reason: body.reason, external_reference: null, actor_id: 597, created_at: null, reversed: false, reverses_event_id: 2 });
      } else {
        charge.outstanding_minor -= body.amount_minor;
        if (body.kind === 'external_payment') charge.payments_minor += body.amount_minor; else charge.waivers_minor += body.amount_minor;
        charge.events.push({ id: 2, kind: body.kind, delta_minor: -body.amount_minor, reason: body.reason, external_reference: body.external_reference ?? null, actor_id: 597, created_at: null, reversed: false, reverses_event_id: null });
      }
      committed.set(body.idempotency_key, structuredClone(charge));
      if (uncertain) { uncertain = false; return route.abort('failed'); }
      return json(route, charge, 201);
    }
    if (req.method() !== 'GET') writes.push({ path, body: req.postDataJSON() ?? {} });
    if (path.endsWith('/staff/me')) return user.staff ? json(route, { is_staff: true, staff: user.staff, permissions: ['customers.view', 'customers.manage'] }) : json(route, {}, 404);
    if (path.endsWith('/customers/301')) return json(route, customer);
    if (path.endsWith('/customers') || path.endsWith('/customers/active')) return json(route, { data: [customer], page: 1, per_page: 50, total: 1, total_pages: 1 });
    if (path.endsWith('/plans')) return json(route, customer.plan ? [customer.plan] : []);
    if (path.endsWith('/routers')) return json(route, [ROUTER]);
    if (path.endsWith('/usage')) return json(route, { customer_id: 301, live: null, period: null });
    if (path.endsWith('/usage/timeline')) return json(route, { points: [], total_mb: 0 });
    if (path.endsWith('/devices')) return json(route, { devices: [], max_devices: 1, owner_customer_id: 301 });
    if (path.endsWith('/usage/history') || path.endsWith('/mpesa/transactions') || path.endsWith('/payment-methods')) return json(route, []);
    if (path.endsWith('/payment-summary')) return json(route, {}, 404);
    if (path.endsWith('/messaging/inbox')) return json(route, { unread: 0, messages: [] });
    return json(route, {});
  });
  return { writes, reads, ledger, armRefresh: () => { delayRefresh = true; }, refreshPending: () => releaseRefresh !== null, releaseRefresh: () => releaseRefresh?.() };
}

test('partial receipt and reversal leave the unsaved customer form and payment paths alone', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  const { writes } = await setup(page);
  await page.goto('/customers/301');
  const ledger = page.getByRole('region', { name: 'Installation charges' });
  await expect(ledger).toBeVisible();
  const name = page.locator('form input').first(); await name.fill('Unsaved customer edit');
  await ledger.getByRole('button', { name: 'Record external payment', exact: true }).click();
  await ledger.getByLabel('Amount (KES)').fill('250.25');
  await ledger.getByLabel('Reason', { exact: true }).fill('Received outside platform');
  await ledger.getByRole('button', { name: 'Save installation record' }).click();
  await expect(ledger.getByRole('status')).toContainText('Record saved');
  await expect(ledger.getByText('KES 749.75', { exact: true })).toBeVisible();
  await expect(name).toHaveValue('Unsaved customer edit');
  await ledger.getByText('Record history', { exact: true }).click();
  await ledger.getByRole('button', { name: 'Reverse record #2' }).click();
  await ledger.getByLabel('Reason', { exact: true }).fill('Receipt entered twice');
  await ledger.getByRole('button', { name: 'Save installation record' }).click();
  await expect(ledger.getByText(/Reverses record #2/)).toBeVisible();
  expect(writes).toHaveLength(2); expect(writes.every(w => w.path.includes('/installation-charges'))).toBe(true);
  expect(writes[0].body.amount_minor).toBe(25025);
  await expect(name).toHaveValue('Unsaved customer edit'); expect(errors).toEqual([]);
});

test('committed but lost response locks divergent edits and confirms exactly once after reload', async ({ page }) => {
  const { writes, ledger: records } = await setup(page, { empty: true, uncertain: true });
  await page.goto('/customers/301'); const ledger = page.getByRole('region', { name: 'Installation charges' });
  async function fill(amount: string) {
    await ledger.getByRole('button', { name: 'Add installation charge' }).click();
    await ledger.getByLabel('Amount (KES)').fill(amount); await ledger.getByLabel('Description').fill('Cable');
    await ledger.getByRole('button', { name: 'Save installation record' }).click();
  }
  await fill('0.29'); await expect(ledger.getByRole('alert')).toContainText('Could not confirm');
  await expect(ledger.getByLabel('Description')).toHaveAttribute('readonly', '');
  await expect(ledger.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
  await page.reload();
  await expect(ledger.getByLabel('Description')).toHaveValue('Cable');
  await expect(ledger.getByLabel('Description')).toHaveAttribute('readonly', '');
  await ledger.getByRole('button', { name: 'Confirm previous record' }).click();
  await expect(ledger.getByRole('status')).toContainText('Record saved');
  expect(writes[0].body.idempotency_key).toBe(writes[1].body.idempotency_key);
  expect(records).toHaveLength(1);
  await fill('0.30'); await expect(ledger.getByRole('status')).toContainText('Record saved');
  expect(writes[2].body.idempotency_key).not.toBe(writes[1].body.idempotency_key);
});

test('an in-flight ledger refresh cannot overwrite a concurrent saved receipt', async ({ page }) => {
  const { writes, armRefresh, refreshPending, releaseRefresh } = await setup(page);
  await page.goto('/customers/301'); const ledger = page.getByRole('region', { name: 'Installation charges' });
  await ledger.getByRole('button', { name: 'Record external payment', exact: true }).click();
  await ledger.getByLabel('Amount (KES)').fill('250.25'); await ledger.getByLabel('Reason', { exact: true }).fill('Received');
  armRefresh(); await ledger.getByRole('button', { name: 'Refresh ledger' }).click();
  await expect(ledger.getByRole('button', { name: 'Save installation record' })).toBeDisabled();
  expect(writes).toHaveLength(0); await expect.poll(refreshPending).toBe(true); releaseRefresh();
  await ledger.getByRole('button', { name: 'Save installation record' }).click();
  await expect(ledger.getByText('KES 749.75', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
});

test('staff account admin reads only, pagination works, and old debt stays visible after plan change', async ({ page }) => {
  const staff = { id: 8, name: 'Staff', email: 'staff@example.test', is_account_admin: true, permissions: ['customers.view', 'customers.manage'] };
  const { writes, reads } = await setup(page, { user: { ...OWNER, staff }, canCreate: false, type: 'hotspot', next: true });
  await page.goto('/customers/301'); const ledger = page.getByRole('region', { name: 'Installation charges' });
  await expect(ledger.getByText(/Read only/)).toBeVisible();
  await expect(ledger.getByRole('button', { name: 'Add installation charge' })).toHaveCount(0);
  await expect(ledger.getByRole('button', { name: 'Record external payment' })).toHaveCount(0);
  await ledger.getByRole('button', { name: 'Load older charges' }).click();
  await expect(ledger.getByText('Older installation')).toBeVisible();
  expect(reads.some(r => r.includes('offset=50'))).toBe(true); expect(writes).toEqual([]);
});

test('another reseller never requests the ledger', async ({ page }) => {
  const { reads } = await setup(page, { user: { ...OWNER, id: 7 } });
  await page.goto('/customers/301'); await expect(page.getByRole('heading', { name: 'Test customer', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Installation charges' })).toHaveCount(0); expect(reads).toEqual([]);
});

test('mobile charge card fits and navigation remains usable after scrolling', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const { writes } = await setup(page);
  await page.goto('/customers/301'); const ledger = page.getByRole('region', { name: 'Installation charges' });
  await ledger.scrollIntoViewIfNeeded(); await expect(ledger.getByText('Recorded debt does not block internet yet.')).toBeVisible();
  await ledger.getByRole('button', { name: 'Record waiver' }).click();
  await ledger.getByLabel('Amount (KES)').fill('25'); await ledger.getByLabel('Reason', { exact: true }).fill('Agreed discount');
  await ledger.getByRole('button', { name: 'Save installation record' }).click();
  await expect(ledger.getByText('KES 975.00', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  const nav = page.locator('nav.fixed');
  await expect(nav).toBeVisible();
  const box = await nav.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(389);
  expect(await nav.locator(':scope > div').getAttribute('style')).toContain('safe-area-inset-bottom');
  for (const direction of ['down', 'up']) {
    await page.evaluate(up => scrollTo(0, up ? 0 : document.body.scrollHeight), direction === 'up');
    const controls = nav.locator('a,button'); expect(await controls.count()).toBe(5);
    for (const control of await controls.all()) await control.click({ trial: true });
  }
  // This branch uses five direct links; MoreMenu is not mounted by ClientLayout.
  await ledger.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('mobile-installation-charges.png') });
  await nav.getByRole('link', { name: 'Customers', exact: true }).click();
  await expect(page).toHaveURL(/\/customers$/);
  expect(writes.every(w => w.path.includes('/installation-charges'))).toBe(true); expect(errors).toEqual([]);
});

test('planless customer keeps existing history and failed loads stay isolated from the customer form', async ({ page }) => {
  await setup(page, { canCreate: false, planless: true });
  await page.goto('/customers/301');
  const ledger = page.getByRole('region', { name: 'Installation charges' });
  await expect(ledger.getByRole('heading', { name: 'Cable installation', exact: true })).toBeVisible();
  await expect(ledger.getByRole('button', { name: 'Add installation charge' })).toHaveCount(0);
  await expect(ledger.getByRole('button', { name: 'Record external payment', exact: true })).toBeVisible();
  await page.route('**/installation-charges?**', route => json(route, { detail: 'Unavailable' }, 503));
  const name = page.getByPlaceholder('Customer name'); await name.fill('Keep unsaved value');
  await ledger.getByRole('button', { name: 'Refresh ledger' }).click();
  await expect(ledger.getByRole('alert')).toContainText('Could not load installation charges');
  await expect(name).toHaveValue('Keep unsaved value');
  await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
});
