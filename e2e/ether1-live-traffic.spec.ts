import { expect, test } from '@playwright/test';

const demoUser = {
  id: 0,
  email: 'demo@bitwave.co.ke',
  role: 'reseller',
  organization_name: 'Demo ISP Network',
  subscription_status: 'trial',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((user) => {
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('auth_token', 'demo-token');
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, demoUser);
});

test('shows only the stored router report when Ether1 is selected', async ({ page }) => {
  let liveSamplingRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/uplink-traffic')) liveSamplingRequests += 1;
  });
  await page.goto('/dashboard');

  const panel = page.getByLabel('Ether1 traffic');
  await expect(page.getByRole('button', { name: /ether1.*uplink/i })).toBeVisible({ timeout: 15_000 });
  await expect(panel).toBeHidden();
  await page.getByRole('button', { name: /ether1.*uplink/i }).click();
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await expect(panel.getByText('Ether1 internet traffic')).toBeVisible();
  await expect(panel.getByText(/Latest report/)).toBeVisible();
  await expect(page.getByTestId('ether1-incoming-rate')).toHaveText('45.2 Mbps');
  await expect(page.getByTestId('ether1-outgoing-rate')).toHaveText('12.8 Mbps');
  await expect(panel.getByText(/does not poll the router/i)).toBeVisible();
  await expect(panel.getByRole('button')).toHaveCount(0);

  await page.getByRole('button', { name: 'Usage', exact: true }).click();
  await expect(panel).toBeHidden();
  await page.getByRole('button', { name: 'Ports', exact: true }).click();
  await expect(page.getByTestId('ether1-incoming-rate')).toHaveText('45.2 Mbps');
  expect(liveSamplingRequests).toBe(0);
});

test('fits the reported Ether1 reading on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/dashboard');

  await expect(page.getByRole('button', { name: /ether1.*uplink/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /ether1.*uplink/i }).click();
  await expect(page.getByLabel('Ether1 traffic')).toBeVisible({ timeout: 15_000 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
