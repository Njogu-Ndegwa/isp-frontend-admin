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

test('shows the instantaneous Ether1 incoming rate in the Ports section', async ({ page }) => {
  await page.goto('/dashboard');

  const panel = page.getByLabel('Live Ether1 traffic');
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await expect(panel.getByText('Ether1 internet right now')).toBeVisible();
  await expect(page.getByTestId('ether1-incoming-rate')).toHaveText('18.6 Mbps');
  await expect(page.getByTestId('ether1-outgoing-rate')).toHaveText('3.2 Mbps');
  await expect(panel.getByText(/refreshed every 5 seconds/i)).toBeVisible();

  await page.getByRole('button', { name: 'Usage', exact: true }).click();
  await expect(panel).toBeHidden();
  await page.getByRole('button', { name: 'Ports', exact: true }).click();
  await expect(page.getByTestId('ether1-incoming-rate')).toHaveText('18.6 Mbps');
});

test('fits the live Ether1 reading on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/dashboard');

  await expect(page.getByLabel('Live Ether1 traffic')).toBeVisible({ timeout: 15_000 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
