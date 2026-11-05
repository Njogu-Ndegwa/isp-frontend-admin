import { expect, test, type Page, type Route } from '@playwright/test';

// Refunds of unused days, time off and renewal prices on /ads/{id}, /ads/sales
// and the shop's link. The backend is mocked with payloads shaped like
// GET /api/ads/{id}/sale and GET /api/ad-sales (isp-billing ADS_API.md).

const ADMIN = { id: 1, email: 'admin@bitwave.test', role: 'admin', organization_name: 'Bitwave Admin', subscription_status: 'active' };
const RESELLER = { id: 20, email: 'net@example.com', role: 'reseller', organization_name: 'Acme Net', business_name: 'Acme Net', subscription_status: 'active', market_code: 'KE' };

const SALE = {
  sale_id: 3, ad_id: 12, business_name: 'E2E Test Shop', business_phone: '254722111222', price_per_week: 200, weeks: 1, fee_percent: 20,
  state: 'live', amount_due: null, due_kind: null, due_weeks: null, due_price_per_week: null, price_changed_from: null,
  payment_status: 'paid', last_payment_error: null, can_resend: false, prompt: null,
  paid_total: 200, bitwave_fee_total: 40, reseller_share_total: 160, credited_total: 160, refund_due_total: 0, refunded_total: 0,
  reseller_recovered_total: 0, bitwave_refund_part_total: 0, shop_net_total: 200, bitwave_fee_net_total: 40, reseller_share_net_total: 160,
  clock_stopped: false, off_reason: null, off_seconds_total: 0, payout_status: 'credited', weeks_banked: 0,
  live_from: '2026-11-05T10:00:00', live_until: '2026-11-12T10:00:00', renewal_due: true, can_renew: true,
  share_url: 'https://example.test/promo/abc', payments: [] as unknown[],
};

const TAKEN_DOWN = {
  ...SALE, state: 'taken_down', can_renew: false, renewal_due: false, payout_status: 'refund_due', refund_due_total: 85,
  reseller_recovered_total: 68, bitwave_refund_part_total: 17, shop_net_total: 115, bitwave_fee_net_total: 23, reseller_share_net_total: 92,
  payments: [{
    id: 9, kind: 'initial', weeks: 1, price_per_week: 200, amount: 200, bitwave_fee: 40, reseller_share: 160, phone: '254722111222', status: 'paid',
    mpesa_receipt: 'RKX1', result_desc: null, is_duplicate: false, paid_at: '2026-11-05T10:00:00', credited_at: '2026-11-05T10:00:00',
    refund_status: 'due', refund_reason: 'Taken down with 3 of 7 paid days unused: Misleading', refund_amount: 85, refund_unused_days: 3,
    reseller_recovery: 68, bitwave_refund_part: 17, refunded_at: null, created_at: '2026-11-05T10:00:00',
  }],
};

function ad(sale: typeof SALE, over: Record<string, unknown> = {}) {
  return {
    id: 12, advertiser_id: null, title: 'Fresh mandazi', description: null, seller_name: 'E2E Test Shop', seller_location: null,
    phone_number: '0722111222', whatsapp_number: null, price: null, price_value: null, category: null, badge_type: null, badge_text: null,
    placement: 'hero', media_type: 'image', image_url: 'https://media.example/m.webp', video_url: null, poster_url: null, image_fit: 'cover',
    bg_color: null, slot: 'reseller', owner_user_id: 20, owner_name: 'Acme Net', router_ids: null, status: 'approved', review_note: null,
    reviewed_at: '2026-11-05T10:00:00', is_active: true, priority: 0, starts_at: '2026-11-05T10:00:00', expires_at: '2026-11-12T10:00:00',
    created_at: '2026-11-05T09:00:00', views_count: 4, clicks_count: 1, sale, ...over,
  };
}

const json = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

async function setup(page: Page, user: Record<string, unknown> | null, sale: typeof SALE, over: Record<string, unknown> = {}) {
  await page.addInitScript((u) => {
    if (!u) return;
    localStorage.setItem('auth_token', 'tok');
    localStorage.setItem('auth_user', JSON.stringify(u));
  }, user);
  const detail = ad(sale, over);
  await page.route(/\/api\//, (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api/, '');
    if (path === '/ads/12/sale') return json(route, sale);
    if (path === '/ads/manage/12') return json(route, detail);
    if (path === '/ads/12/stats') return json(route, { ad_id: 12, period_days: 30, impressions: 4, clicks: 1, by_placement: {}, daily: [] });
    if (path === '/ad-sales/access') return json(route, { allowed: true });
    if (path === '/ad-sales') {
      return json(route, {
        sales: [{ ...sale, title: 'Fresh mandazi', owner_user_id: 20, owner_name: 'Acme Net' }],
        totals: {
          paid_total: sale.paid_total, bitwave_fee_total: sale.bitwave_fee_total, reseller_share_total: sale.reseller_share_total,
          credited_total: sale.credited_total, refund_due_total: sale.refund_due_total, refunded_total: sale.refunded_total,
          reseller_recovered_total: sale.reseller_recovered_total, bitwave_refund_part_total: sale.bitwave_refund_part_total,
          shop_net_total: sale.shop_net_total, bitwave_fee_net_total: sale.bitwave_fee_net_total, reseller_share_net_total: sale.reseller_share_net_total,
        },
        pagination: { page: 1, per_page: 50, total: 1, total_pages: 1 }, fee_percent: 20, min_price_per_week: 200, max_weeks: 12,
      });
    }
    if (path === '/ad-review/rules') {
      return json(route, { blocked_words: ['bet'], default_blocked_words: ['bet'], fee_percent: 20, min_price_per_week: 200, max_weeks: 12, selling_mode: 'allowlist', selling_modes: ['off', 'allowlist', 'everyone'], selling_allowlist: [] });
    }
    if (path === '/public/promo/abc') {
      return json(route, {
        title: 'Fresh mandazi', business_name: 'E2E Test Shop', network_name: 'Acme Net', image_url: null, state: 'live',
        live_from: '2026-11-05T10:00:00', live_until: '2026-11-12T10:00:00', views: 4, taps: 1, daily: [],
        payment_due: { amount: 300, weeks: 1, price_per_week: 300, kind: 'renewal', status: 'awaiting_payment', previous_price_per_week: 200 },
      });
    }
    if (path.startsWith('/routers')) return json(route, []);
    if (path === '/portal/settings') return json(route, { settings: { show_ads: true } });
    return json(route, {});
  });
}

async function noSideScroll(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(1);
}

for (const width of [1280, 375]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test('/ads/{id} shows the refund and how it splits, to the reseller', async ({ page }) => {
      await setup(page, RESELLER, TAKEN_DOWN as typeof SALE, { status: 'rejected', review_note: 'Taken down by Bitwave: Misleading' });
      await page.goto('/ads/12');
      const panel = page.getByTestId('sale-panel');
      await expect(panel).toContainText('KES 85 is waiting for Bitwave to refund to the shop.');
      await expect(page.getByTestId('refund-split')).toContainText('KES 68 comes off your payout, KES 17 from Bitwave');
      await expect(panel).toContainText('KES 92');
      await page.getByRole('button', { name: /Payment history/ }).click();
      await expect(panel).toContainText('3 of 7 paid days unused');
      await noSideScroll(page);
      await page.screenshot({ path: `test-results/money-detail-${width}.png`, fullPage: true });
    });

    test('the form keeps "You get KES 160" and says M-Pesa’s transfer fee applies on payout', async ({ page }) => {
      await setup(page, RESELLER, SALE);
      await page.goto('/ads/new');
      await page.getByText('An ad I sold').first().click();
      await page.getByLabel('Weeks').selectOption('1');
      await expect(page.getByTestId('sale-split')).toContainText('KES 160');
      await expect(page.getByTestId('transfer-fee-note')).toContainText('transfer fee');
      await noSideScroll(page);
    });

    test('/ads/sales lets an admin see and act on the refund', async ({ page }) => {
      await setup(page, ADMIN, TAKEN_DOWN as typeof SALE);
      await page.goto('/ads/sales');
      const mark = page.getByRole('button', { name: /Mark refunded/ }).locator('visible=true').first();
      await expect(mark).toContainText('KES 85');
      await expect(page.locator('body')).toContainText('KES 68');
      await mark.click();
      await expect(page.getByText(/This records the refund; it does not send any money/)).toBeVisible();
      await expect(page).toHaveURL(/\/ads\/sales/);
      await noSideScroll(page);
      await page.screenshot({ path: `test-results/money-sales-${width}.png`, fullPage: true });
    });

    test('a paused ad says the paid days are not counting', async ({ page }) => {
      await setup(page, RESELLER, { ...SALE, state: 'paused', clock_stopped: true, off_reason: 'paused' } as unknown as typeof SALE, { is_active: false });
      await page.goto('/ads/12');
      await expect(page.getByTestId('clock-stopped')).toContainText('paid days aren’t counting');
      await noSideScroll(page);
    });

    test('renewing at a new price needs the reseller to say the shop was told', async ({ page }) => {
      await setup(page, RESELLER, SALE);
      await page.goto('/ads/12');
      await page.getByRole('button', { name: 'Renew', exact: true }).click();
      await expect(page.getByTestId('new-price-told')).toHaveCount(0);
      await page.getByLabel('Price per week (KES)').fill('300');
      const told = page.getByTestId('new-price-told');
      await expect(told).toContainText('KES 300');
      const send = page.getByTestId('sale-renew-form').getByRole('button', { name: 'Send M-Pesa prompt' });
      await expect(send).toBeDisabled();
      await told.getByRole('checkbox').check();
      await expect(send).toBeEnabled();
      await noSideScroll(page);
      await page.screenshot({ path: `test-results/money-renew-${width}.png`, fullPage: true });
    });

    test('the shop link shows a new price before the shop pays', async ({ page }) => {
      await setup(page, null, SALE);
      await page.goto('/promo/abc');
      await expect(page.getByTestId('new-price')).toContainText('KES 300');
      await expect(page.getByTestId('new-price')).toContainText('KES 200');
      await noSideScroll(page);
      await page.screenshot({ path: `test-results/money-promo-${width}.png`, fullPage: true });
    });
  });
}
