import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Reseller on their own SMS gateway (TextSMS) whose key has stopped working.
 * Modelled on a real case (2026-10-08): every message rejected with
 * "Invalid credentials" for two days while the page only showed "0 credits".
 *
 * Backend calls are stubbed (page.route) and auth injected into localStorage,
 * as in messaging-mobile.spec.ts. Screens land in e2e/screens/gateway/.
 */

const RESELLER = {
  id: 597, email: 'reseller@bitwave.test', role: 'reseller',
  organization_name: 'TECHMID LOGISTICS', subscription_status: 'active',
};

const CREDITS = {
  balance: 0, total_purchased: 120, total_spent: 120,
  price_per_sms_kes: 0.5, min_purchase_credits: 10, bundles: [], enabled: true,
  gateway: {
    source: 'reseller', provider: 'textsms', provider_label: 'TextSMS Kenya',
    sender_id: 'Techmid', account_id: 1, bills_platform_credits: false,
  },
  bills_platform_credits: false,
};

const INVALID_CREDENTIALS = {
  code: 'invalid_credentials',
  title: 'Gateway rejected your login',
  explanation: 'TextSMS Kenya refused the API key or account ID saved here. This usually means the key was regenerated, or the account was suspended.',
  action: 'Copy the current API key and partner/account ID from TextSMS Kenya dashboard and save them again under Messaging → Gateway.',
  severity: 'blocking',
  raw_error: 'Invalid credentials',
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString().replace('Z', '');

const STATUS = {
  gateway: {
    ...CREDITS.gateway, label: 'TextSMS Kenya gateway',
    settings_changed_at: hoursAgo(120), last_test_at: hoursAgo(119),
    last_test_ok: true, last_test_error: null,
  },
  health: {
    state: 'failing', reason: INVALID_CREDENTIALS, consecutive_failures: 153,
    failing_since: hoursAgo(55),
    message: 'Gateway rejected your login. Checked just now with TextSMS Kenya.',
  },
  metrics: {
    windows: {
      '24h': { sent: 0, failed: 78, total: 78, success_rate: 0 },
      '7d': { sent: 131, failed: 155, total: 286, success_rate: 0.458 },
      '30d': { sent: 215, failed: 155, total: 370, success_rate: 0.581 },
    },
    last_sent_at: hoursAgo(55), last_failed_at: hoursAgo(1),
  },
  failure_reasons: [
    { ...INVALID_CREDENTIALS, count: 153, last_seen: hoursAgo(1) },
    {
      code: 'provider_error', title: 'Gateway had an internal error',
      explanation: 'TextSMS Kenya failed on their side while handling the message.',
      action: 'Usually clears on its own. If it keeps happening, contact TextSMS Kenya.',
      severity: 'temporary', count: 1, last_seen: hoursAgo(80),
      raw_error: 'fwrite(): write of 138 bytes failed with errno=28 No space left on device',
    },
  ],
  balance: {
    available: true, ok: false, balance: null, unit: null,
    error: 'Invalid credentials', failure: INVALID_CREDENTIALS, checked_at: hoursAgo(0),
  },
  generated_at: hoursAgo(0),
};

const CAMPAIGNS = [{
  id: 4460, body: 'Your internet package has expired. Please renew to restore service.',
  recipient_count: 1, segments_per_message: 1, total_credits: 0, sent_count: 0,
  failed_count: 1, refunded_credits: 0, status: 'failed', created_at: hoursAgo(2),
}];

const CAMPAIGN_DETAIL = {
  id: 4460, status: 'failed',
  counts: { total: 1, sent: 0, failed: 1, queued: 0, delivered: 0 },
  messages: [{ phone: '254712345678', name: 'Brian Kemboi', status: 'failed',
               error: 'Invalid credentials', reason: INVALID_CREDENTIALS }],
  failure_reasons: [{ code: 'invalid_credentials', title: INVALID_CREDENTIALS.title,
                      explanation: INVALID_CREDENTIALS.explanation,
                      action: INVALID_CREDENTIALS.action, severity: 'blocking', count: 1 }],
};

function json(route: Route, body: unknown) {
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
}

async function stubApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p.endsWith('/messaging/gateway/status')) return json(route, STATUS);
    if (p.endsWith('/messaging/credits/ledger')) return json(route, { transactions: [] });
    if (p.endsWith('/messaging/credits')) return json(route, CREDITS);
    if (p.endsWith('/messaging/campaigns')) return json(route, { campaigns: CAMPAIGNS });
    if (/\/messaging\/campaigns\/\d+$/.test(p)) return json(route, CAMPAIGN_DETAIL);
    if (p.endsWith('/messaging/providers')) {
      return json(route, { self_service_enabled: true, providers: [{
        name: 'textsms', label: 'TextSMS Kenya', sender_id_hint: '', docs_url: '',
        countries: ['KE'], fields: [
          { key: 'api_key', label: 'API key', secret: true, required: true, default: '', help: '' },
          { key: 'partner_id', label: 'Partner ID', secret: false, required: true, default: '', help: '' },
          { key: 'base_url', label: 'API base URL', secret: false, required: true, default: 'https://sms.textsms.co.ke', help: '' },
        ] }] });
    }
    if (p.endsWith('/messaging/provider-accounts')) {
      return json(route, {
        self_service_enabled: true,
        effective: { source: 'reseller', provider: 'textsms', sender_id: 'Techmid', account_id: 1 },
        accounts: [{
          id: 1, user_id: 597, provider: 'textsms', provider_label: 'TextSMS Kenya',
          label: 'TextSMS Kenya gateway', sender_id: 'Techmid', is_default: true, is_active: true,
          credentials: { api_key: '••••1a2b', partner_id: '1234', base_url: 'https://sms.textsms.co.ke' },
          config_problems: [], last_test_at: STATUS.gateway.last_test_at, last_test_ok: true,
          last_test_error: null,
        }],
      });
    }
    if (p.endsWith('/messaging/inbox')) return json(route, { unread: 0, messages: [] });
    if (p.endsWith('/messaging/templates')) return json(route, { templates: [] });
    if (p.endsWith('/messaging/recipients')) {
      return json(route, { count: 1, has_more: false, recipients: [
        { customer_id: 1, name: 'Brian Kemboi', phone: '254712345678' }] });
    }
    if (p.endsWith('/plans')) return json(route, []);
    return json(route, {});
  });
}

const DIR = 'e2e/screens/gateway';

for (const viewport of [{ name: 'mobile', width: 390, height: 844 },
                        { name: 'desktop', width: 1280, height: 900 }]) {
  test(`own gateway failing — reason, fix and balance are shown (${viewport.name})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(`
      localStorage.removeItem('demo_mode');
      localStorage.setItem('auth_token','test-reseller-token');
      localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(RESELLER))});
    `);
    await stubApi(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/messaging');

    // Banner on every tab, naming the reason and the fix.
    const banner = page.getByRole('alert').filter({ hasText: 'SMS not sending' });
    await expect(banner).toContainText('Gateway rejected your login');
    await expect(banner).toContainText('How to fix: Copy the current API key');
    // The header chip no longer reads "0 credits" (Header shows actions on desktop only).
    if (viewport.name === 'desktop') {
      await expect(page.getByRole('button', { name: /Not sending/ })).toBeVisible();
    }
    await page.screenshot({ path: `${DIR}/${viewport.name}-1-banner.png`, fullPage: true });

    // Gateway tab: health, live balance check result, counts, reasons.
    await banner.getByRole('button', { name: 'See details' }).click();
    const card = page.getByRole('region', { name: 'SMS gateway status' });
    await expect(card).toContainText('Messages are not sending');
    await expect(card).toContainText('TextSMS Kenya balance');
    await expect(card).toContainText('Why messages failed (last 30 days)');
    await expect(card).toContainText('153 failed');
    await expect(card).toContainText('No space left on device');
    await page.screenshot({ path: `${DIR}/${viewport.name}-2-gateway.png`, fullPage: true });

    // Credits tab explains the zero and shows the same status.
    await page.getByRole('tab', { name: 'Credits' }).click();
    await expect(page.getByText('You send on your own gateway')).toBeVisible();
    await expect(page.getByRole('region', { name: 'SMS gateway status' })).toBeVisible();
    await page.screenshot({ path: `${DIR}/${viewport.name}-3-credits.png`, fullPage: true });

    // Campaign detail: per-message reason instead of a bare vendor string.
    await page.getByRole('tab', { name: 'Activity' }).click();
    await page.getByText('Your internet package has expired').first().click();
    await expect(page.getByText('How to fix:').last()).toBeVisible();
    await expect(page.getByText('Gateway rejected your login').last()).toBeVisible();
    await page.screenshot({ path: `${DIR}/${viewport.name}-4-campaign.png`, fullPage: true });
  });
}
