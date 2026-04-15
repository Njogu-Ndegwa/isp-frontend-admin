'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import {
  AdminDashboard,
  AdminExpiringSoon,
  AdminResellerStats,
  AdminResellerStatsPeriod,
  AdminMRRMetrics,
  AdminChurnMetrics,
  AdminSignupsSummary,
  AdminCustomerSignupsTimeSeries,
  AdminSubscriptionRevenueHistory,
  AdminARPUMetrics,
  AdminTrialConversion,
  AdminActivationFunnel,
  AdminRevenueConcentration,
  AdminRevenueForecast,
  AdminGrowthTarget,
  AdminGrowthTargetsResponse,
} from '../lib/types';
import { formatDateGMT3 } from '../lib/dateUtils';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import MobileDataCard from '../components/MobileDataCard';
import { SkeletonCard } from '../components/LoadingSpinner';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

type PeriodFilter = '7d' | '30d' | '90d' | '1y';

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
];

const formatSafeDate = (dateStr: string | null | undefined): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return formatDateGMT3(dateStr, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '-';
  }
};

const formatKES = (amount: number | undefined | null): string => {
  if (amount == null) return 'KES 0';
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const formatCompact = (amount: number): string => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toString();
};

// ---------- Sub-components ----------

function PeriodSelector({
  value,
  onChange,
  options = PERIOD_OPTIONS,
}: {
  value: PeriodFilter;
  onChange: (v: PeriodFilter) => void;
  options?: { value: PeriodFilter; label: string }[];
}) {
  return (
    <div className="flex items-center gap-1 bg-background-tertiary/50 rounded-xl p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            value === opt.value
              ? 'bg-accent-primary text-white shadow-sm'
              : 'text-foreground-muted hover:text-foreground hover:bg-background-tertiary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function PlaceholderCard({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="card p-4 sm:p-5 flex flex-col items-center justify-center text-center min-h-[100px]">
      <div className="w-8 h-8 rounded-full bg-background-tertiary flex items-center justify-center mb-2">
        <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <p className="text-xs font-medium text-foreground-muted">{title}</p>
      {subtitle && <p className="text-[10px] text-foreground-muted/60 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function ChartCard({
  title,
  children,
  period,
  onPeriodChange,
  showCompare,
  compareEnabled,
  onCompareToggle,
  isEmpty,
}: {
  title: string;
  children: React.ReactNode;
  period?: PeriodFilter;
  onPeriodChange?: (p: PeriodFilter) => void;
  showCompare?: boolean;
  compareEnabled?: boolean;
  onCompareToggle?: () => void;
  isEmpty?: boolean;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          {showCompare && (
            <button
              onClick={onCompareToggle}
              className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${
                compareEnabled
                  ? 'border-accent-primary/30 bg-accent-primary/10 text-accent-primary'
                  : 'border-border text-foreground-muted hover:border-border-hover'
              }`}
            >
              Compare
            </button>
          )}
          {period && onPeriodChange && (
            <PeriodSelector value={period} onChange={onPeriodChange} />
          )}
        </div>
      </div>
      {isEmpty ? (
        <div className="flex items-center justify-center h-[200px] text-foreground-muted text-xs">
          Awaiting backend endpoint
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function ActivationFunnelSection({ funnel }: { funnel: AdminActivationFunnel }) {
  const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500'];
  return (
    <div className="card p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Reseller Activation Funnel</h3>
      <div className="flex flex-col md:flex-row gap-2 md:gap-0 md:items-end">
        {funnel.funnel.map((step, i) => {
          const widthPercent = Math.max(step.percent, 15);
          const conversionFromPrev = i > 0 && funnel.funnel[i - 1].count > 0
            ? Math.round((step.count / funnel.funnel[i - 1].count) * 100)
            : null;
          return (
            <div key={step.stage} className="flex-1 flex flex-col items-center gap-1">
              {conversionFromPrev !== null && (
                <div className="hidden md:flex items-center gap-1 text-[10px] text-foreground-muted mb-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  {conversionFromPrev}%
                </div>
              )}
              <div
                className={`${colors[i]} rounded-xl flex items-center justify-center transition-all duration-500`}
                style={{ width: `${widthPercent}%`, minWidth: '60px', minHeight: '56px' }}
              >
                <span className="text-white text-sm font-bold">{step.count}</span>
              </div>
              <p className="text-[10px] sm:text-xs text-foreground-muted text-center mt-1">{step.label}</p>
              <p className="text-[10px] text-foreground-muted/60">{step.percent}%</p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-[10px] text-foreground-muted">Signup → Router</p>
          <p className="text-xs font-semibold text-foreground">{funnel.conversion_rates.signup_to_router}%</p>
        </div>
        <div>
          <p className="text-[10px] text-foreground-muted">Router → Customer</p>
          <p className="text-xs font-semibold text-foreground">{funnel.conversion_rates.router_to_customer}%</p>
        </div>
        <div>
          <p className="text-[10px] text-foreground-muted">Customer → Revenue</p>
          <p className="text-xs font-semibold text-foreground">{funnel.conversion_rates.customer_to_revenue}%</p>
        </div>
        <div>
          <p className="text-[10px] text-foreground-muted">Signup → Revenue</p>
          <p className="text-xs font-bold text-accent-primary">{funnel.conversion_rates.signup_to_revenue}%</p>
        </div>
      </div>
    </div>
  );
}

function GrowthTargetsSection({ targets }: { targets: AdminGrowthTarget[] }) {
  return (
    <div className="card p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Growth Targets</h3>
      <div className="space-y-4">
        {targets.map((target) => (
          <div key={target.id}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-foreground">{target.label}</span>
              <span className="text-[10px] text-foreground-muted">{target.period}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="w-full h-2.5 bg-background-tertiary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      target.progress_percent >= 80 ? 'bg-emerald-500' :
                      target.progress_percent >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(target.progress_percent, 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-semibold text-foreground w-10 text-right">
                {Math.round(target.progress_percent)}%
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-foreground-muted">
                {target.unit === 'KES' ? formatKES(target.current_value) : `${target.current_value}${target.unit === '%' ? '%' : ` ${target.unit}`}`}
              </span>
              <span className="text-[10px] text-foreground-muted">
                Target: {target.unit === 'KES' ? formatKES(target.target_value) : `${target.target_value}${target.unit === '%' ? '%' : ` ${target.unit}`}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueConcentrationSection({ data }: { data: AdminRevenueConcentration }) {
  return (
    <div className="card p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Revenue Concentration</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 rounded-xl bg-background-tertiary/50">
          <p className="text-2xl font-bold text-foreground">{data.top_5_share_percent}%</p>
          <p className="text-[10px] text-foreground-muted mt-0.5">Top 5 resellers</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-background-tertiary/50">
          <p className="text-2xl font-bold text-foreground">{data.top_10_share_percent}%</p>
          <p className="text-[10px] text-foreground-muted mt-0.5">Top 10 resellers</p>
        </div>
      </div>
      {data.top_contributors.length > 0 && (
        <div className="space-y-2">
          {data.top_contributors.slice(0, 5).map((c, i) => (
            <div key={c.id} className="flex items-center gap-2">
              <span className="text-[10px] text-foreground-muted w-4">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground truncate">{c.organization_name}</span>
                  <span className="text-xs text-foreground-muted ml-2">{c.share_percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-background-tertiary rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-accent-primary rounded-full"
                    style={{ width: `${c.share_percent}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-foreground-muted mt-3">
        {data.total_resellers_with_revenue} resellers generating {formatKES(data.total_revenue)} total
      </p>
    </div>
  );
}

const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--color-background-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    fontSize: '11px',
    padding: '8px 12px',
  },
  labelStyle: { color: 'var(--color-foreground-muted)', fontSize: '10px', marginBottom: '4px' },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const revenueFormatter = (value: any) => [formatKES(Number(value) || 0), 'Revenue'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const signupsFormatter = (value: any) => [value ?? 0, 'Signups'];

// ---------- Main Component ----------

export default function AdminDashboardPage() {
  const { user } = useAuth();

  // Global period filter
  const [globalPeriod, setGlobalPeriod] = useState<PeriodFilter>('30d');

  // Per-chart period overrides (null = use global)
  const [mpesaChartPeriod, setMpesaChartPeriod] = useState<PeriodFilter | null>(null);
  const [subRevChartPeriod, setSubRevChartPeriod] = useState<PeriodFilter | null>(null);
  const [resellerSignupsChartPeriod, setResellerSignupsChartPeriod] = useState<PeriodFilter | null>(null);
  const [customerSignupsChartPeriod, setCustomerSignupsChartPeriod] = useState<PeriodFilter | null>(null);

  // Compare toggles
  const [mpesaCompare, setMpesaCompare] = useState(false);
  const [subRevCompare, setSubRevCompare] = useState(false);
  const [resellerSignupsCompare, setResellerSignupsCompare] = useState(false);
  const [customerSignupsCompare, setCustomerSignupsCompare] = useState(false);

  // Existing endpoint data
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [stats, setStats] = useState<AdminResellerStats | null>(null);
  const [expiring, setExpiring] = useState<AdminExpiringSoon | null>(null);

  // New metric endpoint data (nullable until backend ready)
  const [mrr, setMrr] = useState<AdminMRRMetrics | null>(null);
  const [churn, setChurn] = useState<AdminChurnMetrics | null>(null);
  const [signupsSummary, setSignupsSummary] = useState<AdminSignupsSummary | null>(null);
  const [customerSignups, setCustomerSignups] = useState<AdminCustomerSignupsTimeSeries | null>(null);
  const [subRevenueHistory, setSubRevenueHistory] = useState<AdminSubscriptionRevenueHistory | null>(null);
  const [arpu, setArpu] = useState<AdminARPUMetrics | null>(null);
  const [trialConversion, setTrialConversion] = useState<AdminTrialConversion | null>(null);
  const [activationFunnel, setActivationFunnel] = useState<AdminActivationFunnel | null>(null);
  const [revenueConcentration, setRevenueConcentration] = useState<AdminRevenueConcentration | null>(null);
  const [revenueForecast, setRevenueForecast] = useState<AdminRevenueForecast | null>(null);
  const [growthTargets, setGrowthTargets] = useState<AdminGrowthTargetsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (period: PeriodFilter) => {
    try {
      setLoading(true);
      setError(null);

      const statsPeriod = period as AdminResellerStatsPeriod;

      const [
        dashResult,
        statsResult,
        expiringResult,
      ] = await Promise.all([
        api.getAdminDashboard(),
        api.getAdminResellerStats(statsPeriod),
        api.getAdminExpiringSoon(7).catch(() => null),
      ]);

      setData(dashResult);
      setStats(statsResult);
      setExpiring(expiringResult);

      // Fire new endpoints in parallel — all gracefully return null on failure
      const [
        mrrRes, churnRes, signupsRes, custSignupsRes, subRevHistRes,
        arpuRes, trialRes, funnelRes, concRes, forecastRes, targetsRes,
      ] = await Promise.all([
        api.getAdminMRR(),
        api.getAdminChurn(),
        api.getAdminSignupsSummary(period),
        api.getAdminCustomerSignups(period),
        api.getAdminSubscriptionRevenueHistory(period),
        api.getAdminARPU(),
        api.getAdminTrialConversion(),
        api.getAdminActivationFunnel(),
        api.getAdminRevenueConcentration(),
        api.getAdminRevenueForecast(period),
        api.getAdminGrowthTargets(),
      ]);

      setMrr(mrrRes);
      setChurn(churnRes);
      setSignupsSummary(signupsRes);
      setCustomerSignups(custSignupsRes);
      setSubRevenueHistory(subRevHistRes);
      setArpu(arpuRes);
      setTrialConversion(trialRes);
      setActivationFunnel(funnelRes);
      setRevenueConcentration(concRes);
      setRevenueForecast(forecastRes);
      setGrowthTargets(targetsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(globalPeriod);
  }, [fetchDashboard, globalPeriod]);

  // Refetch chart-specific data when per-chart period overrides change
  const effectiveMpesaPeriod = mpesaChartPeriod ?? globalPeriod;
  const effectiveSubRevPeriod = subRevChartPeriod ?? globalPeriod;
  const effectiveResellerSignupsPeriod = resellerSignupsChartPeriod ?? globalPeriod;
  const effectiveCustomerSignupsPeriod = customerSignupsChartPeriod ?? globalPeriod;

  useEffect(() => {
    if (mpesaChartPeriod && mpesaChartPeriod !== globalPeriod) {
      api.getAdminResellerStats(mpesaChartPeriod as AdminResellerStatsPeriod).then(setStats).catch(() => {});
    }
  }, [mpesaChartPeriod, globalPeriod]);

  useEffect(() => {
    if (resellerSignupsChartPeriod && resellerSignupsChartPeriod !== globalPeriod) {
      api.getAdminResellerStats(resellerSignupsChartPeriod as AdminResellerStatsPeriod).then(setStats).catch(() => {});
    }
  }, [resellerSignupsChartPeriod, globalPeriod]);

  useEffect(() => {
    if (subRevChartPeriod && subRevChartPeriod !== globalPeriod) {
      api.getAdminSubscriptionRevenueHistory(subRevChartPeriod).then((r) => r && setSubRevenueHistory(r)).catch(() => {});
    }
  }, [subRevChartPeriod, globalPeriod]);

  useEffect(() => {
    if (customerSignupsChartPeriod && customerSignupsChartPeriod !== globalPeriod) {
      api.getAdminCustomerSignups(customerSignupsChartPeriod).then((r) => r && setCustomerSignups(r)).catch(() => {});
    }
  }, [customerSignupsChartPeriod, globalPeriod]);

  // Chart data helpers
  const mpesaRevenueData = useMemo(() => {
    return stats?.revenue_over_time?.map((d) => ({
      name: d.label,
      revenue: d.revenue,
      mpesa: d.mpesa_revenue,
    })) ?? [];
  }, [stats]);

  const resellerSignupsData = useMemo(() => {
    return stats?.signups_over_time?.map((d) => ({
      name: d.label,
      count: d.count,
    })) ?? [];
  }, [stats]);

  const subRevenueData = useMemo(() => {
    return subRevenueHistory?.subscription_revenue_over_time?.map((d) => ({
      name: d.label,
      revenue: d.revenue,
    })) ?? [];
  }, [subRevenueHistory]);

  const subRevenuePrevData = useMemo(() => {
    return subRevenueHistory?.previous_period?.map((d) => ({
      name: d.label,
      revenue: d.revenue,
    })) ?? [];
  }, [subRevenueHistory]);

  const customerSignupsData = useMemo(() => {
    return customerSignups?.customer_signups_over_time?.map((d) => ({
      name: d.label,
      count: d.count,
    })) ?? [];
  }, [customerSignups]);

  const customerSignupsPrevData = useMemo(() => {
    return customerSignups?.previous_period?.map((d) => ({
      name: d.label,
      count: d.count,
    })) ?? [];
  }, [customerSignups]);

  // Merge current + previous period data for comparison overlay
  const subRevenueCompareData = useMemo(() => {
    if (!subRevCompare || subRevenuePrevData.length === 0) return subRevenueData;
    return subRevenueData.map((d, i) => ({
      ...d,
      prevRevenue: subRevenuePrevData[i]?.revenue ?? undefined,
    }));
  }, [subRevenueData, subRevenuePrevData, subRevCompare]);

  const customerSignupsCompareData = useMemo(() => {
    if (!customerSignupsCompare || customerSignupsPrevData.length === 0) return customerSignupsData;
    return customerSignupsData.map((d, i) => ({
      ...d,
      prevCount: customerSignupsPrevData[i]?.count ?? undefined,
    }));
  }, [customerSignupsData, customerSignupsPrevData, customerSignupsCompare]);

  // Auth gate
  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-danger mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
          <p className="text-foreground-muted text-sm">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header + Global Period Filter */}
      <Header
        title="Admin Dashboard"
        subtitle="Platform overview and growth metrics"
        action={
          <div className="flex items-center gap-3">
            <PeriodSelector value={globalPeriod} onChange={setGlobalPeriod} />
            <Link href="/admin/resellers" className="btn-primary text-sm px-4 py-2 hidden sm:inline-flex">
              View Resellers
            </Link>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4 h-[280px] animate-pulse bg-background-secondary" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-danger mb-4">{error}</p>
          <button onClick={() => fetchDashboard(globalPeriod)} className="btn-primary px-4 py-2 text-sm">Retry</button>
        </div>
      ) : data ? (
        <>
          {/* KPI Row — 6 cards, 2-col mobile, 3-col desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {/* MRR */}
            {mrr ? (
              <StatCard
                title="MRR"
                value={formatKES(mrr.current_mrr)}
                subtitle={`${mrr.change_percent >= 0 ? '+' : ''}${mrr.change_percent.toFixed(1)}% vs last period`}
                trend={{ value: Math.abs(mrr.change_percent), isPositive: mrr.change_percent >= 0 }}
                accent="success"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
            ) : (
              <PlaceholderCard title="MRR" subtitle="Awaiting backend" />
            )}

            {/* ARPU */}
            {arpu ? (
              <StatCard
                title="ARPU"
                value={formatKES(arpu.current_arpu)}
                subtitle={`${arpu.change_percent >= 0 ? '+' : ''}${arpu.change_percent.toFixed(1)}% vs last period`}
                trend={{ value: Math.abs(arpu.change_percent), isPositive: arpu.change_percent >= 0 }}
                accent="info"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
              />
            ) : (
              <PlaceholderCard title="ARPU" subtitle="Awaiting backend" />
            )}

            {/* Active Resellers */}
            <StatCard
              title="Active Resellers"
              value={data.resellers.active_last_30_days}
              subtitle={data.growth_deltas
                ? `${data.growth_deltas.resellers_change_percent >= 0 ? '+' : ''}${data.growth_deltas.resellers_change_percent.toFixed(1)}% ${data.growth_deltas.comparison_period}`
                : `${data.resellers.total} total registered`}
              trend={data.growth_deltas ? { value: Math.abs(data.growth_deltas.resellers_change_percent), isPositive: data.growth_deltas.resellers_change_percent >= 0 } : undefined}
              accent="primary"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
            />

            {/* Churn Rate */}
            {churn ? (
              <StatCard
                title="Churn Rate"
                value={`${churn.churn_rate.toFixed(1)}%`}
                subtitle={`${churn.churned_count} churned this period`}
                trend={{ value: Math.abs(churn.change_percent), isPositive: churn.change_percent <= 0 }}
                accent="danger"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>}
              />
            ) : (
              <PlaceholderCard title="Churn Rate" subtitle="Awaiting backend" />
            )}

            {/* Trial Conversion */}
            {trialConversion ? (
              <StatCard
                title="Trial → Paid"
                value={`${trialConversion.conversion_rate.toFixed(1)}%`}
                subtitle={`${trialConversion.converted_count} converted, avg ${trialConversion.avg_days_to_convert}d`}
                trend={{ value: Math.abs(trialConversion.change_percent), isPositive: trialConversion.change_percent >= 0 }}
                accent="secondary"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
            ) : (
              <PlaceholderCard title="Trial → Paid" subtitle="Awaiting backend" />
            )}

            {/* Period Revenue */}
            <StatCard
              title="Period Revenue"
              value={formatKES(data.revenue.this_month)}
              subtitle={data.growth_deltas
                ? `${data.growth_deltas.revenue_change_percent >= 0 ? '+' : ''}${data.growth_deltas.revenue_change_percent.toFixed(1)}% ${data.growth_deltas.comparison_period}`
                : `M-Pesa: ${formatKES(data.revenue.this_month_mpesa)}`}
              trend={data.growth_deltas ? { value: Math.abs(data.growth_deltas.revenue_change_percent), isPositive: data.growth_deltas.revenue_change_percent >= 0 } : undefined}
              accent="success"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            />
          </div>

          {/* Charts Section — 2x2 grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* M-Pesa Transaction Revenue */}
            <ChartCard
              title="M-Pesa Transaction Revenue"
              period={effectiveMpesaPeriod}
              onPeriodChange={(p) => setMpesaChartPeriod(p === globalPeriod ? null : p)}
              showCompare
              compareEnabled={mpesaCompare}
              onCompareToggle={() => setMpesaCompare(!mpesaCompare)}
            >
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={mpesaRevenueData}>
                  <defs>
                    <linearGradient id="mpesaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} tickFormatter={(v) => formatCompact(v)} />
                  <Tooltip {...chartTooltipStyle} formatter={revenueFormatter} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#mpesaGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Subscription Revenue */}
            <ChartCard
              title="Subscription Revenue"
              period={effectiveSubRevPeriod}
              onPeriodChange={(p) => setSubRevChartPeriod(p === globalPeriod ? null : p)}
              showCompare
              compareEnabled={subRevCompare}
              onCompareToggle={() => setSubRevCompare(!subRevCompare)}
              isEmpty={subRevenueData.length === 0}
            >
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={subRevenueCompareData}>
                  <defs>
                    <linearGradient id="subRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} tickFormatter={(v) => formatCompact(v)} />
                  <Tooltip {...chartTooltipStyle} formatter={revenueFormatter} />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#subRevGrad)" strokeWidth={2} />
                  {subRevCompare && (
                    <Area type="monotone" dataKey="prevRevenue" stroke="#6366f1" fill="none" strokeWidth={1.5} strokeDasharray="5 5" opacity={0.4} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Reseller Signups */}
            <ChartCard
              title="Reseller Signups"
              period={effectiveResellerSignupsPeriod}
              onPeriodChange={(p) => setResellerSignupsChartPeriod(p === globalPeriod ? null : p)}
              showCompare
              compareEnabled={resellerSignupsCompare}
              onCompareToggle={() => setResellerSignupsCompare(!resellerSignupsCompare)}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={resellerSignupsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} allowDecimals={false} />
                  <Tooltip {...chartTooltipStyle} formatter={signupsFormatter} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Customer Signups */}
            <ChartCard
              title="Customer Signups"
              period={effectiveCustomerSignupsPeriod}
              onPeriodChange={(p) => setCustomerSignupsChartPeriod(p === globalPeriod ? null : p)}
              showCompare
              compareEnabled={customerSignupsCompare}
              onCompareToggle={() => setCustomerSignupsCompare(!customerSignupsCompare)}
              isEmpty={customerSignupsData.length === 0}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={customerSignupsCompareData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} allowDecimals={false} />
                  <Tooltip {...chartTooltipStyle} formatter={signupsFormatter} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  {customerSignupsCompare && (
                    <Bar dataKey="prevCount" fill="#8b5cf6" opacity={0.25} radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Activation Funnel */}
          {activationFunnel ? (
            <ActivationFunnelSection funnel={activationFunnel} />
          ) : (
            <div className="card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Reseller Activation Funnel</h3>
              <div className="flex items-center justify-center h-[120px] text-foreground-muted text-xs">
                Awaiting backend endpoint
              </div>
            </div>
          )}

          {/* Growth Targets + Revenue Concentration — side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {growthTargets ? (
              <GrowthTargetsSection targets={growthTargets.targets} />
            ) : (
              <div className="card p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Growth Targets</h3>
                <div className="flex items-center justify-center h-[120px] text-foreground-muted text-xs">
                  Awaiting backend endpoint
                </div>
              </div>
            )}

            {revenueConcentration ? (
              <RevenueConcentrationSection data={revenueConcentration} />
            ) : (
              <div className="card p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Revenue Concentration</h3>
                <div className="flex items-center justify-center h-[120px] text-foreground-muted text-xs">
                  Awaiting backend endpoint
                </div>
              </div>
            )}
          </div>

          {/* Subscription Status */}
          {(data.resellers.subscription_active != null || data.resellers.subscription_trial != null) && (
            <div className="card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Subscription Status</h3>
                <Link href="/admin/subscriptions" className="text-xs text-accent-primary hover:underline">View all</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-xs text-foreground-muted mb-0.5">Active</p>
                  <p className="text-lg font-bold text-emerald-500">{data.resellers.subscription_active ?? 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <p className="text-xs text-foreground-muted mb-0.5">Trial</p>
                  <p className="text-lg font-bold text-blue-500">{data.resellers.subscription_trial ?? 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                  <p className="text-xs text-foreground-muted mb-0.5">Suspended</p>
                  <p className="text-lg font-bold text-red-500">{data.resellers.subscription_suspended ?? 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-500/5 border border-gray-500/10">
                  <p className="text-xs text-foreground-muted mb-0.5">Inactive</p>
                  <p className="text-lg font-bold text-gray-400">{data.resellers.subscription_inactive ?? 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* Expiring Soon */}
          {expiring && expiring.total > 0 && (
            <div className="card p-4 sm:p-5 border-amber-500/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-amber-500">
                  {expiring.total} subscription{expiring.total !== 1 ? 's' : ''} expiring in {expiring.days_threshold} days
                </h3>
                <Link href="/admin/subscriptions" className="text-xs text-amber-500 hover:underline">View all</Link>
              </div>
              <div className="space-y-2">
                {expiring.resellers.slice(0, 5).map((r) => (
                  <Link
                    key={r.id}
                    href={`/admin/subscriptions/${r.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-background-tertiary/50 hover:bg-background-tertiary transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.organization_name}</p>
                      <p className="text-xs text-foreground-muted">{r.email}</p>
                    </div>
                    <span className="text-xs font-semibold text-amber-500">
                      {r.days_until_expiry} day{r.days_until_expiry !== 1 ? 's' : ''} left
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Top Resellers This Month */}
          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Top Resellers This Month</h3>
              <Link href="/admin/resellers" className="text-xs text-accent-primary hover:underline">View all</Link>
            </div>

            <div className="hidden md:block">
              <DataTable
                columns={[
                  { key: 'rank', label: '#', className: 'w-[50px]' },
                  { key: 'organization', label: 'Organization' },
                  { key: 'email', label: 'Email' },
                  { key: 'revenue', label: 'Revenue', className: 'text-right' },
                ]}
                data={data.top_resellers_this_month}
                rowKey={(item) => item.id}
                renderCell={(item, col) => {
                  const idx = data.top_resellers_this_month.indexOf(item);
                  switch (col) {
                    case 'rank': return <span className="text-foreground-muted">{idx + 1}</span>;
                    case 'organization': return <span className="font-medium">{item.organization_name}</span>;
                    case 'email': return <span className="text-foreground-muted text-sm">{item.email}</span>;
                    case 'revenue': return <span className="font-semibold text-emerald-500">{formatKES(item.month_revenue)}</span>;
                    default: return null;
                  }
                }}
                onRowClick={(item) => { window.location.href = `/admin/resellers/${item.id}`; }}
                emptyState={{ message: 'No reseller data for this month' }}
              />
            </div>

            <div className="md:hidden space-y-2">
              {data.top_resellers_this_month.map((r, idx) => (
                <MobileDataCard
                  key={r.id}
                  id={r.id}
                  title={r.organization_name}
                  subtitle={r.email}
                  avatar={{ text: `#${idx + 1}`, color: idx === 0 ? 'primary' : idx === 1 ? 'secondary' : 'info' }}
                  value={{ text: formatKES(r.month_revenue) }}
                  layout="compact"
                  href={`/admin/resellers/${r.id}`}
                />
              ))}
              {data.top_resellers_this_month.length === 0 && (
                <p className="text-sm text-foreground-muted text-center py-4">No reseller data for this month</p>
              )}
            </div>
          </div>

          {/* Recent Signups */}
          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Recent Signups</h3>
              {(signupsSummary || data.signups_today != null) && (
                <div className="flex items-center gap-3 text-[10px] text-foreground-muted">
                  <span>Today: <strong className="text-foreground">{signupsSummary?.reseller_signups.today ?? data.signups_today ?? 0}</strong></span>
                  <span>This week: <strong className="text-foreground">{signupsSummary?.reseller_signups.this_week ?? data.signups_this_week ?? 0}</strong></span>
                </div>
              )}
            </div>
            {data.recent_signups.length > 0 ? (
              <div className="space-y-3">
                {data.recent_signups.map((s) => (
                  <Link
                    key={s.id}
                    href={`/admin/resellers/${s.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-background-tertiary/50 hover:bg-background-tertiary transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-accent-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-accent-primary">
                        {s.organization_name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.organization_name}</p>
                      <p className="text-xs text-foreground-muted truncate">{s.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-foreground-muted">{formatSafeDate(s.created_at)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-muted text-center py-4">No recent signups</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
