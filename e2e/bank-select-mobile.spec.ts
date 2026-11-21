import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * The Bank select on the Add Payment Method bottom sheet has 22 options. On a
 * phone the list used to run off the bottom of the screen and could not be
 * scrolled (any scroll closed it, and touch drags scrolled the page behind).
 *
 * These checks open the modal at phone sizes with touch emulation, swipe the
 * list with a real touch gesture, pick the last bank and confirm the paybill
 * fills in. Desktop is checked too. All API calls are stubbed.
 */

// `next dev --webpack` evaluates modules with eval(), which the app's CSP
// blocks; bypass it so the spec also runs against a webpack dev server.
test.use({ bypassCSP: true });

const RESELLER = {
  id: 7, email: 'reseller@bitwave.test', role: 'reseller',
  organization_name: 'FastNet ISP', subscription_status: 'active',
};

function json(route: Route, body: unknown) {
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
}

async function openBankSelect(page: Page, viewport: { width: number; height: number }) {
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token','test-reseller-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(RESELLER))});
  `);
  await page.route('**/api/**', (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p.endsWith('/payment-methods') || p.endsWith('/routers')) return json(route, []);
    return json(route, {});
  });
  await page.setViewportSize(viewport);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/settings/payment-methods', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;}' }).catch(() => {});

  await page.getByRole('button', { name: /Add (Payment )?Method/ }).first().click();
  await page.getByRole('heading', { name: 'Add Payment Method' }).waitFor({ timeout: 15_000 });

  // Type -> Bank Account
  await page.getByRole('button', { name: 'M-Pesa Direct' }).click();
  await page.getByRole('option', { name: 'Bank Account' }).click();

  await page.getByRole('button', { name: 'Select your bank' }).click();
  const list = page.getByRole('listbox');
  await expect(list).toBeVisible();
  return list;
}

async function expectInsideViewport(page: Page, list: ReturnType<Page['getByRole']>) {
  const vp = page.viewportSize()!;
  const box = (await list.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
  const scrollable = await list.evaluate((el) => el.scrollHeight > el.clientHeight);
  expect(scrollable, 'long bank list should scroll inside itself').toBe(true);
}

for (const vp of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
  test.describe(`phone ${vp.width}x${vp.height}`, () => {
    test.use({ hasTouch: true, isMobile: true });

    test('bank list fits on screen, touch-scrolls to the last bank, and selecting it fills the paybill', async ({ page }) => {
      const list = await openBankSelect(page, vp);
      await expectInsideViewport(page, list);

      // Swipe up inside the list with a real touch gesture.
      const box = (await list.boundingBox())!;
      const cdp = await page.context().newCDPSession(page);
      const bodyScrollBefore = await page.evaluate(() => window.scrollY);
      const gx = Math.round(box.x + box.width / 2);
      const gy = Math.round(box.y + box.height / 2);
      const diag = await page.evaluate(([x, y]) => {
        const hit = document.elementFromPoint(x, y);
        const lb = document.querySelector('[role="listbox"]') as HTMLElement;
        (window as unknown as { __listScrolls: number }).__listScrolls = 0;
        lb.addEventListener('scroll', () => { (window as unknown as { __listScrolls: number }).__listScrolls++; });
        const cs = getComputedStyle(lb);
        return { hit: hit ? `${hit.tagName}.${String(hit.className).slice(0, 40)}` : null, inList: !!hit && lb.contains(hit), overflowY: cs.overflowY, touchAction: cs.touchAction, dpr: devicePixelRatio, iw: innerWidth, ih: innerHeight };
      }, [gx, gy]);
      for (let i = 0; i < 4; i++) {
        await cdp.send('Input.synthesizeScrollGesture', {
          x: gx,
          y: gy,
          yDistance: -Math.round(box.height * 0.8),
          gestureSourceType: 'touch',
          speed: 1200,
        });
      }

      // Still open, scrolled to the end, page behind did not move.
      await expect(list).toBeVisible();
      const m = await list.evaluate((el) => ({ top: el.scrollTop, client: el.clientHeight, height: el.scrollHeight, scrolls: (window as unknown as { __listScrolls: number }).__listScrolls, winY: window.scrollY, dir: el.dataset.direction, diag: '' }));
      m.diag = JSON.stringify({ ...diag, box });
      expect(m.top + m.client, `list should reach its last option (${JSON.stringify(m)})`).toBeGreaterThanOrEqual(m.height - 2);
      expect(await page.evaluate(() => window.scrollY)).toBe(bodyScrollBefore);

      const unaitas = page.getByRole('option', { name: /Unaitas Sacco/ });
      await expect(unaitas).toBeInViewport();
      await unaitas.tap();

      await expect(list).toBeHidden();
      await expect(page.locator('input[name="pm_bank_paybill_number"]')).toHaveValue('544700');
      await expect(page.getByRole('button', { name: /Unaitas Sacco/ })).toBeVisible();
    });
  });
}

test('desktop: bank list opens with a capped height and Standard Chartered can be picked', async ({ page }) => {
  const list = await openBankSelect(page, { width: 1440, height: 900 });
  await expectInsideViewport(page, list);

  const box = (await list.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 2000);
  await expect(list).toBeVisible();

  await page.getByRole('option', { name: /Standard Chartered/ }).click();
  await expect(list).toBeHidden();
  await expect(page.locator('input[name="pm_bank_paybill_number"]')).toHaveValue('329329');
});
