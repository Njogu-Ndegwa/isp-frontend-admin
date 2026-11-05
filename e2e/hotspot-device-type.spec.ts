import { expect, test, type Page, type Route } from '@playwright/test';

// The Devices panel on a customer page: a device added from here carries the
// type the reseller picked (a paired TV stays first on a smaller plan), and a
// type saved wrongly can be corrected, at phone width too.

const RESELLER = {
  id: 7,
  email: 'reseller@bitwave.test',
  role: 'reseller',
  organization_name: 'FastNet ISP',
  subscription_status: 'active',
};

const CUSTOMER = {
  id: 41,
  name: 'Wanjiru Kamau',
  phone: '254712345678',
  mac_address: 'AA:BB:CC:00:20:01',
  status: 'active',
  expiry: '2099-01-01T00:00:00',
  plan_id: 3,
  router_id: 5,
  created_at: '2026-10-01T08:00:00',
  plan: { id: 3, name: 'Family', price: 1500, connection_type: 'hotspot', speed: '10M/10M' },
  router: { id: 5, name: 'Main' },
};

function device(pairingId: number | null, mac: string, name: string, type: string) {
  return {
    pairing_id: pairingId,
    is_main_device: pairingId === null,
    device_mac: mac,
    device_name: name,
    device_type: type,
    added_at: pairingId === null ? null : '2026-11-01T08:00:00',
    customer_id: pairingId,
    period_usage_mb: 120.5,
    live: null,
  };
}

function devicesResponse(extra: ReturnType<typeof device>[] = []) {
  return {
    owner_customer_id: CUSTOMER.id,
    owner_name: CUSTOMER.name,
    router_id: 5,
    plan_name: 'Family',
    plan_max_devices: 4,
    max_devices_override: null,
    max_devices: 4,
    subscription_active: true,
    expiry: CUSTOMER.expiry,
    pooled_usage_mb: 500,
    live_source: null,
    live_error: null,
    devices: [
      device(null, CUSTOMER.mac_address, 'Main device', 'other'),
      device(900, 'AA:BB:CC:00:20:02', 'Living room TV', 'other'),
      ...extra,
    ],
  };
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

type Recorded = { added: Record<string, unknown>[]; patched: Record<string, unknown>[] };

async function openPanel(page: Page, options: { failPatch?: boolean; language?: string } = {}) {
  const recorded: Recorded = { added: [], patched: [] };
  const user = { ...RESELLER, preferred_language: options.language };
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token', 'test-reseller-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(user))});
  `);
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith(`/customers/${CUSTOMER.id}/devices/900`) && request.method() === 'PATCH') {
      recorded.patched.push(request.postDataJSON());
      if (options.failPatch) return json(route, { detail: 'Shared device not found for this subscription' }, 404);
      return json(route, { success: true, pairing_id: 900, device_type: request.postDataJSON().device_type });
    }
    if (path.endsWith(`/customers/${CUSTOMER.id}/devices`)) {
      if (request.method() === 'POST') {
        recorded.added.push(request.postDataJSON());
        return json(route, { success: true, message: 'Device added.', device_mac: request.postDataJSON().mac_address });
      }
      const added = recorded.added.map((body, i) =>
        device(901 + i, String(body.mac_address), String(body.device_name ?? 'Device'), String(body.device_type)));
      return json(route, devicesResponse(added));
    }
    if (path.endsWith(`/customers/${CUSTOMER.id}/usage`)) {
      return json(route, { customer_id: CUSTOMER.id, connection_type: 'hotspot', plan_name: 'Family', plan_data_cap_mb: null, period: null, live: null });
    }
    if (path.endsWith('/usage/timeline')) {
      return json(route, { points: [], total_mb: 0, window_start: '2026-10-01', window_end: '2026-10-13', granularity: 'day' });
    }
    if (path.endsWith('/usage/history') || path.endsWith('/payments') || path.endsWith('/mpesa/transactions')) return json(route, []);
    if (path.endsWith('/payment-summary')) return route.fulfill({ status: 404, body: '{}' });
    if (path.endsWith('/messaging/inbox')) return json(route, { unread: 0, messages: [] });
    if (path.endsWith('/customers') || path.endsWith('/customers/active')) return json(route, [CUSTOMER]);
    if (path.endsWith('/plans') || path.endsWith('/routers') || path.includes('/payment-methods')) return json(route, []);
    return json(route, {});
  });
  await page.goto(`/customers/${CUSTOMER.id}`);
  await expect(page.getByTestId('hotspot-devices')).toBeVisible({ timeout: 45_000 });
  return { recorded, panel: page.getByTestId('hotspot-devices') };
}

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test('a device added from the panel is sent with the type picked', async ({ page }) => {
  const { recorded, panel } = await openPanel(page);

  await panel.getByRole('button', { name: '+ Add device' }).click();
  await panel.getByPlaceholder(/MAC address/).fill('AA:BB:CC:00:20:09');
  await panel.getByRole('button', { name: 'TV', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'TV', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await panel.getByRole('button', { name: 'Add device', exact: true }).click();

  await expect.poll(() => recorded.added.length).toBe(1);
  expect(recorded.added[0]).toMatchObject({ mac_address: 'AA:BB:CC:00:20:09', device_type: 'tv' });
});

test('the type starts on Other and is sent as other if left alone', async ({ page }) => {
  const { recorded, panel } = await openPanel(page);

  await panel.getByRole('button', { name: '+ Add device' }).click();
  await expect(panel.getByRole('button', { name: 'Other', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await panel.getByPlaceholder(/MAC address/).fill('AA:BB:CC:00:20:09');
  await panel.getByRole('button', { name: 'Add device', exact: true }).click();

  await expect.poll(() => recorded.added.length).toBe(1);
  expect(recorded.added[0].device_type).toBe('other');
});

test('a saved type can be corrected, and the main device has no type to change', async ({ page }) => {
  const { recorded, panel } = await openPanel(page);

  const selects = panel.getByRole('combobox');
  await expect(selects).toHaveCount(1);
  const select = panel.getByRole('combobox', { name: 'Device type for Living room TV' });
  await expect(select).toHaveValue('other');

  await select.selectOption('tv');

  await expect.poll(() => recorded.patched.length).toBe(1);
  expect(recorded.patched[0]).toEqual({ device_type: 'tv' });
  await expect(select).toHaveValue('tv');
  await expect(page.getByText('Device type saved')).toBeVisible();
});

test('a failed correction shows the error and keeps the saved type', async ({ page }) => {
  const { panel } = await openPanel(page, { failPatch: true });

  const select = panel.getByRole('combobox', { name: 'Device type for Living room TV' });
  await select.selectOption('tv');

  await expect(page.getByText('Shared device not found for this subscription')).toBeVisible();
  await expect(select).toHaveValue('other');
  await expect(select).toBeEnabled();
});

test('the new labels follow the reseller language', async ({ page }) => {
  const { panel } = await openPanel(page, { language: 'fr' });

  await panel.getByRole('button', { name: '+ Add device' }).click();
  await expect(panel.getByText("Type d'appareil", { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Appareil connecté' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Autre' })).toBeVisible();
});

for (const width of [320, 375]) {
  test(`the panel fits a ${width}px phone`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    const { panel } = await openPanel(page);

    await expectNoSidewaysScroll(page);
    const select = panel.getByRole('combobox', { name: 'Device type for Living room TV' });
    await select.scrollIntoViewIfNeeded();
    const remove = panel.getByRole('button', { name: 'Remove' });
    const [selectBox, removeBox] = [await select.boundingBox(), await remove.boundingBox()];
    expect(selectBox && removeBox && selectBox.x + selectBox.width <= removeBox.x).toBeTruthy();
    expect(selectBox!.height).toBeGreaterThanOrEqual(32);

    await panel.getByRole('button', { name: '+ Add device' }).click();
    await expectNoSidewaysScroll(page);
    for (const label of ['TV', 'Console', 'Laptop', 'Smart device', 'Other']) {
      const chip = panel.getByRole('button', { name: label, exact: true });
      await expect(chip).toBeVisible();
      const box = await chip.boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.height).toBeGreaterThanOrEqual(36);
    }

    await panel.screenshot({ path: `test-results/hotspot-device-type-${width}.png` });
  });
}
