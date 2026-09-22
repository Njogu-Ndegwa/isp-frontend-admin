import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Mobile (390x844) verification that an admin can reach Subscription
 * Collections and run a withdrawal from a phone: the page used to be
 * linked only from the desktop sidebar, so there was no way in.
 *
 * Also guards the Confirm Transfer sheet against the mobile bottom nav,
 * which sits at z-[9999] and would otherwise cover its buttons.
 *
 * All backend calls are stubbed via page.route so nothing real is touched;
 * auth is injected into localStorage (AuthContext trusts localStorage).
 */

const ADMIN = {
  id: 1, email: 'admin@bitwave.test', role: 'admin',
  organization_name: 'Bitwave', subscription_status: 'active',
};

const SUMMARY = {
  paybill_collected: 482_000,
  total_collected: 482_000,
  completed_sent: 300_000,
  pending_send: 12_000,
  available_to_send: 170_000,
  completed_bank_net: 298_150,
  completed_fees: 1_850,
  fee_preview: { safaricom_fee: 210, kadogo_surcharge: 0, net_payout: 169_790 },
  card_settlement: {
    fee_rate: 0.03, fee_assumed: true, currency: 'KES', payment_count: 1,
    gross_collected: 1_295, processing_fees: 38.85, net_settlement: 1_256.15,
  },
};

const DESTINATION = {
  id: 1, label: 'Equity Settlement', method_type: 'bank_account',
  bank_paybill_number: '247247', bank_account_number: '1234567890',
  mpesa_paybill_number: null, is_active: true, created_at: '2026-01-04T10:00:00Z',
};

function json(route: Route, body: unknown) {
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
}

async function stubApi(page: Page, destinations: unknown[]) {
  await page.route('**/api/**', async (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p.endsWith('/subscriptions/collections')) return json(route, SUMMARY);
    if (p.endsWith('/bank-destinations')) return json(route, { destinations });
    if (p.endsWith('/subscriptions/payments')) return json(route, { payments: [], total: 0, page: 1, total_pages: 1 });
    if (p.includes('/admin/subscriptions')) return json(route, { subscriptions: [], total: 0, page: 1, total_pages: 1 });
    return json(route, {});
  });
}

async function openAsAdmin(page: Page, destinations: unknown[]) {
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token','test-admin-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(ADMIN))});
  `);
  await stubApi(page, destinations);
  await page.setViewportSize({ width: 390, height: 844 });
  // Any admin page without a back link renders the hamburger that opens the
  // mobile sidebar — the collections page itself only shows a back arrow.
  await page.goto('/admin/subscriptions', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;}' }).catch(() => {});
}

test('admin reaches Collections from the mobile sidebar', async ({ page }) => {
  await openAsAdmin(page, [DESTINATION]);

  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await page.getByRole('link', { name: 'Collections', exact: true }).click();

  await page.waitForURL('**/admin/subscription-collections');
  await expect(page.getByRole('heading', { name: 'Subscription Collections' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send Available Balance' })).toBeVisible();
});

test('card settlement is separate from the M-Pesa paybill on mobile', async ({ page }) => {
  await openAsAdmin(page, [DESTINATION]);
  await page.goto('/admin/subscription-collections', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Collected in Paybill')).toBeVisible();
  await expect(page.getByText('Paystack Card Settlement')).toBeVisible();
  await expect(page.getByText('Gross Card MRR')).toBeVisible();
  await expect(page.getByText('Paystack Fees')).toBeVisible();
  await expect(page.getByText('Card Net to Bank')).toBeVisible();
  await expect(page.getByText('3% assumed processing fee')).toBeVisible();
});

test('confirm-transfer sheet clears the mobile bottom nav', async ({ page }) => {
  await openAsAdmin(page, [DESTINATION]);
  await page.goto('/admin/subscription-collections', { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: 'Send Available Balance' }).click();
  await expect(page.getByRole('heading', { name: 'Confirm Transfer' })).toBeVisible();

  const send = page.getByRole('button', { name: 'Send to Bank', exact: true });
  await expect(send).toBeEnabled();

  const box = await send.boundingBox();
  expect(box, 'send button should have a bounding box').toBeTruthy();
  expect(box!.y + box!.height, 'send button bottom should be on screen').toBeLessThanOrEqual(845);

  // Not covered by app UI (e.g. the mobile bottom nav). The Next.js
  // dev-tools overlay (<nextjs-portal>) only exists in dev — ignore it.
  const coveredBy = await send.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!hit || hit === el || el.contains(hit)) return null;
    if (hit.closest('nextjs-portal')) return null;
    return `${hit.tagName}.${(hit as HTMLElement).className}`;
  });
  expect(coveredBy, 'send button should not be covered by another element').toBeNull();
});

test('transfer is blocked until a bank destination exists', async ({ page }) => {
  await openAsAdmin(page, []);
  await page.goto('/admin/subscription-collections', { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: 'Send Available Balance' }).click();
  await expect(page.getByText('No active bank destination yet.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send to Bank', exact: true })).toBeDisabled();

  // The prompt drops the admin on the tab where they can add one.
  await page.getByRole('button', { name: 'Add a destination' }).click();
  await expect(page.getByRole('button', { name: '+ Add Destination' })).toBeVisible();
});
