import { expect, test, type Page, type Route } from '@playwright/test';

// Nobody reviews an ad first (Dennis, 5 Nov 2026). The backend is mocked with
// payloads shaped like GET /api/ads/manage and GET /api/ad-sales (isp-billing
// ADS_API.md).

const ADMIN = { id: 1, email: 'admin@bitwave.test', role: 'admin', organization_name: 'Bitwave Admin', subscription_status: 'active' };
const RESELLER = { id: 20, email: 'net@example.com', role: 'reseller', organization_name: 'Acme Net', business_name: 'Acme Net', subscription_status: 'active', market_code: 'KE' };

const SALE = {
  sale_id: 3, ad_id: 12, business_name: 'E2E Test Shop', business_phone: '254722111222', price_per_week: 200, weeks: 1,
  fee_percent: 20, state: 'live', amount_due: null, due_kind: null, payment_status: 'paid', last_payment_error: null,
  can_resend: false, prompt: null, paid_total: 200, bitwave_fee_total: 40, reseller_share_total: 160, credited_total: 160,
  refund_due_total: 0, payout_status: 'credited', weeks_banked: 0, live_from: '2026-11-05T10:00:00', live_until: '2026-11-12T10:00:00',
  renewal_due: false, can_renew: true, share_url: 'https://example.test/promo/abc', payments: [],
};

function ad(over: Record<string, unknown> = {}) {
  return {
    id: 12, advertiser_id: null, title: 'Fresh mandazi', description: null, seller_name: 'E2E Test Shop', seller_location: null,
    phone_number: '0722111222', whatsapp_number: null, price: null, price_value: null, category: null, badge_type: null, badge_text: null,
    placement: 'hero', media_type: 'image', image_url: 'https://media.example/m.webp', video_url: null, poster_url: null, image_fit: 'cover',
    bg_color: null, slot: 'reseller', owner_user_id: 20, owner_name: 'Acme Net', router_ids: null, status: 'approved', review_note: null,
    reviewed_at: '2026-11-05T10:00:00', is_active: true, priority: 0, starts_at: '2026-11-05T10:00:00', expires_at: '2026-11-12T10:00:00',
    created_at: '2026-11-05T09:00:00', views_count: 4, clicks_count: 1, sale: SALE, ...over,
  };
}

const pagination = (total: number) => ({ page: 1, per_page: 50, total, total_pages: 1 });
const json = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

async function setup(page: Page, user: Record<string, unknown>, detail: ReturnType<typeof ad> = ad()) {
  await page.addInitScript((u) => {
    localStorage.setItem('auth_token', 'tok');
    localStorage.setItem('auth_user', JSON.stringify(u));
  }, user);
  await page.route(/\/api\//, (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/api/, '');
    if (path === '/ads/manage') {
      if (url.searchParams.get('status') === 'pending') return json(route, { ads: [], pagination: pagination(2) });
      return json(route, { ads: [detail], pagination: pagination(1) });
    }
    if (/^\/ads\/\d+\/sale$/.test(path)) return json(route, detail.sale);
    if (/^\/ads\/manage\/\d+$/.test(path)) return json(route, detail);
    if (/^\/ads\/\d+\/stats$/.test(path)) return json(route, { ad_id: 12, period_days: 30, impressions: 4, clicks: 1, by_placement: {}, daily: [] });
    if (path === '/ads/analytics') return json(route, { period_days: 30, total_ads: 1, active_ads: 1, total_clicks: 1, clicks_by_type: {}, total_impressions: 4, by_placement: {}, top_ads_by_clicks: [] });
    if (path === '/ad-sales/access') return json(route, { allowed: true });
    if (path === '/ad-sales') {
      return json(route, {
        sales: [{ ...SALE, title: 'Fresh mandazi', owner_user_id: 20, owner_name: 'Acme Net' }],
        totals: { paid_total: 200, bitwave_fee_total: 40, reseller_share_total: 160, credited_total: 160, refund_due_total: 0 },
        pagination: pagination(1), fee_percent: 20, min_price_per_week: 200, max_weeks: 12,
      });
    }
    if (path === '/ad-review/rules') {
      return json(route, {
        blocked_words: ['bet'], default_blocked_words: ['bet'], fee_percent: 20, min_price_per_week: 200, max_weeks: 12,
        selling_mode: 'allowlist', selling_modes: ['off', 'allowlist', 'everyone'], selling_allowlist: [{ id: 20, name: 'Acme Net' }],
      });
    }
    if (path.startsWith('/routers')) return json(route, []);
    if (path === '/portal/settings') return json(route, { settings: { show_ads: true } });
    return json(route, {});
  });
}

const OLD_COPY = /Pending review|Paid, in review|for review|Bitwave checks|is checking|After 3 approved|credited when it goes live/i;

async function noSideScroll(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(1);
}

for (const width of [1280, 375]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test('admin /ads has Newly live instead of a Review tab', async ({ page }) => {
      await setup(page, ADMIN);
      await page.goto('/ads');
      await expect(page.getByRole('tab', { name: /Newly live/ })).toBeVisible();
      await expect(page.getByRole('tab', { name: /^Review/ })).toHaveCount(0);
      await page.getByRole('tab', { name: /Newly live/ }).click();
      await expect(page.getByTestId('newly-live').getByText('Fresh mandazi')).toBeVisible();
      await expect(page.locator('body')).not.toContainText(OLD_COPY);
      await noSideScroll(page);
      await page.screenshot({ path: `test-results/ads-admin-${width}.png`, fullPage: true });
    });

    test('/ads/sales has no review wording', async ({ page }) => {
      await setup(page, RESELLER);
      await page.goto('/ads/sales');
      await expect(page.getByText('Fresh mandazi').locator('visible=true').first()).toBeVisible();
      await expect(page.locator('body')).not.toContainText(OLD_COPY);
      await noSideScroll(page);
      await page.screenshot({ path: `test-results/ads-sales-${width}.png`, fullPage: true });
    });

    test('/ads/new says a sold ad goes live when the shop pays', async ({ page }) => {
      await setup(page, RESELLER);
      await page.goto('/ads/new');
      await page.getByText('An ad I sold').first().click();
      await expect(page.getByText('It goes live as soon as the shop pays')).toBeVisible();
      await expect(page.locator('body')).not.toContainText(OLD_COPY);
      await noSideScroll(page);
      await page.screenshot({ path: `test-results/ads-new-${width}.png`, fullPage: true });
    });

    test('an old pending own promo tells its owner how to put it live', async ({ page }) => {
      await setup(page, RESELLER, ad({ status: 'pending', slot: 'house', sale: null, starts_at: null, expires_at: null }));
      await page.goto('/ads/12');
      await expect(page.getByText('Change anything in it and save to put it live.')).toBeVisible();
      await expect(page.locator('body')).not.toContainText(OLD_COPY);
      await noSideScroll(page);
      await page.screenshot({ path: `test-results/ads-detail-${width}.png`, fullPage: true });
    });

    test('a paid ad stuck from the old review shows Approve to an admin, and Take down stays', async ({ page }) => {
      await setup(page, ADMIN, ad({
        status: 'pending', starts_at: null, expires_at: null,
        sale: { ...SALE, state: 'in_review', payout_status: 'waiting_to_run', credited_total: 0, weeks_banked: 1, live_from: null, live_until: null },
      }));
      await page.goto('/ads/12');
      await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible();
      await expect(page.getByText('Paid, not live yet').first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Take down' })).toBeVisible();
      await expect(page.locator('body')).not.toContainText(OLD_COPY);
    });
  });
}
