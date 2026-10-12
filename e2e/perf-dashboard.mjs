// A/B: what does the OVES panel cost the admin dashboard?
// Runs against a production build (`next start`), API mocked with the real
// collector snapshot. Run: node e2e/perf-dashboard.mjs http://localhost:3119
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3119';
const snapshot = JSON.parse(fs.readFileSync(new URL('./fixtures-oves-health.json', import.meta.url)));
const gql = JSON.parse(fs.readFileSync(new URL('./fixtures-oves-graphql.json', import.meta.url)));
const ADMIN = { id: 1, email: 'admin@bitwave.test', role: 'admin', organization_name: 'Bitwave Admin', subscription_status: 'active' };

async function run(withPanel, healthy = false, rate = 4) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token', 'perf-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(ADMIN))});
    window.__long = 0; window.__longMax = 0; window.__longN = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__long += e.duration; window.__longN++; window.__longMax = Math.max(window.__longMax, e.duration); } })
      .observe({ type: 'longtask', buffered: true });
  `);
  let jsBytes = 0, apiBytes = 0;
  const chunks = [];
  page.on('response', async (r) => {
    const u = r.url();
    try {
      const len = (await r.body()).length;
      if (u.includes('/_next/static/') && u.endsWith('.js')) { jsBytes += len; chunks.push([u.split('/').pop(), Math.round(len / 1024)]); }
      if (u.includes('/api/')) apiBytes += len;
    } catch { /* redirects */ }
  });
  await page.route('**/api/**', async (route) => {
    const p = new URL(route.request().url()).pathname;
    const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (p.endsWith('/admin/oves-health')) return withPanel ? send(healthy ? { ...snapshot, overall_status: 'ok', alerts: [] } : snapshot) : send({ detail: 'off' }, 404);
    if (p.endsWith('/admin/oves-health/history')) return send({ hours: 24, bucket_minutes: 15, points: [], probe_uptime: {}, probe_p95_ms: {}, totals: { codes_ok: 0, codes_failed: 0, success_rate: null } });
    if (p.endsWith('/admin/oves-health/graphql/graphs')) return send({ configured: true, graphs: gql.graphs });
    if (p.endsWith('/admin/oves-health/graphql')) return send(gql.shadow_24h);
    return send({ detail: 'mocked out' }, 503);
  });
  const t0 = Date.now();
  await page.goto(`${BASE}/admin`, { waitUntil: 'load' });
  const loadMs = Date.now() - t0;
  let panelMs = null;
  if (withPanel) {
    await page.getByTestId('oves-codegen').waitFor({ timeout: 30000 });
    panelMs = Date.now() - t0;
  }
  await page.waitForTimeout(4000);   // let lazy chunks + effects settle
  const m = await page.evaluate(() => ({
    long: Math.round(window.__long), longMax: Math.round(window.__longMax), longN: window.__longN,
    dcl: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd),
  }));
  await browser.close();
  return { chunks, loadMs, panelMs, jsKB: Math.round(jsBytes / 1024), apiKB: Math.round(apiBytes / 1024), ...m };
}

const med = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
for (const rate of [1, 4]) {
  for (const [withPanel, healthy, label] of [[false, false, 'without panel'], [true, false, 'with panel (live alerts, collapsed)']]) {
    const rs = [];
    for (let i = 0; i < 3; i++) rs.push(await run(withPanel, healthy, rate));
    console.log(`CPU x${rate} ${label.padEnd(36)} | long-task total ${String(med(rs.map((r) => r.long))).padStart(5)} ms | worst ${String(med(rs.map((r) => r.longMax))).padStart(5)} ms | panel visible ${withPanel ? med(rs.map((r) => r.panelMs)) + ' ms' : '-'} | JS ${med(rs.map((r) => r.jsKB))} KB | API ${med(rs.map((r) => r.apiKB))} KB`);
  }
}
