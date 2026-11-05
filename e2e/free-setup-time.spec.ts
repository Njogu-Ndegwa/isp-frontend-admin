import { expect, test, type Page, type Route } from '@playwright/test';

const ADMIN = {
  id: 1,
  email: 'admin@bitwave.test',
  role: 'admin',
  organization_name: 'Bitwave',
};

const INVOICE = {
  id: 42,
  user_id: 7,
  period_start: '2026-10-01T00:00:00',
  period_end: '2026-10-29T00:00:00',
  period_label: 'October 2026',
  hotspot_revenue: 0,
  hotspot_charge: 0,
  pppoe_user_count: 0,
  pppoe_charge: 0,
  gross_charge: 0,
  final_charge: 500,
  final_charge_kes: 500,
  currency: 'KES',
  pricing_rule: null,
  amount_paid: 0,
  balance_remaining: 500,
  status: 'overdue',
  due_date: '2026-10-29T00:00:00',
  paid_at: null,
  days_until_due: -7,
  is_overdue: true,
  is_due_soon: false,
  human_message: 'Overdue by 7 days',
  created_at: '2026-10-24T06:00:00',
};

const GRANT = {
  id: 3,
  granted_by_email: ADMIN.email,
  granted_at: '2026-11-05T07:00:00',
  free_until: '2026-11-12T07:00:00',
  previous_status: 'suspended',
  new_status: 'trial',
  previous_expires_at: '2026-10-29T00:00:00',
  new_expires_at: '2026-11-12T07:00:00',
  waived_invoices: [{
    invoice_id: 42,
    period_start: INVOICE.period_start,
    period_end: INVOICE.period_end,
    final_charge: 500,
    amount_paid: 0,
    balance_waived: 500,
    currency: 'KES',
    status_before: 'overdue',
  }],
  is_override: false,
  override_reason: null,
};

function detail(overrides: { status?: string; invoices?: unknown[]; free_setup?: unknown } = {}) {
  return {
    reseller: {
      id: 7,
      email: 'owner@fastnet.test',
      organization_name: 'FastNet ISP',
      market_code: 'KE',
    },
    subscription: {
      status: overrides.status ?? 'suspended',
      expires_at: '2026-10-29T00:00:00',
      trial_ends_at: null,
      current_period_start: null,
      current_period_end: null,
      total_paid: 0,
      total_paid_by_currency: {},
      invoice_count: 1,
      pending_invoice: null,
    },
    invoices: overrides.invoices ?? [INVOICE],
    payments: [],
    free_setup: overrides.free_setup ?? { until: null, active: false, grants: [] },
  };
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function open(page: Page, responses: () => unknown, onPost?: (body: unknown) => void) {
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token', 'test-admin-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(ADMIN))});
  `);
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/admin/subscriptions/7/free-setup')) {
      onPost?.(request.postDataJSON());
      return json(route, { message: 'Free setup time given', grant: GRANT });
    }
    if (path.endsWith('/admin/subscriptions/7')) return json(route, responses());
    return json(route, {});
  });
  await page.goto('/admin/subscriptions/7');
  await expect(page.getByRole('heading', { name: 'Free setup time', exact: true })).toBeVisible();
}

for (const [name, viewport] of [
  ['desktop', { width: 1280, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
] as const) {
  test(`admin gives free setup time on ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    let granted = false;
    let posted: unknown = null;
    await open(
      page,
      () => (granted
        ? detail({
          status: 'trial',
          invoices: [{ ...INVOICE, status: 'waived', balance_remaining: 500, human_message: 'Waived' }],
          free_setup: { until: GRANT.free_until, active: true, grants: [GRANT] },
        })
        : detail()),
      (body) => { granted = true; posted = body; },
    );

    await page.screenshot({ path: `test-results/free-setup-${name}-before.png`, fullPage: true });
    await page.getByRole('button', { name: 'Free setup time (7 days)' }).click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('For FastNet ISP, this will:');
    await expect(dialog).toContainText('Waive 1 unpaid invoice: KES 500');
    await expect(dialog).toContainText('Lift the suspension');
    await expect(dialog).toContainText('Set the end date to');
    await expect(dialog).toContainText('no invoice, suspension or renewal SMS for 7 days');
    await expect(dialog).toContainText('does not count as a sale');
    await page.screenshot({ path: `test-results/free-setup-${name}-confirm.png` });

    const box = await dialog.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= viewport.width).toBeTruthy();

    await dialog.getByRole('button', { name: 'Give free setup time' }).click();

    await expect(page.getByText(/On free setup until 12 Nov 2026|On free setup until Nov 12, 2026/)).toBeVisible();
    await expect(page.getByText(`by ${ADMIN.email}`)).toBeVisible();
    await expect(page.getByText('Waived 1 invoice (KES 500)')).toBeVisible();
    expect(posted).toEqual({});
    await page.screenshot({ path: `test-results/free-setup-${name}-after.png`, fullPage: true });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('already used: shows who and when, and giving it again needs a reason', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let posted: unknown = null;
  await open(
    page,
    () => detail({ free_setup: { until: GRANT.free_until, active: false, grants: [GRANT] } }),
    (body) => { posted = body; },
  );

  await expect(page.getByText(/Already used/)).toBeVisible();
  await page.getByRole('button', { name: /Give again/ }).click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText(`by ${ADMIN.email}`);
  const confirm = dialog.getByRole('button', { name: 'Give again' });
  await expect(confirm).toBeDisabled();

  await dialog.getByLabel('Why give it again?').fill('Router arrived late');
  await page.screenshot({ path: 'test-results/free-setup-mobile-override.png' });
  await confirm.click();

  await expect.poll(() => posted).toEqual({ override: true, override_reason: 'Router arrived late' });
});

test('no unpaid invoice still offers the window and says nothing is waived', async ({ page }) => {
  await open(page, () => detail({ invoices: [] }));
  await page.getByRole('button', { name: 'Free setup time (7 days)' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('there is no unpaid invoice');
});

test('an inactive account cannot be given it', async ({ page }) => {
  await open(page, () => detail({ status: 'inactive' }));
  await expect(page.getByRole('button', { name: 'Free setup time (7 days)' })).toBeDisabled();
  await expect(page.getByText('set to inactive by hand')).toBeVisible();
});

test('a reseller does not get the screen', async ({ page }) => {
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token', 'test-reseller-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify({ ...ADMIN, role: 'reseller' }))});
  `);
  await page.route('**/api/**', (route) => json(route, {}));
  await page.goto('/admin/subscriptions/7');
  await expect(page.getByRole('button', { name: 'Free setup time (7 days)' })).toHaveCount(0);
});
