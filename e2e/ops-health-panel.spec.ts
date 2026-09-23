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
        { router_id: 8, router_name: 'Powernet #8', pending: 21, last_error: 'timeout', tunnel: 'l2tp' },
        { router_id: 110, router_name: 'SIMSEAS #4', pending: 17, last_error: null, tunnel: 'wireguard' },
      ],
      backlog_by_tunnel: {
        wireguard: { routers: 12, pending: 40, routers_with_backlog: 6 },
        l2tp: { routers: 47, pending: 304, routers_with_backlog: 53 },
      },
      latency: {
        end_to_end: { p50: 4.1, p95: 61.0, samples: 14, baseline_p95: 6.2, ratio: 9.8 },
        router_call: { p50: 1.2, p95: 40.0, samples: 14, baseline_p95: 2.0, ratio: 20.0 },
        // L2TP is the plane that drifted; WireGuard stays flat -> "it's the tunnel host".
        by_tunnel: {
          l2tp: {
            end_to_end: { p50: 8.0, p95: 75.0, samples: 9, baseline_p95: 6.5, ratio: 11.5 },
            router_call: { p50: 3.0, p95: 66.0, samples: 9, baseline_p95: 2.1, ratio: 31.4 },
            routers: 47,
          },
          wireguard: {
            end_to_end: { p50: 2.1, p95: 4.4, samples: 5, baseline_p95: 4.0, ratio: 1.1 },
            router_call: { p50: 0.9, p95: 1.9, samples: 5, baseline_p95: 1.8, ratio: 1.1 },
            routers: 46,
          },
        },
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
      hot_by_tunnel: { wireguard: { routers: 9, customers: 31 }, l2tp: { routers: 22, customers: 95 } },
      removal_latency: { p50: 90.0, p95: 400.0, samples: 30, baseline_p95: 300.0, ratio: 1.3 },
      removal_latency_by_tunnel: {
        wireguard: { p50: 70.0, p95: 250.0, samples: 12, baseline_p95: 240.0, ratio: 1.0 },
        l2tp: { p50: 110.0, p95: 520.0, samples: 18, baseline_p95: 310.0, ratio: 1.7 },
      },
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

const WINDOW_REPORT = {
  window: { start: '2026-09-22T15:00:00Z', end: '2026-09-22T18:00:00Z', hours: 3 },
  router: null,
  provisioning: {
    counts: { scheduled: 0, in_progress: 0, retry_pending: 4, router_updated: 38, failed: 1 },
    success_ratio: 0.884,
    end_to_end: { p50: 9.0, p95: 61.5, max: 3625, samples: 38 },
    router_call: { p50: 8.0, p95: 14.2, max: 75, samples: 38 },
    retries_per_delivery: { p50: 1, max: 5 },
    by_tunnel: {
      l2tp: { attempts: 15, delivered: 10, not_delivered: 5, end_to_end: { p50: 12, p95: 240, max: 3625, samples: 10 }, router_call: { p50: 11, p95: 66, max: 75, samples: 10 } },
      wireguard: { attempts: 28, delivered: 28, not_delivered: 0, end_to_end: { p50: 8, p95: 16, max: 20, samples: 28 }, router_call: { p50: 8, p95: 15, max: 20, samples: 28 } },
    },
    routers: [
      { router_id: 8, router_name: 'Powernet #8', tunnel: 'l2tp', attempts: 9, delivered: 4, not_delivered: 5, end_to_end_p95: 240, router_call_p95: 66, last_error: 'Failed to connect' },
      { router_id: 110, router_name: 'SIMSEAS #4', tunnel: 'wireguard', attempts: 12, delivered: 12, not_delivered: 0, end_to_end_p95: 16, router_call_p95: 15, last_error: null },
    ],
    routers_total: 2,
  },
  expiry: {
    enforcement: {
      expired: 40, removed: 34, still_active: 6, pct_removed: 85.0,
      by_reason: { router_status_stale: 4, router_offline_3d_plus: 2 },
      routers: [
        { router_id: 247, router_name: 'Jomvu main', tunnel: 'wireguard', still_active: 4, oldest_expired_minutes: 1440, reason: 'router_status_stale', reason_label: 'router marked online but not reached for 6h+', router_last_status: true, router_last_online_at: '2026-09-22T06:32:00Z', owner_status: 'active' },
        { router_id: 302, router_name: 'MIKROTIK 1 MUTHUA', tunnel: 'wireguard', still_active: 2, oldest_expired_minutes: 3900, reason: 'router_offline_3d_plus', reason_label: 'router offline 3+ days (quarantined)', router_last_status: false, router_last_online_at: '2026-09-20T11:41:00Z', owner_status: 'active' },
      ],
      routers_total: 2,
    },
    removals: 30, removal_latency: { p50: 90, p95: 400, max: 900, samples: 30 }, by_tunnel: { wireguard: { p50: 80, p95: 250, max: 300, samples: 12 } },
  },
  payments: { counts: { created: 120, completed: 101, failed: 15, pending: 4 }, callback_latency: { p50: 8, p95: 22, max: 60, samples: 101 } },
  truncated: false,
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
    if (path.endsWith('/admin/ops-health/window')) return json(route, WINDOW_REPORT);
    if (path.endsWith('/routers')) return json(route, [{ id: 8, name: 'Powernet #8', ip_address: '10.0.100.8' }, { id: 110, name: 'SIMSEAS #4', ip_address: '10.0.0.110' }]);
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
    // Every problematic router says which tunnel it is reached over.
    await expect(routers.locator('li', { hasText: 'Powernet #8' }).locator('[data-tunnel="l2tp"]')).toHaveText('L2TP');
    await expect(routers.locator('li', { hasText: 'SIMSEAS #4' }).locator('[data-tunnel="wireguard"]')).toHaveText('WireGuard');

    // Per-tunnel p95 rows: WireGuard first, then L2TP, with L2TP's call latency flagged red.
    const provRows = panel.locator('[data-ops-tile="Provisioning"] [data-testid="ops-health-tunnel-rows"] li');
    await expect(provRows).toHaveCount(2);
    await expect(provRows.nth(0)).toHaveAttribute('data-tunnel', 'wireguard');
    await expect(provRows.nth(0)).toContainText('1.9s');
    await expect(provRows.nth(1)).toHaveAttribute('data-tunnel', 'l2tp');
    await expect(provRows.nth(1)).toContainText('×31');
    await expect(provRows.nth(1)).toContainText('304 pend');
    await expect(provRows.nth(1).locator('span').first()).toHaveClass(/bg-red-500/);
    // Look-back slice: open, run against the mocked window report, worst router first.
    await panel.getByRole('button', { name: /Look back at a time slice/ }).click();
    const lookback = page.getByTestId('ops-health-lookback');
    await expect(lookback).toBeVisible();
    await lookback.getByTestId('ops-health-lookback-run').click();
    const result = page.getByTestId('ops-health-lookback-result');
    await expect(result).toContainText('3h slice');
    await expect(result).toContainText('88%');
    await expect(result).toContainText('p95 1.0m');
    const rows = page.getByTestId('ops-health-lookback-routers').locator('li');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Powernet #8');
    await expect(rows.nth(0)).toContainText('Failed to connect');
    await expect(page.getByTestId('ops-health-lookback-enforcement')).toContainText('85%');
    const unenforced = page.getByTestId('ops-health-lookback-unenforced');
    await expect(unenforced).toContainText('6 customers on 2 routers');
    await expect(unenforced).toContainText('router not reached 6h+: 4');
    await expect(unenforced.locator('li').nth(0)).toContainText('Jomvu main');
    await expect(unenforced.locator('li').nth(0)).toContainText('1.0d');
    await expect(unenforced.locator('li').nth(0)).toContainText('not reached for 6h+');
    await expect(result).toContainText('Removal latency (30)');
    await expect(result).toContainText('M-Pesa callbacks');

    const expRows = panel.locator('[data-ops-tile="Expiry"] [data-testid="ops-health-tunnel-rows"] li');
    await expect(expRows).toHaveCount(2);
    await expect(expRows.nth(1)).toContainText('8.7m');
    await expect(expRows.nth(1)).toContainText('95 on 22 rtr');

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
