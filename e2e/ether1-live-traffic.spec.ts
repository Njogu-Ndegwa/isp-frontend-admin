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

test('uses the stored router report by default and samples live only on request', async ({ page }) => {
  await page.goto('/dashboard');

  const panel = page.getByLabel('Live Ether1 traffic');
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await expect(panel.getByText('Ether1 internet traffic')).toBeVisible();
  await expect(panel.getByText(/Latest report/)).toBeVisible();
  await expect(page.getByTestId('ether1-incoming-rate')).toHaveText('45.2 Mbps');
  await expect(page.getByTestId('ether1-outgoing-rate')).toHaveText('12.8 Mbps');
  await expect(panel.getByText(/latest stored router report/i)).toBeVisible();

  await panel.getByRole('button', { name: 'Start live' }).click();
  await expect(panel.getByText(/Live · ether1/)).toBeVisible();
  await expect(page.getByTestId('ether1-incoming-rate')).toHaveText('18.6 Mbps');
  await expect(page.getByTestId('ether1-outgoing-rate')).toHaveText('3.2 Mbps');
  await expect(panel.getByText(/while Live is enabled/i)).toBeVisible();

  await panel.getByRole('button', { name: 'Stop live' }).click();
  await expect(panel.getByText(/Latest report/)).toBeVisible();
  await expect(page.getByTestId('ether1-incoming-rate')).toHaveText('45.2 Mbps');

  await page.getByRole('button', { name: 'Usage', exact: true }).click();
  await expect(panel).toBeHidden();
  await page.getByRole('button', { name: 'Ports', exact: true }).click();
  await expect(page.getByTestId('ether1-incoming-rate')).toHaveText('45.2 Mbps');
});

test('fits the reported Ether1 reading on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/dashboard');

  await expect(page.getByLabel('Live Ether1 traffic')).toBeVisible({ timeout: 15_000 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
