import { expect, test, type Page, type Route } from '@playwright/test';

// Admin dashboard money vocabulary: "Transaction volume" (resellers' customer
// payments) is kept apart from "Bitwave earnings" (what Bitwave itself makes).
// The backend is mocked with payloads shaped like GET /api/admin/dashboard and
// GET /api/admin/metrics/platform-earnings (isp-billing feat/admin-bitwave-earnings).

const ADMIN = {
  id: 1,
  email: 'admin@bitwave.test',
  role: 'admin',
  organization_name: 'Bitwave Admin',
  subscription_status: 'active',
};

const DASHBOARD = {
  currency: 'KES',
  reporting_currency: 'KES',
  usd_rate: 129,
  resellers: { total: 120, active_last_30_days: 80, paying_subscriptions: 64, active_subscriptions: 75 },
  revenue: {
    today: 41_000, today_mpesa: 40_000, this_week: 260_000, this_week_mpesa: 250_000,
    this_month: 1_180_000, this_month_mpesa: 1_120_000, all_time: 21_000_000, all_time_mpesa: 20_000_000,
  },
  customers: { total: 9_000, active: 4_100, inactive: 4_900 },
  routers: { total: 140, online: 128, offline: 12 },
  top_resellers_this_month: [
    { id: 7, email: 'net@example.com', organization_name: 'Kasarani Net', month_revenue: 210_000 },
  ],
  payouts: { total_paid: 0, total_unpaid: 0 },
  recent_signups: [],
  growth_deltas: {
    revenue_change_percent: 12.4, resellers_change_percent: 3.1, customers_change_percent: 4,
    comparison_period: 'vs same point last month',
  },
  generated_at: '2026-10-29T10:00:00Z',
};

const PLATFORM = {
  period: 'month',
  start_date: '2026-10-01',
  end_date: '2026-10-29',
  days: 29,
  comparison_label: 'vs same point last month',
  currency: 'KES',
  reporting_currency: 'KES',
  usd_rate: 129,
  transaction_volume: {
    total: 1_180_000, previous_total: 1_050_000, change_percent: 12.38, payments: 5_210,
    mpesa_platform_collected: 640_000, mpesa_direct_settled: 480_000, recorded_manually: 60_000,
  },
  earnings: {
    basis: 'collected', total: 46_250, previous_total: 41_000, change_percent: 12.8,
    subscriptions: 41_450, sms_credits: 4_800, sms_orders: 9,
    streams: [
      { key: 'subscription_hotspot', label: 'Hotspot commission', group: 'subscriptions', total: 25_300, previous_total: 22_000 },
      { key: 'subscription_per_user', label: 'PPPoE / static per-user fees', group: 'subscriptions', total: 9_650, previous_total: 9_000 },
      { key: 'subscription_minimum', label: 'Minimum / flat subscription fee', group: 'subscriptions', total: 6_500, previous_total: 6_000 },
      { key: 'sms_credits', label: 'SMS credit sales', group: 'sms', total: 4_800, previous_total: 4_000 },
    ],
  },
  invoiced: {
    total: 52_400, subscription_hotspot: 29_100, subscription_per_user: 11_300, subscription_minimum: 12_000,
    invoices: 58, paid_so_far: 39_900, outstanding: 12_500, waived: 2_500, waived_invoices: 5,
  },
  take_rate_percent: 3.92,
  not_counted: { shop_sales: 18_500, reseller_transaction_charges: 1_240 },
  excluded_own_accounts: [],
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function setup(page: Page) {
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token', 'test-admin-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(ADMIN))});
  `);
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/admin/dashboard')) return json(route, DASHBOARD);
    if (path.endsWith('/admin/metrics/platform-earnings')) return json(route, PLATFORM);
    // Everything else on the page is out of scope: a 503 lands in each
    // widget's own fallback.
    return json(route, { detail: 'mocked out' }, 503);
  });
}

for (const width of [375, 1280]) {
  test(`admin dashboard separates transaction volume from Bitwave earnings at ${width}px`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    const card = page.getByTestId('bitwave-earnings-card');
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(card).toContainText('KES 46,250');
    await expect(card).toContainText('Hotspot commission');
    await expect(card).toContainText('SMS credit sales');
    await expect(card).toContainText('3.92%');
    await expect(card).toContainText('Outstanding');

    await expect(page.getByText('Transaction volume', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Period Revenue')).toHaveCount(0);
    await expect(page.getByText('M-Pesa Transaction Revenue')).toHaveCount(0);

    // The (i) explains that volume is not Bitwave's income.
    const info = page.getByRole('button', { name: /not Bitwave's income/ }).first();
    await info.click();
    await expect(page.getByText("Total customer payments processed through Bitwave for all resellers — not Bitwave's income").first()).toBeVisible();

    // No horizontal scroll on phones.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    if (process.env.E2E_SCREENSHOT_DIR) {
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${process.env.E2E_SCREENSHOT_DIR}/admin-earnings-${width}.png`, fullPage: false });
      await card.screenshot({ path: `${process.env.E2E_SCREENSHOT_DIR}/bitwave-earnings-card-${width}.png` });
    }
  });
}
