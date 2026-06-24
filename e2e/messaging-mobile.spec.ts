import { test, type Page, type Route } from '@playwright/test';

/**
 * Mobile (390x844) verification of the rebuilt reseller messaging feature.
 * All backend calls are stubbed via page.route('**\/api/**') so nothing real
 * is touched (the glob intercepts even the production default base URL). Auth
 * is injected into localStorage (non-demo reseller) — AuthContext trusts
 * localStorage and makes no validation call.
 *
 * This is a verification spec: it captures screenshots at each step into
 * e2e/screens/mobile/ and is resilient (a missed locator screenshots and
 * continues) so one run yields maximum visual coverage.
 */

const RESELLER = {
  id: 7, email: 'reseller@bitwave.test', role: 'reseller',
  organization_name: 'FastNet ISP', subscription_status: 'active',
};

const CUSTOMERS = [
  { customer_id: 1, name: 'James Mwangi', phone: '+254712345678' },
  { customer_id: 2, name: 'Aisha Noor', phone: '+254720998112' },
  { customer_id: 3, name: 'Peter Otieno', phone: '+254733221009' },
  { customer_id: 4, name: 'Grace Wanjiru', phone: '+254701556234' },
  { customer_id: 5, name: 'David Kamau', phone: '+254711220905' },
  { customer_id: 6, name: 'Mary Otiendo', phone: '+254715009776' },
];

const CREDITS = {
  balance: 1240, total_purchased: 5000, total_spent: 3760,
  price_per_sms_kes: 1.0, min_purchase_credits: 10,
  bundles: [{ credits: 500, label: 'Starter' }, { credits: 2000, label: 'Value' }],
  enabled: true,
};

const PLANS = [
  { id: 1, name: 'Home 10Mbps' }, { id: 2, name: 'Biz 20Mbps' },
];

const CAMPAIGNS = [
  { id: 200, body: 'Hi {name}, your internet plan expires soon. Dial *123# to renew.', recipient_count: 2, segments_per_message: 1, total_credits: 2, sent_count: 1, failed_count: 0, refunded_credits: 0, status: 'sending', created_at: '2026-06-24T00:10:00Z' },
  { id: 201, body: 'Scheduled maintenance tonight 11pm-1am. Brief downtime expected.', recipient_count: 232, segments_per_message: 1, total_credits: 232, sent_count: 220, failed_count: 12, refunded_credits: 12, status: 'partial', created_at: '2026-06-24T06:14:00Z' },
  { id: 202, body: 'Promo: upgrade to 20Mbps this week and get 1GB free hotspot data.', recipient_count: 540, segments_per_message: 1, total_credits: 540, sent_count: 540, failed_count: 0, refunded_credits: 0, status: 'completed', created_at: '2026-06-23T17:40:00Z' },
];

const CAMPAIGN_DETAIL: Record<string, unknown> = {
  '201': {
    id: 201, status: 'partial',
    counts: { total: 232, sent: 220, failed: 12, queued: 0, delivered: 0 },
    messages: [
      { phone: '+254718442100', name: 'Brian Kemboi', status: 'failed', error: 'Invalid number' },
      { phone: '+254705119873', name: 'Lucy Achieng', status: 'failed', error: 'Undelivered · network' },
      { phone: '+254712345678', name: 'James Mwangi', status: 'sent', error: null },
      { phone: '+254720998112', name: 'Aisha Noor', status: 'sent', error: null },
    ],
  },
};

const LEDGER = {
  transactions: [
    { id: 5, kind: 'send_debit', change: -248, balance_after: 1240, reference: 'campaign:182', note: null, created_at: '2026-06-24T00:11:00Z' },
    { id: 4, kind: 'refund', change: 12, balance_after: 1488, reference: 'campaign:201', note: 'failed recipients', created_at: '2026-06-24T06:20:00Z' },
    { id: 3, kind: 'send_debit', change: -232, balance_after: 1476, reference: 'campaign:201', note: null, created_at: '2026-06-24T06:14:00Z' },
    { id: 2, kind: 'purchase', change: 2000, balance_after: 1708, reference: 'SMS-12', note: null, created_at: '2026-06-22T09:00:00Z' },
    { id: 1, kind: 'admin_adjustment', change: 50, balance_after: 50, reference: null, note: 'goodwill credit', created_at: '2026-06-20T09:00:00Z' },
  ],
};

function json(route: Route, body: unknown) {
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
}

async function stubApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    const method = route.request().method();

    if (p.endsWith('/messaging/credits/ledger')) return json(route, LEDGER);
    if (p.endsWith('/messaging/credits')) return json(route, CREDITS);
    if (p.endsWith('/messaging/recipients')) {
      const search = (url.searchParams.get('search') || '').toLowerCase().trim();
      const filtered = search
        ? CUSTOMERS.filter((c) => c.name.toLowerCase().includes(search) || c.phone.includes(search))
        : CUSTOMERS;
      return json(route, { count: filtered.length, recipients: filtered, has_more: false });
    }
    if (p.endsWith('/messaging/templates')) return json(route, { templates: [{ id: 1, name: 'Renewal reminder', body: 'Hi {name}, please renew your plan.' }] });
    if (p.endsWith('/messaging/send') && method === 'POST') {
      return json(route, { message: 'Send queued', campaign_id: 182, recipient_count: 2, segments: 1, credits_reserved: 2 });
    }
    if (p.endsWith('/messaging/campaigns')) return json(route, { campaigns: CAMPAIGNS });
    const camp = p.match(/\/messaging\/campaigns\/(\d+)$/);
    if (camp) {
      const detail = CAMPAIGN_DETAIL[camp[1]] ?? {
        id: Number(camp[1]), status: 'sending',
        counts: { total: 2, sent: 1, failed: 0, queued: 1, delivered: 0 },
        messages: [
          { phone: '+254733221009', name: 'Peter Otieno', status: 'sent', error: null },
          { phone: '+254715009776', name: 'Mary Otiendo', status: 'queued', error: null },
        ],
      };
      return json(route, detail);
    }
    if (p.endsWith('/messaging/inbox')) return json(route, { unread: 0, messages: [] });
    if (p.endsWith('/plans')) return json(route, PLANS);
    return json(route, {});
  });
}

const DIR = 'e2e/screens/mobile';

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${DIR}/${name}.png` });
}

async function step(page: Page, name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    console.log(`STEP FAILED: ${name} -> ${(e as Error).message.split('\n')[0]}`);
    await shot(page, `${name}-FAILED`);
  }
}

test('reseller messaging — mobile walkthrough', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token','test-reseller-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(RESELLER))});
  `);
  await stubApi(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/messaging', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('main', { state: 'attached', timeout: 30_000 }).catch(() => {});
  await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;}' }).catch(() => {});
  await page.getByText('Recipients').first().waitFor({ timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, '01-compose-initial');

  await step(page, '02-specific-mode', async () => {
    await page.getByRole('button', { name: 'Specific people' }).click();
    await page.waitForTimeout(400);
    await shot(page, '02-specific-mode');
  });

  await step(page, '03-open-sheet', async () => {
    await page.getByRole('button', { name: /Pick people|Edit recipients/ }).click();
    await page.getByText('Select recipients').waitFor({ timeout: 8000 });
    await page.waitForTimeout(400);
    const diag = await page.evaluate(() => {
      const h = Array.from(document.querySelectorAll('h3')).find((e) => e.textContent?.includes('Select recipients'));
      if (!h) return { found: false };
      let el: HTMLElement | null = h as HTMLElement;
      let fixed: HTMLElement | null = null;
      while (el) { if (getComputedStyle(el).position === 'fixed') { fixed = el; break; } el = el.parentElement; }
      const r = fixed?.getBoundingClientRect();
      const transformed: string[] = [];
      let p: HTMLElement | null = h as HTMLElement;
      while (p) {
        const cs = getComputedStyle(p);
        if (cs.transform !== 'none' || cs.filter !== 'none' || cs.perspective !== 'none' || cs.contain.includes('paint') || cs.contain.includes('layout')) {
          transformed.push(`${p.tagName}.${(typeof p.className === 'string' ? p.className : '').slice(0, 30)} t=${cs.transform} f=${cs.filter} c=${cs.contain}`);
        }
        p = p.parentElement;
      }
      return { found: true, vw: window.innerWidth, vh: window.innerHeight, rect: r && { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, transformed };
    });
    console.log('SHEET DIAG', JSON.stringify(diag));
    await shot(page, '03-picker-sheet');
  });

  await step(page, '04-search', async () => {
    await page.getByPlaceholder('Search name or phone…').fill('otie');
    await page.getByText('Peter Otieno').waitFor({ timeout: 8000 });
    await page.waitForTimeout(400);
    await shot(page, '04-search-otie');
  });

  await step(page, '05-tick', async () => {
    await page.getByText('Peter Otieno').click();
    await page.getByText('Mary Otiendo').click();
    await page.waitForTimeout(300);
    await shot(page, '05-two-ticked');
  });

  await step(page, '06-done', async () => {
    await page.getByRole('button', { name: /Done/ }).click();
    await page.waitForTimeout(400);
    await shot(page, '06-compose-with-chips');
  });

  await step(page, '07-type', async () => {
    await page.getByPlaceholder('Type your message here…').fill('Hi {name}, your plan expires soon. Dial *123# to renew. — FastNet');
    await page.waitForTimeout(400);
    await shot(page, '07-compose-filled');
  });

  await step(page, '08-send', async () => {
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await page.waitForTimeout(1200);
    await shot(page, '08-after-send-activity');
  });

  await step(page, '09-activity', async () => {
    await page.getByRole('tab', { name: 'Activity' }).click();
    await page.waitForTimeout(800);
    await shot(page, '09-activity-list');
  });

  await step(page, '10-detail', async () => {
    await page.getByText(/Scheduled maintenance/).click();
    await page.waitForTimeout(800);
    await shot(page, '10-campaign-detail');
    // try the Failed filter tab inside the detail sheet
    await page.getByText(/Failed/).first().click().catch(() => {});
    await page.waitForTimeout(400);
    await shot(page, '11-detail-failed-filter');
    await page.keyboard.press('Escape').catch(() => {});
  });

  await step(page, '12-credits', async () => {
    await page.getByRole('tab', { name: 'Credits' }).click();
    await page.waitForTimeout(800);
    await shot(page, '12-credits-ledger');
  });

  await step(page, '13-templates', async () => {
    await page.getByRole('tab', { name: 'Templates' }).click();
    await page.waitForTimeout(600);
    await shot(page, '13-templates');
  });
});
