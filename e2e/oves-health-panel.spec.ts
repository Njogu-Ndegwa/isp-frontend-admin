import { expect, test, type Page, type Route } from '@playwright/test';
import snapshot from './fixtures-oves-health.json';
import graphql from './fixtures-oves-graphql.json';

// The OVES platform health panel against a REAL snapshot: the fixture is the
// output of the backend collector (isp-billing app/services/oves_health) run
// against the live prod + dev clusters on 2026-10-12, with exposed endpoints
// and private IPs anonymised. History is synthesised around it.

const ADMIN = {
  id: 1, email: 'admin@bitwave.test', role: 'admin',
  organization_name: 'Bitwave Admin', subscription_status: 'active',
};

const NOW = new Date('2026-10-12T15:20:00Z').getTime();

function history(hours: number, probe?: string) {
  const bucketMinutes = hours <= 1 ? 1 : hours <= 6 ? 5 : hours <= 24 ? 15 : hours <= 72 ? 60 : hours <= 168 ? 120 : 240;
  const n = Math.floor((hours * 60) / bucketMinutes);
  const points = Array.from({ length: n }, (_, i) => {
    const at = NOW - (n - i) * bucketMinutes * 60_000;
    const hourOfDay = new Date(at).getUTCHours();
    const busy = hourOfDay >= 5 && hourOfDay <= 17 ? 1 : 0.25;
    const ok = Math.round(18 * bucketMinutes * busy * (0.8 + ((i * 7) % 5) / 10));
    const failed = i % 9 === 4 ? Math.max(1, Math.round(ok * 0.06)) : 0;
    return {
      t: new Date(at).toISOString(),
      samples: bucketMinutes,
      codes_ok: ok, codes_failed: failed, codes_failed_system: failed ? 1 : 0,
      success_rate: ok + failed ? ok / (ok + failed) : null,
      code_p50_ms: 2300 + ((i * 13) % 400), code_p95_ms: 3300 + ((i * 29) % 900),
      index_failures: Math.round(ok * 0.4), db_errors: i === Math.floor(n * 0.6) ? 6 : 0,
      probes_down: 5 + (i % 7 === 0 ? 1 : 0),
      prod_cpu_max: 28 + (i % 5), prod_disk_max: 82 + (i % 3) * 0.3,
      ...(probe ? { probe_uptime: i % 11 === 3 ? 0.93 : 1, probe_p95_ms: 380 + ((i * 17) % 120) } : {}),
    };
  });
  const totalOk = points.reduce((a, p) => a + p.codes_ok, 0);
  const totalFailed = points.reduce((a, p) => a + p.codes_failed, 0);
  const groups = snapshot.sections.dependencies.groups;
  const uptime = Object.fromEntries(groups.flatMap((g) => g.probes.map((p) => [p.id, p.status === 'down' ? 0.02 : 0.9993])));
  return {
    hours, bucket_minutes: bucketMinutes, points, probe_uptime: uptime, probe_p95_ms: {},
    totals: { codes_ok: totalOk, codes_failed: totalFailed, success_rate: totalOk / (totalOk + totalFailed) },
  };
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function authenticate(page: Page) {
  await page.addInitScript(`
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token', 'test-admin-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(ADMIN))});
  `);
}

async function mockApi(page: Page, payload: unknown = snapshot) {
  const historyCalls: string[] = [];
  const gqlCalls: string[] = [];
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/admin/oves-health')) return json(route, payload);
    if (url.pathname.endsWith('/admin/oves-health/graphql/graphs')) return json(route, { configured: true, graphs: graphql.graphs });
    if (url.pathname.endsWith('/admin/oves-health/graphql')) {
      gqlCalls.push(url.search);
      const g = url.searchParams.get('graph');
      if (g === 'Event-Microservice-Prod') return json(route, graphql.event_24h);
      if (g === 'Thing-Microservice-Shadow-A') {
        const base = Number(url.searchParams.get('hours')) >= 168 ? graphql.shadow_7d : graphql.shadow_24h;
        const op = url.searchParams.get('operation');
        if (!op) return json(route, base);
        return json(route, { ...base, operation: op, error_groups: base.error_groups.filter((e) => e.operation === op),
          requests: base.operations.find((o) => o.name === op)?.requests ?? 0 });
      }
      return json(route, { detail: 'Apollo GraphOS: HTTP 401' }, 502);
    }
    if (url.pathname.endsWith('/admin/oves-health/history')) {
      historyCalls.push(url.search);
      return json(route, history(Number(url.searchParams.get('hours') ?? 24), url.searchParams.get('probe') ?? undefined));
    }
    // The rest of the dashboard is out of scope; 503s land in each widget's own error card.
    if (url.pathname.endsWith('/admin/ops-health')) return json(route, { detail: 'mocked out' }, 503);
    if (url.pathname.endsWith('/admin/dashboard')) return json(route, { detail: 'mocked out' }, 503);
    if (url.pathname.endsWith('/admin/db-pool')) return json(route, { detail: 'mocked out' }, 503);
    return json(route, {});
  });
  return Object.assign(historyCalls, { gql: gqlCalls });
}

async function shot(page: Page, name: string) {
  const box = await page.getByTestId('oves-health-panel').boundingBox();
  if (box) await page.screenshot({ path: `test-results/${name}.png`, clip: box, fullPage: true });
}

for (const width of [375, 1280]) {
  test(`OVES health panel renders the real snapshot at ${width}px`, async ({ page }) => {
    await authenticate(page);
    const historyCalls = await mockApi(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    const panel = page.getByTestId('oves-health-panel');
    await expect(panel).toBeVisible({ timeout: 30_000 });
    await expect(panel.getByRole('heading', { name: 'OVES platform health' })).toBeVisible();
    // Alerts list on their own; the heavy details stay closed until asked for.
    await expect(panel.getByTestId('oves-alerts')).toContainText('open to the internet');
    await expect(panel.getByTestId('oves-details')).toHaveCount(0);
    // Code generation comes first, from Apollo: success, requests, operations, real messages, the path.
    const hero = panel.getByTestId('oves-codegen');
    await expect(hero).toBeVisible();
    await expect(hero.getByTestId('oves-codegen-success')).toContainText('100.0%');
    await expect(hero.getByTestId('oves-codegen-requests')).toContainText('427');
    await expect(hero.getByTestId('oves-codegen-ops')).toContainText('GenerateDaysCode_V2');
    await expect(hero.getByTestId('oves-codegen-errors-list')).toContainText('E11000 duplicate key');
    await expect(hero.getByTestId('oves-path-shadow_api')).toContainText('Shadow API');
    await expect(hero.getByTestId('oves-path-thing_make')).toContainText('2/2 pods');
    await expect(panel.getByTestId('oves-tile-api')).toContainText('1/9');

    await panel.getByTestId('oves-toggle').click();
    await expect(panel.getByTestId('oves-details')).toBeVisible();
    // Errors tab (default): Studio-style, shadow graph first, platform errors shown, caller errors behind a toggle.
    const gql = panel.getByTestId('oves-gql');
    await expect(gql).toBeVisible();
    await expect(gql.getByTestId('oves-gql-errors')).toContainText('E11000 duplicate key');
    await expect(gql.getByTestId('oves-gql-errors')).not.toContainText('Minimum time lapse');
    await gql.getByTestId('oves-gql-show-caller').check();
    await expect(gql.getByTestId('oves-gql-errors')).toContainText('Minimum time lapse');
    await expect(gql.getByTestId('oves-gql-ops')).toContainText('GenerateDaysCode');
    await gql.getByTestId('oves-gql-ops').getByText('GenerateDaysCode_V2', { exact: true }).click();
    await expect.poll(() => historyCalls.gql.some((q) => q.includes('operation=GenerateDaysCode_V2'))).toBe(true);
    await expect(gql.getByTestId('oves-gql-clear-op')).toBeVisible();
    await gql.getByRole('tab', { name: /^Event/ }).click();
    await expect(gql.getByTestId('oves-gql-errors')).toContainText('microserviceEvents_2024');
    await page.waitForTimeout(400);
    await shot(page, `oves-errors-${width}`);
    await panel.getByRole('tab', { name: 'Trends' }).click();
    await expect(panel.getByTestId('oves-tile-clusters')).toContainText('2/3');

    // Overview charts render from history; switching the range refetches it.
    await expect(panel.getByTestId('oves-chart-codes')).toBeVisible();
    await panel.getByTestId('oves-range').getByRole('button', { name: '7d' }).click();
    await expect.poll(() => historyCalls.some((q) => q.includes('hours=168'))).toBe(true);
    await page.waitForTimeout(500);
    await shot(page, `oves-trends-${width}`);

    // Dependencies: grouped, Tencent present, one probe opens its own history.
    await panel.getByRole('tab', { name: 'Dependencies' }).click();
    await expect(panel).toContainText('Tencent Cloud (TKE oves-dev, Singapore)');
    await expect(panel).toContainText('MQTT broker + auth (EMQX, production)');
    await panel.getByRole('button', { name: /Login \(auth -> MongoDB primary\)/ }).click();
    await expect(panel.getByTestId('oves-probe-detail-login')).toBeVisible();
    await expect.poll(() => historyCalls.some((q) => q.includes('probe=login'))).toBe(true);
    await page.waitForTimeout(500);
    await shot(page, `oves-deps-${width}`);

    await panel.getByRole('tab', { name: 'Clusters' }).click();
    const prod = panel.getByTestId('oves-cluster-prod');
    await expect(prod).toBeVisible();
    // Named services, shadow path first; pods by state, never nodes by IP.
    await expect(prod.getByTestId('oves-service-shadow-api')).toContainText('Shadow API');
    await expect(prod.getByTestId('oves-service-shadow-api')).toContainText('3/3 ready');
    await expect(prod.getByTestId('oves-service-auth-microservice')).toContainText('Pod 1');
    await expect(prod).not.toContainText('10-1-');
    await expect(prod).toContainText('Machines: 6/6 up');
    await expect(panel).toContainText('not connected');   // Tencent cluster not configured yet
    await shot(page, `oves-clusters-${width}`);

    await panel.getByRole('tab', { name: 'Database' }).click();
    await expect(panel).toContainText('billing surplus');
    await shot(page, `oves-database-${width}`);

    await panel.getByRole('tab', { name: 'Code logs' }).click();
    await expect(panel).toContainText('Failure reasons (60 min)');
    await shot(page, `oves-codes-${width}`);

    // No horizontal page scroll on phones.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('OVES health panel stays collapsed when healthy and explains when off', async ({ page }) => {
  await authenticate(page);
  await mockApi(page, { ...snapshot, overall_status: 'ok', alerts: [] });
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  const panel = page.getByTestId('oves-health-panel');
  await expect(panel).toContainText('Nothing needs attention', { timeout: 30_000 });
  await expect(panel.getByTestId('oves-details')).toHaveCount(0);
  await panel.getByTestId('oves-toggle').click();
  await expect(panel.getByTestId('oves-details')).toBeVisible();

  await page.unroute('**/api/**');
  await mockApi(page, {
    enabled: false, generated_at: null, snapshot_age_seconds: null, overall_status: 'unknown',
    alerts: [], sections: {}, sources: {},
  });
  await page.reload();
  await expect(page.getByTestId('oves-health-panel')).toContainText('OVES_HEALTH_ENABLED', { timeout: 30_000 });
});
