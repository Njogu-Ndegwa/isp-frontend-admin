import { chromium } from '@playwright/test';
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const appDir = path.join(process.cwd(), 'app');
const baseURL = process.env.PERF_BASE_URL || 'http://127.0.0.1:3010';
const repeats = Number(process.env.PERF_REPEATS || 5);
const thresholdMs = Number(process.env.PERF_THRESHOLD_MS || 50);
const width = Number(process.env.PERF_WIDTH || 1280);
const height = Number(process.env.PERF_HEIGHT || 900);
const outputPath = process.env.PERF_OUTPUT || path.join('perf-results', 'page-load-latest.json');

const dynamicSegmentValues = new Map([
  ['id', '1'],
  ['identity', 'demo'],
]);

const users = {
  reseller: {
    id: 1,
    email: 'reseller@perf.test',
    role: 'reseller',
    organization_name: 'Perf ISP',
    subscription_status: 'active',
  },
  admin: {
    id: 1,
    email: 'admin@perf.test',
    role: 'admin',
    organization_name: 'Perf Admin',
    subscription_status: 'active',
  },
};

function walkPages(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkPages(fullPath));
    } else if (entry.isFile() && entry.name === 'page.tsx') {
      files.push(fullPath);
    }
  }
  return files;
}

function routeFromPageFile(filePath) {
  const rel = path.relative(appDir, filePath).split(path.sep).join('/');
  const segments = rel.split('/').slice(0, -1).map((segment) => {
    const match = /^\[(.+)\]$/.exec(segment);
    if (!match) return segment;
    return dynamicSegmentValues.get(match[1]) || '1';
  });
  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

function roleForRoute(route) {
  if (
    route === '/' ||
    route === '/login' ||
    route === '/signup' ||
    route === '/landing' ||
    route.startsWith('/store') ||
    route.startsWith('/r/')
  ) {
    return 'public';
  }
  if (route.startsWith('/admin') || route === '/shop') {
    return 'admin';
  }
  return 'reseller';
}

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function round(value) {
  return value === null ? null : Math.round(value * 10) / 10;
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/') || url.hostname === 'isp.bitwavetechnologies.com';
}

function apiFixture(url) {
  const pathname = url.pathname;
  if (pathname.includes('/shop/products')) return [];
  if (pathname.includes('/shop/orders')) return {};
  if (pathname.includes('/admin/resellers/stats')) {
    return {
      period: '30d',
      revenue_over_time: [],
      signups_over_time: [],
      totals: { revenue: 0, mpesa_revenue: 0, new_resellers: 0 },
    };
  }
  if (pathname.includes('/admin/resellers')) {
    return {
      total: 0,
      filters_applied: { sort_by: 'created_at', sort_order: 'desc', filter: null, search: null },
      resellers: [],
    };
  }
  if (pathname.includes('/admin/subscriptions/revenue')) {
    return { totals: {}, monthly: [], plans: [] };
  }
  if (pathname.includes('/admin/subscriptions')) {
    return { subscriptions: [], total: 0 };
  }
  if (pathname.includes('/admin/leads')) {
    return { leads: [], total: 0, activities: [], follow_ups: [], sources: [] };
  }
  if (pathname.includes('/routers')) return [];
  return {};
}

function installPageLoadProbe() {
  window.__pageLoadProbe = {
    mainReadyMs: null,
    domContentLoadedMs: null,
    loadMs: null,
    firstPaintMs: null,
    firstContentfulPaintMs: null,
  };

  const markMainReady = () => {
    if (window.__pageLoadProbe.mainReadyMs !== null) return;
    if (document.querySelector('main')) {
      window.__pageLoadProbe.mainReadyMs = performance.now();
    }
  };

  const observeMain = () => {
    markMainReady();
    if (window.__pageLoadProbe.mainReadyMs !== null) return;

    const root = document.documentElement || document;
    const observer = new MutationObserver(() => {
      markMainReady();
      if (window.__pageLoadProbe.mainReadyMs !== null) {
        observer.disconnect();
      }
    });
    observer.observe(root, { childList: true, subtree: true });
  };

  if ('PerformanceObserver' in window) {
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-paint') {
            window.__pageLoadProbe.firstPaintMs = entry.startTime;
          } else if (entry.name === 'first-contentful-paint') {
            window.__pageLoadProbe.firstContentfulPaintMs = entry.startTime;
          }
        }
      });
      paintObserver.observe({ type: 'paint', buffered: true });
    } catch {
      // Paint timing is best-effort and may be unavailable in some browsers.
    }
  }

  observeMain();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.__pageLoadProbe.domContentLoadedMs = performance.now();
      markMainReady();
    }, { once: true });
  } else {
    window.__pageLoadProbe.domContentLoadedMs = performance.now();
  }

  window.addEventListener('load', () => {
    window.__pageLoadProbe.loadMs = performance.now();
    markMainReady();
  }, { once: true });
}

async function installNetworkGuards(context) {
  const localOrigin = new URL(baseURL).origin;
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (isApiRequest(url)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiFixture(url)),
      });
      return;
    }

    if (url.origin !== localOrigin) {
      await route.abort();
      return;
    }

    await route.continue();
  });
}

async function createPage(browser, role) {
  const context = await browser.newContext({
    baseURL,
    viewport: { width, height },
    serviceWorkers: 'block',
  });

  const cookieURL = new URL(baseURL).origin;
  if (role === 'reseller') {
    await context.addCookies([
      { name: 'demo_mode', value: 'true', url: cookieURL, sameSite: 'Lax' },
      { name: 'auth_token', value: 'demo-token', url: cookieURL, sameSite: 'Lax' },
      { name: 'auth_user', value: encodeURIComponent(JSON.stringify(users.reseller)), url: cookieURL, sameSite: 'Lax' },
    ]);
  } else if (role === 'admin') {
    await context.addCookies([
      { name: 'demo_mode', value: 'false', url: cookieURL, sameSite: 'Lax' },
      { name: 'auth_token', value: 'perf-admin-token', url: cookieURL, sameSite: 'Lax' },
      { name: 'auth_user', value: encodeURIComponent(JSON.stringify(users.admin)), url: cookieURL, sameSite: 'Lax' },
    ]);
  }

  await context.addInitScript(installPageLoadProbe);

  await context.addInitScript(({ roleName, authUsers }) => {
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');

    if (roleName === 'reseller') {
      localStorage.setItem('demo_mode', 'true');
      localStorage.setItem('auth_token', 'demo-token');
      localStorage.setItem('auth_user', JSON.stringify(authUsers.reseller));
      return;
    }

    if (roleName === 'admin') {
      localStorage.setItem('auth_token', 'perf-admin-token');
      localStorage.setItem('auth_user', JSON.stringify(authUsers.admin));
    }
  }, { roleName: role, authUsers: users });

  await installNetworkGuards(context);
  return { context, page: await context.newPage() };
}

async function measureOnce(page, route) {
  await page.goto('about:blank');
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  let mainAttached = true;
  await page.waitForSelector('main', { state: 'attached', timeout: 10_000 }).catch(() => {
    mainAttached = false;
  });

  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation').at(-1);
    const probe = window.__pageLoadProbe || {};
    return {
      now: probe.mainReadyMs ?? performance.now(),
      measuredAt: performance.now(),
      domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.startTime : null,
      domContentLoadedProbe: probe.domContentLoadedMs ?? null,
      load: nav && nav.loadEventEnd > 0 ? nav.loadEventEnd - nav.startTime : null,
      loadProbe: probe.loadMs ?? null,
      firstPaint: probe.firstPaintMs ?? null,
      firstContentfulPaint: probe.firstContentfulPaintMs ?? null,
    };
  });

  return {
    mainAttached,
    readyMs: timing.now,
    measuredAtMs: timing.measuredAt,
    domContentLoadedMs: timing.domContentLoaded,
    domContentLoadedProbeMs: timing.domContentLoadedProbe,
    loadMs: timing.load,
    loadProbeMs: timing.loadProbe,
    firstPaintMs: timing.firstPaint,
    firstContentfulPaintMs: timing.firstContentfulPaint,
  };
}

async function measureRoute(page, route) {
  await measureOnce(page, route).catch(() => null);
  const samples = [];
  for (let index = 0; index < repeats; index += 1) {
    try {
      samples.push(await measureOnce(page, route));
    } catch (error) {
      samples.push({
        mainAttached: false,
        readyMs: Number.POSITIVE_INFINITY,
        domContentLoadedMs: null,
        loadMs: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const readyValues = samples
    .filter((sample) => Number.isFinite(sample.readyMs))
    .map((sample) => sample.readyMs);
  const dclValues = samples
    .filter((sample) => typeof sample.domContentLoadedMs === 'number')
    .map((sample) => sample.domContentLoadedMs);
  const measuredAtValues = samples
    .filter((sample) => typeof sample.measuredAtMs === 'number')
    .map((sample) => sample.measuredAtMs);
  const fcpValues = samples
    .filter((sample) => typeof sample.firstContentfulPaintMs === 'number')
    .map((sample) => sample.firstContentfulPaintMs);

  return {
    samples,
    p50ReadyMs: round(percentile(readyValues, 50)),
    p75ReadyMs: round(percentile(readyValues, 75)),
    maxReadyMs: round(readyValues.length ? Math.max(...readyValues) : null),
    p50DomContentLoadedMs: round(percentile(dclValues, 50)),
    p50MeasuredAtMs: round(percentile(measuredAtValues, 50)),
    p50FirstContentfulPaintMs: round(percentile(fcpValues, 50)),
    failedSamples: samples.filter((sample) => !sample.mainAttached || sample.error).length,
  };
}

async function main() {
  if (!statSync(appDir).isDirectory()) {
    throw new Error(`Cannot find app directory at ${appDir}`);
  }

  const routes = walkPages(appDir)
    .map(routeFromPageFile)
    .sort((a, b) => a.localeCompare(b))
    .map((route) => ({ route, role: roleForRoute(route) }));

  const browser = await chromium.launch();
  const pages = new Map();
  const results = [];

  try {
    for (const role of ['public', 'reseller', 'admin']) {
      pages.set(role, await createPage(browser, role));
    }

    for (const item of routes) {
      const { page } = pages.get(item.role);
      const metrics = await measureRoute(page, item.route);
      results.push({ ...item, ...metrics });
      const status = metrics.failedSamples > 0 || metrics.p50ReadyMs === null || metrics.p50ReadyMs > thresholdMs
        ? 'FAIL'
        : 'PASS';
      console.log(
        `${status.padEnd(4)} ${String(metrics.p50ReadyMs ?? 'n/a').padStart(6)} ms p50 ` +
        `${String(metrics.p75ReadyMs ?? 'n/a').padStart(6)} ms p75 ` +
        `${String(metrics.maxReadyMs ?? 'n/a').padStart(6)} ms max ${item.role.padEnd(8)} ${item.route}`,
      );
    }
  } finally {
    for (const { context } of pages.values()) {
      await context.close().catch(() => {});
    }
    await browser.close();
  }

  const failed = results.filter((result) => (
    result.failedSamples > 0 ||
    result.p50ReadyMs === null ||
    result.p50ReadyMs > thresholdMs
  ));
  const payload = {
    generatedAt: new Date().toISOString(),
    baseURL,
    viewport: { width, height },
    repeats,
    thresholdMs,
    metric: 'p50 in-page main-ready timestamp from a document-start MutationObserver, after one warmup load; DCL/load/FCP are recorded for comparison',
    routeCount: routes.length,
    failedCount: failed.length,
    results,
  };

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log('');
  console.log(`Routes: ${routes.length}`);
  console.log(`Threshold failures: ${failed.length}`);
  console.log(`Results: ${outputPath}`);

  if (failed.length > 0) {
    console.log('');
    console.log('Slowest routes:');
    for (const result of [...results]
      .sort((a, b) => (b.p50ReadyMs ?? Number.POSITIVE_INFINITY) - (a.p50ReadyMs ?? Number.POSITIVE_INFINITY))
      .slice(0, 10)) {
      console.log(`${String(result.p50ReadyMs ?? 'n/a').padStart(6)} ms ${result.role.padEnd(8)} ${result.route}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
