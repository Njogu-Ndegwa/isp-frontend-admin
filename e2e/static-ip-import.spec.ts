import { expect, test, type Page, type Request } from '@playwright/test';

// Static-IP bulk import (POST /routers/{id}/static-customers/import) against a
// mocked API. Set REVIEW_SHOTS=1 to save screenshots to review-shots/.
const SHOTS = Boolean(process.env.REVIEW_SHOTS);

const user = { id: 7, email: 'static@example.test', role: 'reseller', subscription_status: 'active' };
const staticPlan = { id: 1, name: 'Static 10M', connection_type: 'static_ip', speed: '10M/10M', price: 1500, duration_value: 30, duration_unit: 'days' };
const pppoePlan = { id: 2, name: 'Home PPPoE', connection_type: 'pppoe', speed: '5M/5M', price: 1000, duration_value: 30, duration_unit: 'days' };
const existing = { id: 101, name: 'Static Test', phone: 'N/A', connection_type: 'static_ip', static_ip: '192.168.2.24', status: 'active', expiry: '2099-11-12T00:00:00', plan: staticPlan, plan_id: 1, router_id: 11, router: { id: 11, name: 'Test Router' } };
const importedCustomers = [
  { ...existing, id: 201, name: 'Imported One', static_ip: '10.10.0.2' },
  { ...existing, id: 202, name: 'Imported Two', static_ip: '10.10.0.3', status: 'inactive' },
];

const CSV = 'name,static_ip,mac,phone,plan,expiry\n'
  + 'Imported One,10.10.0.2,AA:BB:CC:00:00:02,254700000002,Static 10M,2099-01-01\n'
  + 'Imported Two,10.10.0.3,,254700000003,Gold Plus,2020-01-01\n'
  + 'Static Test,192.168.2.24,,,Static 10M,2099-01-01\n';

const baseRows = [
  { row: 2, name: 'Imported One', static_ip: '10.10.0.2', mac: 'AA:BB:CC:00:00:02', phone: '254700000002', plan_label: 'Static 10M', plan_id: 1, plan_name: 'Static 10M', expiry: '2099-01-01T00:00:00', status: 'active', action: 'create', reason: null },
  { row: 3, name: 'Imported Two', static_ip: '10.10.0.3', mac: null, phone: '254700000003', plan_label: 'Gold Plus', plan_id: null, plan_name: null, expiry: '2020-01-01T00:00:00', status: 'inactive', action: 'error', reason: "Unknown plan 'Gold Plus'" },
  { row: 4, name: 'Static Test', static_ip: '192.168.2.24', mac: null, phone: null, plan_label: 'Static 10M', plan_id: 1, plan_name: 'Static 10M', expiry: '2099-01-01T00:00:00', status: 'active', action: 'skip', reason: 'IP already exists on this router' },
];

function field(body: string, name: string): string | null {
  const m = new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`).exec(body);
  return m ? m[1] : null;
}

interface ImportCall { apply: string | null; create: string | null; price: string | null; mapping: string | null; tz: string | null; hasFile: boolean }

async function setup(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => {
    // Dev-only notice caused by the app's CSP (no unsafe-eval); not emitted in production builds.
    if (msg.type() === 'error' && !msg.text().startsWith('eval() is not supported')) errors.push(`console: ${msg.text()}`);
  });
  await page.route('**/_vercel/insights/script.js', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.addInitScript(u => {
    localStorage.setItem('auth_token', 'test-static-token');
    localStorage.setItem('auth_user', JSON.stringify(u));
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('customers.filter.connection');
  }, user);

  const state = { imported: false, calls: [] as ImportCall[], templateAuth: null as string | null };

  await page.route('**/api/**', async route => {
    const req: Request = route.request();
    const path = new URL(req.url()).pathname;
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });

    if (path.endsWith('/static-customers/import-template')) {
      state.templateAuth = (await req.allHeaders())['authorization'] ?? null;
      return route.fulfill({
        contentType: 'text/csv',
        headers: { 'Content-Disposition': 'attachment; filename="static-ip-customers-template.csv"' },
        body: 'name,static_ip,mac,phone,plan,expiry\n',
      });
    }

    if (req.method() === 'POST' && path.endsWith('/routers/11/static-customers/import')) {
      const body = req.postDataBuffer()?.toString('utf8') ?? '';
      const call: ImportCall = {
        apply: field(body, 'apply'),
        create: field(body, 'create_missing_plans'),
        price: field(body, 'default_plan_price'),
        mapping: field(body, 'plan_mapping_json'),
        tz: field(body, 'source_timezone'),
        hasFile: /name="file"; filename="static-customers\.csv"/.test(body),
      };
      state.calls.push(call);
      const mapping = call.mapping ? JSON.parse(call.mapping) as Record<string, number> : {};
      const creating = call.create === 'true';
      const resolved = Boolean(mapping['Gold Plus']) || creating;
      const rows = baseRows.map(r => {
        if (r.row !== 3 || !resolved) return r;
        return mapping['Gold Plus']
          ? { ...r, plan_id: 1, plan_name: 'Static 10M', action: 'create', reason: null }
          : { ...r, plan_name: 'Gold Plus', action: 'create', reason: 'New plan will be created' };
      });
      const errorsCount = rows.filter(r => r.action === 'error').length;
      const plansToCreate = creating && !mapping['Gold Plus']
        ? [{ label: 'Gold Plus', name: 'Gold Plus', speed: '10M/10M', price: Number(call.price) }]
        : [];
      const applying = call.apply === 'true';
      if (applying && errorsCount === 0) state.imported = true;
      return json({
        success: errorsCount === 0,
        stage: 'import',
        router_id: 11,
        router_name: 'Test Router',
        source_file: 'static-customers.csv',
        dry_run: !applying,
        summary: {
          rows_total: 3,
          to_create: rows.filter(r => r.action === 'create').length,
          skipped: 1,
          errors: errorsCount,
          active: 2,
          inactive: 1,
          plans_to_create: plansToCreate.length,
        },
        plans_to_create: plansToCreate,
        rows,
        warnings: [{ row: 4, message: 'IP 192.168.2.24 already belongs to Static Test' }],
        created_customer_ids: applying && errorsCount === 0 ? [201, 202] : [],
      });
    }

    if (path.endsWith('/customers/usage/bulk')) return json([]);
    if (path.endsWith('/plans')) return json([staticPlan, pppoePlan]);
    if (path.endsWith('/routers')) return json([{ id: 11, name: 'Test Router' }]);
    if (path.endsWith('/customers') || path.endsWith('/customers/active')) {
      return json(state.imported ? [existing, ...importedCustomers] : [existing]);
    }
    if (path.endsWith('/messaging/inbox')) return json({ unread: 0, messages: [] });
    return json({});
  });

  return { errors, state };
}

async function hideDevBadge(page: Page) {
  await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
}

async function openModal(page: Page) {
  await page.goto('/customers');
  if (SHOTS) {
    await expect(page.getByRole('tab', { name: /Static IP/ })).toBeVisible();
    await hideDevBadge(page);
    await page.screenshot({ path: `review-shots/customers-header-${page.viewportSize()!.width}.png` });
  }
  await page.getByRole('button', { name: 'Import Static IP' }).filter({ visible: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Import Static IP Customers' });
  await expect(dialog).toBeVisible();
  // Routers and plans load on open.
  await expect(dialog.getByLabel('Router')).toHaveValue('11');
  await dialog.locator('input[type="file"]').setInputFiles({ name: 'static-customers.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV) });
  await expect(dialog.getByText('static-customers.csv').first()).toBeVisible();
  return dialog;
}

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`static IP import: error preview, fix via mapping, import at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const { errors, state } = await setup(page);
    const dialog = await openModal(page);
    const mobile = viewport.width < 768;

    // Template download goes through fetch with the bearer token.
    const downloadPromise = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Download template' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('static-ip-customers-template.csv');
    expect(state.templateAuth).toBe('Bearer test-static-token');

    const importBtn = dialog.getByRole('button', { name: /^Import (\d+ )?customers$/ });

    // 1) Preview with one error row: import stays disabled.
    await dialog.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('1 row has an error');
    const summary = dialog.getByTestId('static-import-summary');
    await expect(summary).toContainText('Errors1');
    await expect(importBtn).toBeDisabled();
    expect(state.calls[0]).toMatchObject({ apply: 'false', create: 'false', price: '0', mapping: null, tz: 'Africa/Nairobi', hasFile: true });
    // Errors are shown first and carry the backend reason.
    const rowsView = dialog.getByTestId(mobile ? 'static-import-cards' : 'static-import-table');
    await expect(rowsView).toBeVisible();
    await expect(rowsView.getByText("Unknown plan 'Gold Plus'")).toBeVisible();
    await expect(dialog.getByTestId('static-import-warnings')).toContainText('already belongs to Static Test');
    await dialog.getByRole('button', { name: 'All (3)' }).click();
    await expect(rowsView.getByText('IP already exists on this router')).toBeVisible();
    if (SHOTS) {
      await hideDevBadge(page);
      await summary.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `review-shots/static-import-preview-${viewport.width}.png` });
    }

    // 2) Map the unknown label to an existing Static IP plan (PPPoE plans are not offered).
    const mapSelect = dialog.getByLabel('Plan for Gold Plus');
    await expect(mapSelect.locator('option')).toHaveText(['Not matched', 'Static 10M']);
    await mapSelect.selectOption('1');
    await expect(dialog.getByText('Options changed. Run Preview again before importing.')).toBeVisible();
    await expect(importBtn).toBeDisabled();
    await dialog.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Import 2 customers' })).toBeEnabled();
    expect(JSON.parse(state.calls[1].mapping!)).toEqual({ 'Gold Plus': 1 });
    await expect(summary).toContainText('Errors0');
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    // The mapping stays visible after the label resolves.
    await expect(mapSelect).toHaveValue('1');

    // 3) Confirm and apply.
    await dialog.getByRole('button', { name: 'Import 2 customers' }).click();
    await expect(dialog.getByText('Create 2 static IP customers on Test Router?')).toBeVisible();
    await dialog.getByRole('button', { name: 'Yes, import 2' }).click();
    await expect(dialog.getByText('Created 2 static IP customers on Test Router.')).toBeVisible();
    await expect(dialog.getByTestId('static-import-summary')).toContainText('Created2');
    expect(state.calls[2]).toMatchObject({ apply: 'true', create: 'false' });
    expect(JSON.parse(state.calls[2].mapping!)).toEqual({ 'Gold Plus': 1 });
    if (SHOTS) {
      await hideDevBadge(page);
      await page.screenshot({ path: `review-shots/static-import-success-${viewport.width}.png` });
    }

    // 4) Done → list refreshed on the Static IP tab.
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /Static IP/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Static IP · 10.10.0.2').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('Static IP · 10.10.0.3').filter({ visible: true }).first()).toBeVisible();

    if (mobile) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.evaluate(() => window.scrollTo(0, 0));
      const nav = page.locator('nav.fixed');
      await expect(nav).toBeVisible();
      const box = await nav.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(389);
      await expect(nav.getByRole('link')).toHaveCount(5);
      // The dev-tools badge (<nextjs-portal>) only exists in dev and can sit over the nav.
      await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
      for (const link of await nav.getByRole('link').all()) await link.click({ trial: true });
    }
    expect(errors).toEqual([]);
  });

  test(`static IP import: create missing plans requires a price at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const { errors, state } = await setup(page);
    const dialog = await openModal(page);
    const preview = dialog.getByRole('button', { name: 'Preview', exact: true });

    await dialog.getByLabel(/Create missing plans/).check();
    const price = dialog.getByLabel('Price for new plans');
    await expect(price).toBeVisible();
    await expect(dialog.getByText('Enter a price for the new plans')).toBeVisible();
    await expect(preview).toBeDisabled();
    await price.fill('0');
    await expect(dialog.getByText('The plan price must be greater than 0')).toBeVisible();
    await expect(preview).toBeDisabled();
    await price.fill('1500');
    await expect(dialog.getByText('The plan price must be greater than 0')).toHaveCount(0);
    await expect(preview).toBeEnabled();
    expect(state.calls).toHaveLength(0);

    await preview.click();
    await expect(dialog.getByRole('button', { name: 'Import 2 customers' })).toBeEnabled();
    expect(state.calls[0]).toMatchObject({ apply: 'false', create: 'true', price: '1500', mapping: null });
    await expect(dialog.getByTestId('static-import-summary')).toContainText('Plans to create1');
    await expect(dialog.getByText('New plans', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Gold Plus · 10M/10M')).toBeVisible();

    // Unchecking plan creation makes the preview stale again.
    await dialog.getByLabel(/Create missing plans/).uncheck();
    await expect(dialog.getByText('Options changed. Run Preview again before importing.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: /^Import (\d+ )?customers$/ })).toBeDisabled();
    expect(errors).toEqual([]);
  });
}
