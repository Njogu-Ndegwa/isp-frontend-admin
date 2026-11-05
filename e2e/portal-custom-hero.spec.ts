import { expect, test, type Page, type Route } from '@playwright/test';

const RESELLER = {
  id: 7,
  email: 'reseller@bitwave.test',
  role: 'reseller',
  organization_name: 'FastNet ISP',
  subscription_status: 'active',
};

const NATURE = 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=750&h=370&fit=crop&q=80';
const PUBLIC_URL = 'https://isp.bitwavetechnologies.com/media/c/2026/11/r7-0123456789abcdef.jpg';
const UPLOAD_URL = 'https://acct.r2.cloudflarestorage.com/bucket/c/2026/11/r7-0123456789abcdef.jpg?sig=1';

function settings(headerBg: string) {
  return {
    id: 1, user_id: 7, color_theme: 'ocean_blue', header_style: 'hero',
    show_ads: false, show_welcome_banner: true, welcome_title: 'TDK', welcome_subtitle: null,
    company_logo_url: null, header_bg_image_url: headerBg, footer_text: null,
    portal_support_phone: null, portal_support_whatsapp: null, show_ratings: false,
    show_reconnect_button: true, show_social_links: false, facebook_url: null,
    whatsapp_group_url: null, instagram_url: null, show_announcement: false,
    announcement_type: 'info', announcement_text: null, portal_language: 'en',
    plans_section_title: null, featured_plan_ids: null, show_plan_speed: true,
    plan_sort_order: 'default', created_at: null, updated_at: null,
  };
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/** A real photo, made in the browser: 3000x2000 of noise, the worst case for size. */
async function bigPhoto(page: Page): Promise<Buffer> {
  await page.goto('about:blank');
  const b64 = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 3000; c.height = 2000;
    const ctx = c.getContext('2d')!;
    const d = ctx.createImageData(3000, 2000);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d.data[i] = v; d.data[i + 1] = 255 - v; d.data[i + 2] = (i / 32000) & 255; d.data[i + 3] = 255;
    }
    ctx.putImageData(d, 0, 0);
    const blob: Blob = await new Promise((r) => c.toBlob((x) => r(x!), 'image/jpeg', 0.95));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(s);
  });
  return Buffer.from(b64, 'base64');
}

async function open(page: Page, opts: { stored?: string; uploadStatus?: number } = {}) {
  const calls = {
    ticket: null as null | { content_type: string; size: number },
    putBytes: 0,
    putType: '',
    saved: null as null | Record<string, unknown>,
  };
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token', 'test-reseller-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(RESELLER))});
  `);
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (path.endsWith('/portal/settings/hero-image/upload-url')) {
      calls.ticket = route.request().postDataJSON();
      if (opts.uploadStatus) return json(route, { detail: 'Photo storage is not set up yet' }, opts.uploadStatus);
      return json(route, {
        upload_url: UPLOAD_URL, public_url: PUBLIC_URL, key: 'c/2026/11/r7-0123456789abcdef.jpg',
        content_type: 'image/jpeg', max_bytes: 307200, expires_in: 600, method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
      });
    }
    if (path.endsWith('/portal/settings') && method === 'PUT') {
      calls.saved = route.request().postDataJSON();
      return json(route, { message: 'ok', updated_fields: [], settings: settings(String(calls.saved?.header_bg_image_url)) });
    }
    if (path.endsWith('/portal/settings')) {
      return json(route, {
        settings: settings(opts.stored ?? NATURE),
        available_themes: [], available_header_styles: [], available_languages: [],
        available_announcement_types: [], available_plan_sort_orders: [],
      });
    }
    if (path.endsWith('/plans')) return json(route, []);
    return json(route, {});
  });
  await page.route(/r2\.cloudflarestorage\.com/, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT', 'Access-Control-Allow-Headers': '*' } });
    }
    calls.putBytes = route.request().postDataBuffer()?.length ?? 0;
    calls.putType = route.request().headers()['content-type'] ?? '';
    return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.goto('/settings/portal-customization');
  await expect(page.getByText('Hero Background')).toBeVisible({ timeout: 30_000 });
  return calls;
}

test('a big photo is shrunk, uploaded, previewed and saved as the hero', async ({ page }) => {
  const photo = await bigPhoto(page);
  expect(photo.length).toBeGreaterThan(2 * 1024 * 1024);
  const calls = await open(page);

  await page.getByTestId('hero-upload-input').setInputFiles({ name: 'shop.jpg', mimeType: 'image/jpeg', buffer: photo });
  await expect(page.getByTestId('hero-upload-tile')).toHaveAttribute('aria-pressed', 'true', { timeout: 20_000 });

  expect(calls.ticket?.content_type).toBe('image/jpeg');
  expect(calls.ticket?.size).toBeLessThanOrEqual(300 * 1024);
  expect(calls.putBytes).toBe(calls.ticket?.size);
  expect(calls.putType).toBe('image/jpeg');

  // The live preview paints the uploaded photo before it is saved.
  await expect.poll(() => page.locator('.pp-hero').first().evaluate((el) => (el as HTMLElement).style.backgroundImage)).toContain(PUBLIC_URL);

  await page.getByRole('button', { name: /save/i }).first().click();
  await expect.poll(() => calls.saved).toEqual({ header_bg_image_url: PUBLIC_URL });
});

test('a wrong file type never asks for an upload slot', async ({ page }) => {
  const calls = await open(page);
  await page.getByTestId('hero-upload-input').setInputFiles({ name: 'a.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') });
  await expect(page.getByText('Use a JPG, PNG or WebP photo.')).toBeVisible();
  expect(calls.ticket).toBeNull();
});

test('storage being off says so and leaves the current preset selected', async ({ page }) => {
  const photo = await bigPhoto(page);
  const calls = await open(page, { uploadStatus: 503 });
  await page.getByTestId('hero-upload-input').setInputFiles({ name: 'shop.jpg', mimeType: 'image/jpeg', buffer: photo });
  await expect(page.getByText(/uploads aren't available/i)).toBeVisible({ timeout: 20_000 });
  expect(calls.saved).toBeNull();
  await expect(page.getByTestId('hero-upload-tile')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Nature' })).toHaveAttribute('aria-pressed', 'true');
});

test('presets keep working: switching away and back keeps the uploaded photo', async ({ page }) => {
  const calls = await open(page, { stored: PUBLIC_URL });
  const tile = page.getByTestId('hero-upload-tile');
  await expect(tile).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'City' }).click();
  await expect(tile).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: /save/i }).first().click();
  await expect.poll(() => (calls.saved?.header_bg_image_url as string) ?? '').toContain('photo-1477959858617');

  await tile.click();
  await expect(tile).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.locator('.pp-hero').first().evaluate((el) => (el as HTMLElement).style.backgroundImage)).toContain(PUBLIC_URL);
});
