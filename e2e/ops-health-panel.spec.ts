import { expect, test, type Page, type Route } from '@playwright/test';

// Smoke test for the admin "Operations health" panel. The backend endpoint is
// mocked with a payload shaped exactly like the ops-health JSON contract
// (isp-billing branch feat/ops-health-monitor).

const ADMIN = {
  id: 1,
  email: 'admin@bitwave.test',
  role: 'admin',
  organization_name: 'Bitwave Admin',
  subscription_status: 'active',
};

const NOW = new Date('2026-09-22T19:00:12Z');

const historyPoints = Array.from({ length: 12 }, (_, i) => ({
  t: new Date(NOW.getTime() - (12 - i) * 5 * 60_000).toISOString(),
  provisioning_retry_pending: 10 + i * 30,
  provisioning_p95_end_to_end: 5 + i * 5,
  payments_p95_callback: 18 + (i % 3),
  expiry_active_hot: 40 + i * 7,
  expiry_p95_removal: 120 + i * 20,
  tunnels_offline: 6 + (i % 4),
  safety_net_removals: i === 7 ? 3 : 0,
  active_writers: 1,
}));

const OPS_HEALTH = {
  generated_at: '2026-09-22T19:00:00Z',
  snapshot_age_seconds: 12,
  overall_status: 'critical',
  alerts: [
    {
      key: 'expiry.hot_backlog',
      severity: 'warning',
      title: 'Expired customers still active',
      message: '126 expired customers are still active on reachable routers (threshold 100).',
      value: 126,
      threshold: 100,
      since: '2026-09-22T18:40:00Z',
    },
    {
      key: 'provisioning.retry_backlog',
      severity: 'critical',
      title: 'Provisioning retry backlog',
      message: '344 attempts waiting for retry in the last hour across 59 routers (threshold 50).',
      value: 344,
      threshold: 50,
      since: '2026-09-22T16:20:00Z',
    },
  ],
  sections: {
    provisioning: {
      status: 'critical',
      window_minutes: 60,
      counts: { scheduled: 3, in_progress: 12, retry_pending: 344, router_updated: 14, failed: 2 },
      success_ratio: 0.04,
      routers_with_backlog: 59,
      top_routers: [
        { router_id: 8, router_name: 'Powernet #8', pending: 21, last_error: 'timeout' },
        { router_id: 110, router_name: 'SIMSEAS #4', pending: 17, last_error: null },
      ],
      latency: {
        end_to_end: { p50: 4.1, p95: 61.0, samples: 14, baseline_p95: 6.2, ratio: 9.8 },
        router_call: { p50: 1.2, p95: 40.0, samples: 14, baseline_p95: 2.0, ratio: 20.0 },
      },
    },
    payments: {
      status: 'healthy',
      window_minutes: 60,
      counts: { created: 120, completed: 101, failed: 15, pending: 4, pending_over_5m: 1 },
      callback_latency: { p50: 8.0, p95: 22.0, samples: 101, baseline_p95: 20.0, ratio: 1.1 },
      minutes_since_last_completed: 1.5,
    },
    expiry: {
      status: 'warning',
      expired_active_total: 752,
      expired_active_hot: 126,
      expired_active_quarantined: 626,
      oldest_hot_expired_minutes: 41,
      removal_latency: { p50: 90.0, p95: 400.0, samples: 30, baseline_p95: 300.0, ratio: 1.3 },
      cleanup_job: {
        last_finished_at: '2026-09-22T18:59:10Z',
        last_duration_seconds: 55.2,
        skipped_runs_last_hour: 3,
        last_error: null,
      },
    },
    tunnels: {
      status: 'watch',
      counts: { online: 80, offline: 9, stale: 4, total: 93 },
      recent_drops_10m: 2,
      platform_event: false,
      control_path: { available: true, native: 76, transit_fallback: 7, unrouted: 10, checked_at: '2026-09-22T18:59:40Z' },
    },
    control_plane: {
      status: 'healthy',
      active_writers: 1,
      instances: [
        {
          instance_id: 'hetzner-app-1',
          hostname: 'isp-hetzner',
          runtime_mode: 'active',
          scheduler_enabled: true,
          app_version: 'abc1234def',
          db_identity: '7301aa55',
          last_seen_at: '2026-09-22T18:59:55Z',
        },
      ],
      db_identity_mismatch: false,
    },
    safety_net: { status: 'healthy', removals_last_hour: 0, baseline_per_hour: 0.3, last_removal_at: null },
    jobs: {
      status: 'healthy',
      items: [
        {
          id: 'cleanup_expired_users',
          interval_seconds: 67,
          last_started_at: '2026-09-22T18:58:15Z',
          last_finished_at: '2026-09-22T18:59:10Z',
          last_duration_seconds: 55.2,
          last_error: null,
          missed_or_skipped_last_hour: 3,
          stale: false,
        },
      ],
    },
    db_pool: { status: 'healthy', pressure_level: 'healthy', checked_out: 3, pool_size: 15, max_overflow: 15 },
  },
  history: { points: historyPoints },
};

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

async function mockApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/admin/ops-health')) return json(route, OPS_HEALTH);
    if (path.endsWith('/admin/ops-health/history')) return json(route, { points: historyPoints });
    // The rest of the dashboard is out of scope here; a 503 exercises every
    // `.catch(() => null)` fallback so the page renders its error card while
    // the admin-only monitors above it still mount.
    if (path.endsWith('/admin/dashboard')) return json(route, { detail: 'mocked out' }, 503);
    // DbPoolMonitor reads `pool.pressure` from its response and would crash the
    // whole route (error boundary) on an empty object; a 503 lands in its own
    // catch block and renders its error card instead.
    if (path.endsWith('/admin/db-pool')) return json(route, { detail: 'mocked out' }, 503);
    return json(route, {});
  });
}

for (const width of [375, 1280]) {
  test(`operations health panel renders alerts and tiles at ${width}px`, async ({ page }) => {
    await authenticate(page);
    await mockApi(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    const panel = page.getByTestId('ops-health-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Operations health' })).toBeVisible();

    // Alerts: critical sorted before warning, with title + message + since.
    const alerts = page.getByTestId('ops-health-alerts').locator('li');
    await expect(alerts).toHaveCount(2);
    await expect(alerts.nth(0)).toHaveAttribute('data-alert-key', 'provisioning.retry_backlog');
    await expect(alerts.nth(0)).toContainText('Provisioning retry backlog');
    await expect(alerts.nth(0)).toContainText('344 attempts waiting for retry');
    await expect(alerts.nth(0)).toContainText(/since \d+[smhd] ago/);
    await expect(alerts.nth(1)).toHaveAttribute('data-alert-key', 'expiry.hot_backlog');

    // All eight section tiles are present.
    for (const title of ['Provisioning', 'Payments', 'Expiry', 'Tunnels', 'Control plane', 'Safety net', 'Jobs', 'DB pool']) {
      await expect(panel.locator(`[data-ops-tile="${title}"]`)).toBeVisible();
    }
    await expect(panel.locator('[data-ops-tile="Provisioning"]')).toContainText('344');
    await expect(panel.locator('[data-ops-tile="Provisioning"]')).toContainText('×9.8');

    // Expandable router backlog links to the routers page.
    await panel.getByRole('button', { name: /Top routers with backlog/ }).click();
    const routers = page.getByTestId('ops-health-top-routers');
    await expect(routers).toBeVisible();
    await expect(routers.getByRole('link', { name: 'Powernet #8' })).toHaveAttribute('href', '/routers');

    // No horizontal page scroll on a phone.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('operations health panel shows an unavailable state when the endpoint fails', async ({ page }) => {
  await authenticate(page);
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/admin/ops-health')) return json(route, { detail: 'not deployed' }, 404);
    if (path.endsWith('/admin/dashboard')) return json(route, { detail: 'mocked out' }, 503);
    // DbPoolMonitor reads `pool.pressure` from its response and would crash the
    // whole route (error boundary) on an empty object; a 503 lands in its own
    // catch block and renders its error card instead.
    if (path.endsWith('/admin/db-pool')) return json(route, { detail: 'mocked out' }, 503);
    return json(route, {});
  });
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });

  const panel = page.getByTestId('ops-health-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('unavailable');
  await expect(panel.getByRole('button', { name: 'Retry' })).toBeVisible();
});
