import { test, expect, type Page } from '@playwright/test';
import { WIDTHS, RESELLER_PAGES, ADMIN_PAGES, PUBLIC_PAGES } from './pages';

function demoInit(role: 'reseller' | 'admin') {
  const user = {
    id: 0, email: 'demo@bitwave.co.ke', role,
    organization_name: 'Demo ISP Network', subscription_status: 'trial',
  };
  return `
    localStorage.setItem('demo_mode','true');
    localStorage.setItem('auth_token','demo-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(user))});
  `;
}

async function checkPage(page: Page, role: 'reseller' | 'admin' | null, path: string, width: number) {
  if (role) await page.addInitScript(demoInit(role));
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  // Wait for auth to resolve + the page shell to render (every authed page renders
  // a Header <h1>), so we assert against real content, not the auth loading spinner.
  await page.waitForSelector('h1', { timeout: 25_000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(900); // settle async data / cards / charts

  const { scrollW, clientW, offenders } = await page.evaluate(() => {
    const de = document.documentElement;
    const clientW = de.clientWidth;
    // Collect elements that extend past the viewport's right edge — useful for debugging.
    const offenders: string[] = [];
    if (de.scrollWidth > clientW + 1) {
      for (const el of Array.from(document.body.querySelectorAll('*'))) {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.right > clientW + 1 && r.width > 0 && r.height > 0) {
          const e = el as HTMLElement;
          const id = e.id ? `#${e.id}` : '';
          const cls = typeof e.className === 'string' && e.className
            ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.')
            : '';
          offenders.push(`${e.tagName.toLowerCase()}${id}${cls} (right=${Math.round(r.right)})`);
        }
      }
    }
    return { scrollW: de.scrollWidth, clientW, offenders: offenders.slice(0, 8) };
  });

  await page.screenshot({
    path: `e2e/screens/${role ?? 'public'}${path.replace(/\//g, '_')}-${width}.png`,
    fullPage: true,
  });

  expect(
    scrollW,
    `horizontal overflow on ${path} @ ${width}px (scrollW ${scrollW} > clientW ${clientW}). Offenders: ${offenders.join(' | ') || 'n/a'}`,
  ).toBeLessThanOrEqual(clientW + 1);
}

test.describe('responsive: no horizontal overflow', () => {
  for (const path of RESELLER_PAGES) for (const w of WIDTHS) {
    test(`reseller ${path} @ ${w}`, async ({ page }) => checkPage(page, 'reseller', path, w));
  }
  for (const path of ADMIN_PAGES) for (const w of WIDTHS) {
    test(`admin ${path} @ ${w}`, async ({ page }) => checkPage(page, 'admin', path, w));
  }
  for (const path of PUBLIC_PAGES) for (const w of WIDTHS) {
    test(`public ${path} @ ${w}`, async ({ page }) => checkPage(page, null, path, w));
  }
});
