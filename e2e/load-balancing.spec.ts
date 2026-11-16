import { expect, test, type Route } from '@playwright/test';

const OWNER = { id: 30, email: 'owner@example.test', role: 'reseller', organization_name: 'Test ISP', subscription_status: 'active' };
const PORTS = ['ether1', 'ether4'];
const ROUTER = { id: 22, name: 'Test router', identity: 'Router-22', status: 'online', is_online: true };
const APPLIED_AT = '2026-11-16T13:00:00Z';
const json = (route: Route, body: unknown) => route.fulfill({ contentType: 'application/json', json: body });

test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

test('save an unplugged WAN and finish the same setup later without taking over a customer port', async ({ page }) => {
  let enabled = false;
  let linked = false;
  let hasCustomers = false;
  const writes: { wan_ports: string[]; confirm: boolean }[] = [];
  await page.context().addCookies([
    { name: 'auth_token', value: 'test-token', domain: 'localhost', path: '/' },
    { name: 'auth_user', value: encodeURIComponent(JSON.stringify(OWNER)), domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript((user) => {
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, OWNER);
  await page.route('**/_vercel/**', (route) => route.fulfill({ body: '' }));
  await page.route('**/api/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const config = enabled ? { wan_ports: PORTS, applied_at: APPLIED_AT } : null;
    if (path === '/api/routers') return json(route, [{ ...ROUTER, lb_enabled: enabled, lb_config: config }]);
    if (path.endsWith('/routers/22/interfaces')) return json(route, { interfaces: PORTS.map((name) => ({ name, type: 'ether', running: name === 'ether1' || linked })) });
    if (path.endsWith('/routers/22/load-balancing')) return json(route, { success: true, enabled, config });
    if (path.endsWith('/load-balancing/preflight')) return json(route, {
      success: !hasCustomers,
      wan_ports: req.postDataJSON().wan_ports,
      blockers: hasCustomers ? ['ether4 serves customers'] : [],
      warnings: [],
      preflight: { per_port: { ether1: { link: 'true' }, ether4: { link: String(linked) } } },
    });
    if (path.endsWith('/load-balancing/enable')) {
      writes.push(req.postDataJSON());
      enabled = true;
      return json(route, { success: true, enabled, wan_ports: PORTS, applied_at: APPLIED_AT,
        converted_ports: linked ? ['ether4'] : [], dormant_ports: linked ? [] : ['ether4'] });
    }
    return json(route, {});
  });

  await page.goto('/routers');
  const open = page.getByRole('button', { name: 'Load balancing for Test router', exact: true }).filter({ visible: true });
  const sheet = page.getByRole('dialog', { name: 'Load balancing' });
  await open.click();
  await sheet.getByRole('checkbox', { name: /ether4/ }).check();
  const check = sheet.getByRole('button', { name: 'Run pre-check' });
  await check.click();
  const noCable = sheet.getByText(/ether4: no cable detected/);
  await noCable.scrollIntoViewIfNeeded();
  await expect(noCable).toBeInViewport();
  await sheet.getByRole('button', { name: 'Save setup' }).click();
  const configured = sheet.getByText('Load balancing is configured');
  await configured.scrollIntoViewIfNeeded();
  await expect(configured).toBeInViewport();
  const waiting = sheet.getByText(/Still waiting for ether4/);
  await waiting.scrollIntoViewIfNeeded();
  await expect(waiting).toBeInViewport();
  expect(writes).toEqual([{ wan_ports: PORTS, confirm: true }]);

  await page.reload();
  await open.click();
  await sheet.getByRole('button', { name: 'Finish setup' }).click();
  const activate = sheet.getByRole('button', { name: 'Activate connected lines' });
  await expect(activate).toBeDisabled();
  await check.click();
  await noCable.scrollIntoViewIfNeeded();
  await expect(noCable).toBeInViewport();
  await expect(activate).toBeDisabled();

  linked = hasCustomers = true;
  await check.click();
  const blocker = sheet.getByText('ether4 serves customers', { exact: true });
  await blocker.scrollIntoViewIfNeeded();
  await expect(blocker).toBeInViewport();
  await expect(activate).toBeDisabled();
  expect(writes).toHaveLength(1);

  hasCustomers = false;
  await check.click();
  await expect(activate).toBeEnabled();
  await activate.click();
  await expect(sheet.getByRole('button', { name: 'Verify now' })).toBeVisible();
  await expect(sheet.getByText(/Still waiting for ether4/)).toHaveCount(0);
  expect(writes).toEqual([{ wan_ports: PORTS, confirm: true }, { wan_ports: PORTS, confirm: true }]);

  await sheet.getByRole('button', { name: 'Disable', exact: true }).click();
  const confirmation = page.getByRole('alertdialog', { name: 'Disable load balancing?' });
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toHaveCount(0);
});
