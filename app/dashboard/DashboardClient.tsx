'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { DashboardAnalytics, MikroTikMetrics, BandwidthHistory, TopUsersResponse, SubscriptionAlert, ResellerTopUsageEntry, SubscriptionOverview } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import SubscriptionAlertBanner from '../components/SubscriptionAlertBanner';
import OnboardingChecklist from '../components/OnboardingChecklist';
import type { DownloadUsageServiceFilter } from './DownloadUsageChart';
import { DateFilter, getPeriodLabel } from './dateFilter';
import SectionCard, { SectionError } from './components/SectionCard';
import DashboardToolbar from './components/DashboardToolbar';
import KpiStrip from './components/KpiStrip';
import RevenueSection from './components/RevenueSection';
import PlanPerformance from './components/PlanPerformance';
import NetworkHealthCard from './components/NetworkHealthCard';
import DownloadUsageSection from './components/DownloadUsageSection';
import BandwidthSection from './components/BandwidthSection';
import TopUsers from './components/TopUsers';
import DailyBreakdown from './components/DailyBreakdown';
import InterfacesPanel from './components/InterfacesPanel';

const DASHBOARD_LOAD_DELAYS_MS = {
  mikrotik: 1500,
  subscription: 3000,
  topUsers: 4500,
  usage: 5500,
  bandwidth: 6500,
  onboarding: 8000,
} as const;

const MIKROTIK_REFRESH_INTERVAL_MS = 60_000;
const TOP_USERS_REFRESH_INTERVAL_MS = 60_000;
const BANDWIDTH_REFRESH_INTERVAL_MS = 120_000;
const STALE_HEALTH_RETRY_MIN_SECONDS = 20;
const STALE_HEALTH_RETRY_MAX_SECONDS = 60;

const isDashboardVisible = () =>
  typeof document === 'undefined' || document.visibilityState === 'visible';

const buildSubscriptionAlert = (overview: SubscriptionOverview): SubscriptionAlert | null => {
  const status = overview.status;
  const invoice = overview.pending_invoice ?? null;
  let message: string | null = null;

  if (status === 'suspended' || status === 'inactive') {
    message = 'Your subscription is suspended. Please pay your outstanding invoice to continue using the service.';
  } else if (invoice?.is_overdue) {
    const paid = invoice.amount_paid ?? 0;
    const remaining = invoice.balance_remaining ?? Math.max(invoice.final_charge - paid, 0);
    message = `Your ${invoice.period_label} invoice of KES ${invoice.final_charge.toLocaleString()} is overdue.`;
    message += paid > 0
      ? ` KES ${paid.toLocaleString()} paid, KES ${remaining.toLocaleString()} remaining.`
      : ' Please pay to avoid suspension.';
  } else if (invoice?.is_due_soon) {
    const paid = invoice.amount_paid ?? 0;
    const remaining = invoice.balance_remaining ?? Math.max(invoice.final_charge - paid, 0);
    const days = invoice.days_until_due ?? 0;
    message = `Your ${invoice.period_label} invoice of KES ${invoice.final_charge.toLocaleString()} is due in ${days} day${days === 1 ? '' : 's'}.`;
    if (paid > 0) {
      message += ` KES ${paid.toLocaleString()} paid, KES ${remaining.toLocaleString()} remaining.`;
    }
  } else if (status === 'trial' && overview.expires_at) {
    const expiresAt = new Date(overview.expires_at).getTime();
    if (!Number.isNaN(expiresAt)) {
      const daysLeft = Math.ceil((expiresAt - Date.now()) / 86400000);
      if (daysLeft <= 3) {
        const safeDays = Math.max(daysLeft, 0);
        message = `Your free trial ends in ${safeDays} day${safeDays === 1 ? '' : 's'}.`;
      }
    }
  }

  return message ? { status, message, current_invoice: invoice } : null;
};

export default function DashboardPage() {
  const { subscriptionAlert: authAlert } = useAuth();

  // Analytics state
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // MikroTik state
  const [mikrotik, setMikrotik] = useState<MikroTikMetrics | null>(null);
  const [mikrotikLoading, setMikrotikLoading] = useState(true);
  const [mikrotikError, setMikrotikError] = useState<string | null>(null);

  // Bandwidth history state
  const [bandwidth, setBandwidth] = useState<BandwidthHistory | null>(null);
  const [bandwidthLoading, setBandwidthLoading] = useState(true);
  const [bandwidthError, setBandwidthError] = useState<string | null>(null);

  // Top users state
  const [topUsers, setTopUsers] = useState<TopUsersResponse | null>(null);
  const [topUsersLoading, setTopUsersLoading] = useState(true);
  const [topUsersError, setTopUsersError] = useState<string | null>(null);

  // Top FUP usage state (reseller-wide, monthly)
  const [topUsageThisMonth, setTopUsageThisMonth] = useState<ResellerTopUsageEntry[] | null>(null);
  const [topUsageLoading, setTopUsageLoading] = useState(true);

  // UI state - use DateFilter type for flexibility
  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'preset', preset: 'today' });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [downloadUsageHours, setDownloadUsageHours] = useState(24);
  const [downloadUsageService, setDownloadUsageService] = useState<DownloadUsageServiceFilter>('all');
  const bandwidthRequestKeyRef = useRef<string | null>(null);

  // Router filter state (null until a router is loaded)
  const [selectedRouterId, setSelectedRouterId] = useState<number | null>(null);
  const [hasRouters, setHasRouters] = useState<boolean | null>(null); // null = still loading

  // Custom date range state
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Subscription alert
  const [subscriptionAlert, setSubscriptionAlert] = useState<SubscriptionAlert | null>(null);

  // Fetch analytics (non-blocking) — only when a router is selected
  const loadAnalytics = useCallback(async () => {
    if (!selectedRouterId) return;
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);

      // Build API options based on dateFilter
      let options: Parameters<typeof api.getDashboardAnalytics>[1] = {};

      if (dateFilter.type === 'preset') {
        options = { preset: dateFilter.preset };
      } else if (dateFilter.type === 'days') {
        options = { days: dateFilter.days };
      } else if (dateFilter.type === 'custom') {
        options = { startDate: dateFilter.startDate, endDate: dateFilter.endDate };
      }

      options.routerId = selectedRouterId;

      const analytics = await api.getDashboardAnalytics(1, options);
      setData(analytics);
      if (analytics.dailyTrend.length > 0) {
        setSelectedDate(analytics.dailyTrend[analytics.dailyTrend.length - 1].date);
      }
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [dateFilter, selectedRouterId]);

  // Fetch MikroTik metrics (non-blocking) — only when a router is selected
  const loadMikrotik = useCallback(async () => {
    if (!selectedRouterId) return;
    try {
      setMikrotikLoading(true);
      setMikrotikError(null);
      const metrics = await api.getMikroTikMetrics(selectedRouterId, { preferSnapshot: true });
      setMikrotik(metrics);
    } catch (err) {
      setMikrotikError(err instanceof Error ? err.message : 'Failed to load router metrics');
    } finally {
      setMikrotikLoading(false);
    }
  }, [selectedRouterId]);

  // Fetch bandwidth history (non-blocking) — only when a router is selected
  const loadBandwidth = useCallback(async () => {
    if (!selectedRouterId) return;
    try {
      setBandwidthLoading(true);
      setBandwidthError(null);
      const history = await api.getBandwidthHistory(downloadUsageHours, selectedRouterId);
      setBandwidth(history);
    } catch (err) {
      setBandwidthError(err instanceof Error ? err.message : 'Failed to load bandwidth data');
    } finally {
      setBandwidthLoading(false);
    }
  }, [downloadUsageHours, selectedRouterId]);

  // Fetch top users (non-blocking) — only when a router is selected
  const loadTopUsers = useCallback(async () => {
    if (!selectedRouterId) return;
    try {
      setTopUsersLoading(true);
      setTopUsersError(null);
      const users = await api.getTopUsers(10, selectedRouterId);
      setTopUsers(users);
    } catch (err) {
      setTopUsersError(err instanceof Error ? err.message : 'Failed to load top users');
    } finally {
      setTopUsersLoading(false);
    }
  }, [selectedRouterId]);

  // Load subscription alert without hitting the legacy dashboard overview endpoint.
  useEffect(() => {
    if (authAlert || api.isDemoMode()) return;

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      api.getSubscription().then((overview) => {
        if (!cancelled) {
          setSubscriptionAlert(buildSubscriptionAlert(overview));
        }
      }).catch(() => {});
    }, DASHBOARD_LOAD_DELAYS_MS.subscription);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [authAlert]);

  // Load both in parallel on mount and when selectedDays changes
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // MikroTik metrics - auto-refresh while the dashboard is visible.
  useEffect(() => {
    if (!selectedRouterId) return;

    const refresh = () => {
      if (isDashboardVisible()) void loadMikrotik();
    };

    const timeout = window.setTimeout(refresh, DASHBOARD_LOAD_DELAYS_MS.mikrotik);
    const interval = window.setInterval(refresh, MIKROTIK_REFRESH_INTERVAL_MS);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [loadMikrotik, selectedRouterId]);

  useEffect(() => {
    if (!selectedRouterId || !mikrotik?.stale) return;
    if (!mikrotik.refreshInProgress && (mikrotik.retryAfterSeconds ?? 0) <= 0) return;
    if (!isDashboardVisible()) return;

    const retrySeconds = Math.min(
      STALE_HEALTH_RETRY_MAX_SECONDS,
      Math.max(STALE_HEALTH_RETRY_MIN_SECONDS, mikrotik.retryAfterSeconds || 30)
    );
    const timeout = window.setTimeout(() => {
      if (isDashboardVisible()) void loadMikrotik();
    }, retrySeconds * 1000);

    return () => window.clearTimeout(timeout);
  }, [
    loadMikrotik,
    mikrotik?.generatedAt,
    mikrotik?.refreshInProgress,
    mikrotik?.retryAfterSeconds,
    mikrotik?.stale,
    selectedRouterId,
  ]);

  useEffect(() => {
    if (!selectedRouterId) return;

    const refresh = () => {
      if (isDashboardVisible()) void loadBandwidth();
    };

    const requestKey = `${selectedRouterId}:${downloadUsageHours}`;
    const fetchImmediately = bandwidthRequestKeyRef.current !== null
      && bandwidthRequestKeyRef.current !== requestKey;
    bandwidthRequestKeyRef.current = requestKey;

    const timeout = fetchImmediately
      ? undefined
      : window.setTimeout(refresh, DASHBOARD_LOAD_DELAYS_MS.bandwidth);
    if (fetchImmediately) refresh();

    const interval = window.setInterval(refresh, BANDWIDTH_REFRESH_INTERVAL_MS);
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [loadBandwidth, selectedRouterId, downloadUsageHours]);

  useEffect(() => {
    if (!selectedRouterId) return;

    const refresh = () => {
      if (isDashboardVisible()) void loadTopUsers();
    };

    const timeout = window.setTimeout(refresh, DASHBOARD_LOAD_DELAYS_MS.topUsers);
    const interval = window.setInterval(refresh, TOP_USERS_REFRESH_INTERVAL_MS);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [loadTopUsers, selectedRouterId]);

  // Load monthly top FUP usage (reseller-wide)
  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setTopUsageLoading(true);
      api.getResellerTopUsage(10).then((rows) => {
        if (!cancelled) setTopUsageThisMonth(rows);
      }).catch(() => {
        if (!cancelled) setTopUsageThisMonth([]);
      }).finally(() => {
        if (!cancelled) setTopUsageLoading(false);
      });
    }, DASHBOARD_LOAD_DELAYS_MS.usage);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  const refreshAll = () => {
    loadAnalytics();
    loadMikrotik();
    loadBandwidth();
    loadTopUsers();
  };

  // Handle custom date range submission
  const applyCustomRange = () => {
    if (customStartDate && customEndDate) {
      setDateFilter({ type: 'custom', startDate: customStartDate, endDate: customEndDate });
      setShowCustomRange(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-nav">
      {(subscriptionAlert || authAlert) && <SubscriptionAlertBanner alert={(subscriptionAlert || authAlert)!} />}

      <DashboardToolbar
        selectedRouterId={selectedRouterId} onRouterChange={setSelectedRouterId}
        onRoutersLoaded={(routers) => setHasRouters(routers.length > 0)}
        dateFilter={dateFilter} onDateFilterChange={(f) => { setDateFilter(f); setShowCustomRange(false); }}
        showCustomRange={showCustomRange} onToggleCustomRange={setShowCustomRange}
        customStartDate={customStartDate} customEndDate={customEndDate}
        onCustomStartChange={setCustomStartDate} onCustomEndChange={setCustomEndDate}
        onApplyCustomRange={applyCustomRange}
        onRefresh={refreshAll} refreshing={analyticsLoading}
      />

      <OnboardingChecklist delayMs={DASHBOARD_LOAD_DELAYS_MS.onboarding} />

      {/* Row 1 — KPIs */}
      {hasRouters !== false && (analyticsError
        ? <SectionCard title="Analytics"><SectionError message={analyticsError} onRetry={loadAnalytics} /></SectionCard>
        : <KpiStrip data={data} loading={analyticsLoading} periodLabel={getPeriodLabel(dateFilter)} />)}

      {/* 12-col bento grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-stretch">
        {/* Row 2 — Revenue 8 + Plans 4 */}
        {hasRouters !== false && <div className="xl:col-span-8 min-w-0"><RevenueSection routerId={selectedRouterId} enabled={selectedRouterId !== null} /></div>}
        {!analyticsError && data && <div className="xl:col-span-4 min-w-0"><PlanPerformance plans={data.planPerformance} totalRevenue={data.summary.totalRevenue} /></div>}

        {/* Row 3 — Router Health (6) + Download Usage (6) */}
        {selectedRouterId && <div className="xl:col-span-6 min-w-0"><NetworkHealthCard data={mikrotik} loading={mikrotikLoading} error={mikrotikError} onRetry={loadMikrotik} /></div>}
        {selectedRouterId && <div className="xl:col-span-6 min-w-0"><DownloadUsageSection data={bandwidth} loading={bandwidthLoading} error={bandwidthError} onRetry={loadBandwidth} hours={downloadUsageHours} onHoursChange={setDownloadUsageHours} service={downloadUsageService} onServiceChange={setDownloadUsageService} /></div>}

        {/* Row 4 — Bandwidth History (full width) */}
        {selectedRouterId && <div className="xl:col-span-12 min-w-0"><BandwidthSection data={bandwidth} loading={bandwidthLoading} error={bandwidthError} onRetry={loadBandwidth} /></div>}

        {/* Row 5 — Top Users: Live (per-router) | Period (account-wide FUP) toggle */}
        <div className="xl:col-span-12 min-w-0"><TopUsers selectedRouterId={selectedRouterId} live={topUsers} liveLoading={topUsersLoading} liveError={topUsersError} onRetryLive={loadTopUsers} period={topUsageThisMonth} periodLoading={topUsageLoading} /></div>

        {/* Row 6 — collapsible detail (full width) */}
        {!analyticsError && !analyticsLoading && data && (
          <div className="xl:col-span-12 min-w-0"><DailyBreakdown data={data} selectedDate={selectedDate} onDateSelect={setSelectedDate} /></div>
        )}
        {selectedRouterId && mikrotik?.interfaces?.length ? (
          <div className="xl:col-span-12 min-w-0"><InterfacesPanel interfaces={mikrotik.interfaces} /></div>
        ) : null}
      </div>
    </div>
  );
}
