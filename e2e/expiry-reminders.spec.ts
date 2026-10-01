import { expect, test, type Page, type Route } from '@playwright/test';

const RESELLER = {
  id: 7,
  email: 'reseller@bitwave.test',
  role: 'reseller',
  organization_name: 'FastNet ISP',
  subscription_status: 'active',
};

const CREDITS = {
  balance: 22,
  total_purchased: 30,
  total_spent: 8,
  price_per_sms_kes: 1,
  min_purchase_credits: 10,
  bundles: [],
  enabled: true,
};

function json(route: Route, body: unknown) {
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
}

async function authenticate(page: Page) {
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token', 'test-reseller-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(RESELLER))});
  `);
}

test('reseller configures customer expiry reminders on mobile', async ({ page }) => {
  let savedPayload: Record<string, unknown> | null = null;

  await authenticate(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.endsWith('/messaging/credits')) return json(route, CREDITS);
    if (path.endsWith('/messaging/inbox')) return json(route, { unread: 0, messages: [] });
    if (path.endsWith('/messaging/recipients')) {
      return json(route, { count: 0, recipients: [], has_more: false });
    }
    if (path.endsWith('/messaging/templates')) return json(route, { templates: [] });
    if (path.endsWith('/plans')) return json(route, []);
    if (path.endsWith('/messaging/expiry-settings')) {
      if (route.request().method() === 'PUT') {
        savedPayload = route.request().postDataJSON();
        return json(route, savedPayload);
      }
      return json(route, {
        enabled: false,
        reminder_offsets_minutes: [1440],
        send_at_expiry: true,
      });
    }
    return json(route, {});
  });

  await page.goto('/messaging');
  await page.getByRole('tab', { name: 'Automatic' }).click();

  await expect(page.getByRole('heading', { name: 'Automatic expiry messages' })).toBeVisible();
  const masterToggle = page.getByRole('switch', { name: 'Automatic expiry messages' });
  await expect(masterToggle).toHaveAttribute('aria-checked', 'false');
  await masterToggle.click();

  await page.getByRole('button', { name: '2 days' }).click();
  await page.getByRole('button', { name: '7 days' }).click();
  await expect(page.getByText('3/5')).toBeVisible();
  await expect(page.getByText('4 automatic messages per customer expiry')).toBeVisible();

  await page.getByRole('switch', { name: 'Message customers at expiry' }).click();
  await expect(page.getByText('3 automatic messages per customer expiry')).toBeVisible();
  await page.getByRole('button', { name: 'Save settings' }).click();

  await expect.poll(() => savedPayload).toEqual({
    enabled: true,
    reminder_offsets_minutes: [10080, 2880, 1440],
    send_at_expiry: false,
  });
  await expect(page.getByText('You have unsaved changes.')).toBeHidden();
});

const CUSTOMER_EVENTS = {
  payment_receipt_enabled: false,
  receipt_include_hotspot: false,
  welcome_enabled: false,
  templates: { payment_receipt: null, welcome: null, reminder: null, expiry: null },
  defaults: {
    payment_receipt: 'Payment of {amount} received. Your {plan} is active until {expiry}. Ref {reference}. - {brand}',
    welcome: 'Welcome to {brand}! Your internet login: Username {username}, Password {password}.',
    reminder: 'Reminder: Your internet expires soon. - {brand}',
    expiry: 'Your internet has expired. - {brand}',
  },
  placeholders: {
    payment_receipt: ['name', 'brand', 'plan', 'expiry', 'amount', 'reference'],
    welcome: ['name', 'brand', 'username', 'password'],
    reminder: ['name', 'brand', 'expiry'],
    expiry: ['name', 'brand'],
  },
  max_length: 480,
};

test('reseller turns on payment receipts and rewrites the receipt', async ({ page }) => {
  let savedPayload: Record<string, unknown> | null = null;

  await authenticate(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path.endsWith('/messaging/credits')) return json(route, CREDITS);
    if (path.endsWith('/messaging/inbox')) return json(route, { unread: 0, messages: [] });
    if (path.endsWith('/messaging/recipients')) {
      return json(route, { count: 0, recipients: [], has_more: false });
    }
    if (path.endsWith('/messaging/templates')) return json(route, { templates: [] });
    if (path.endsWith('/plans')) return json(route, []);
    if (path.endsWith('/messaging/expiry-settings')) {
      return json(route, { enabled: false, reminder_offsets_minutes: [1440], send_at_expiry: true });
    }
    if (path.endsWith('/messaging/customer-events/preview')) {
      const { body } = route.request().postDataJSON() as { body: string | null };
      const text = (body ?? 'Payment of KES 1,500 received.').replace('{amount}', 'KES 1,500').replace('{name}', 'Jane');
      return json(route, { text, characters: text.length, segments: 1 });
    }
    if (path.endsWith('/messaging/customer-events')) {
      if (route.request().method() === 'PUT') {
        savedPayload = route.request().postDataJSON();
        return json(route, { ...CUSTOMER_EVENTS, ...savedPayload });
      }
      return json(route, CUSTOMER_EVENTS);
    }
    return json(route, {});
  });

  await page.goto('/messaging');
  await page.getByRole('tab', { name: 'Automatic' }).click();

  const receipts = page.getByRole('switch', { name: 'Payment receipts' });
  await expect(receipts).toHaveAttribute('aria-checked', 'false');
  await receipts.click();

  await page.getByRole('button', { name: 'Edit Payment receipt message' }).click();
  const textarea = page.getByLabel('Payment receipt message text');
  await textarea.fill('Asante {name}! We got ');
  await page.getByRole('button', { name: '{amount}' }).click();
  await expect(textarea).toHaveValue('Asante {name}! We got {amount}');
  await expect(page.getByText('Asante Jane! We got KES 1,500')).toBeVisible();

  await textarea.fill('Paid {password}');
  await expect(page.getByRole('alert').filter({ hasText: '{password}' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save customer messages' })).toBeDisabled();

  await textarea.fill('Asante {name}! We got {amount}');
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Save customer messages' }).click();

  await expect.poll(() => savedPayload).toEqual({
    payment_receipt_enabled: true,
    receipt_include_hotspot: false,
    welcome_enabled: false,
    templates: {
      payment_receipt: 'Asante {name}! We got {amount}',
      welcome: null,
      reminder: null,
      expiry: null,
    },
  });
});
