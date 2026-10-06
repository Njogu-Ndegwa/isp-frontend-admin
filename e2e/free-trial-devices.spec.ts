import { expect, test, type Page, type Route } from '@playwright/test';

// Free-trial plans can cover several devices, like any hotspot plan: the
// device count stays editable when "Free Trial" is picked and is sent as typed.

const RESELLER = {
  id: 7,
  email: 'reseller@bitwave.test',
  role: 'reseller',
  organization_name: 'FastNet ISP',
  subscription_status: 'active',
};

const TRIAL = {
  id: 12,
  name: 'Free Taste',
  speed: '2M/2M',
  price: 0,
  duration_value: 30,
  duration_unit: 'MINUTES',
  connection_type: 'hotspot',
  plan_type: 'free_trial',
  is_hidden: false,
  max_shared_users: 3,
  trial_once_per_customer: true,
  router_ids: null,
  user_id: 7,
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

test('a free-trial plan can be created for several devices', async ({ page }) => {
  let created: Record<string, unknown> | null = null;

  await authenticate(page);
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/plans/create')) {
      created = route.request().postDataJSON();
      return json(route, { ...TRIAL, ...created });
    }
    if (path.endsWith('/routers')) return json(route, []);
    if (path.endsWith('/plans')) return json(route, []);
    return json(route, {});
  });

  await page.goto('/plans/create');
  await page.locator('#name').fill('Free Taste');
  await page.locator('#speed').fill('2M/2M');
  await page.locator('#duration_value').fill('30');
  await page.locator('#duration_unit').selectOption('MINUTES');
  await page.locator('#plan_type').selectOption('free_trial');

  const devices = page.locator('#max_shared_users');
  await expect(devices).toBeEnabled();
  await expect(page.getByText('Devices one claimed trial covers.')).toBeVisible();
  await devices.fill('3');
  await devices.blur();

  await page.getByRole('button', { name: /Create Plan/ }).click();

  await expect.poll(() => created).not.toBeNull();
  expect(created).toMatchObject({
    plan_type: 'free_trial',
    price: 0,
    connection_type: 'hotspot',
    max_shared_users: 3,
  });
});

test('the plans list shows how many devices a trial covers', async ({ page }) => {
  await authenticate(page);
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/plans')) return json(route, [TRIAL]);
    if (path.endsWith('/routers')) return json(route, []);
    return json(route, {});
  });

  await page.goto('/plans');
  await expect(page.getByText('Free Taste').first()).toBeVisible();
  await expect(page.getByText('3 devices').first()).toBeVisible();
});

test('editing a trial keeps its device count editable', async ({ page }) => {
  let updated: Record<string, unknown> | null = null;

  await authenticate(page);
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path.endsWith(`/plans/${TRIAL.id}`) && req.method() === 'PUT') {
      updated = req.postDataJSON();
      return json(route, { ...TRIAL, ...updated });
    }
    if (path.endsWith('/plans')) return json(route, [TRIAL]);
    if (path.endsWith('/routers')) return json(route, []);
    return json(route, {});
  });

  await page.goto('/plans');
  await page.getByTitle('Edit plan').first().click();

  const devices = page.locator('#edit-plan-form input[type="number"][max="50"]');
  await expect(devices).toBeEnabled();
  await expect(devices).toHaveValue('3');
  await devices.fill('5');
  await devices.blur();
  await page.getByRole('button', { name: 'Save Changes' }).click();

  await expect.poll(() => updated).not.toBeNull();
  expect(updated).toMatchObject({ plan_type: 'free_trial', price: 0, max_shared_users: 5 });
});
