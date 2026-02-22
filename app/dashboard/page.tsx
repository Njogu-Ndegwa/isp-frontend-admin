'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { DashboardAnalytics, DayDetail, MikroTikMetrics, MikroTikInterface, BandwidthHistory, BandwidthDataPoint, TopUsersResponse } from '../lib/types';
import { parseUTCToGMT3, formatGMT3Date, formatTimeGMT3, formatDateOnlyGMT3 } from '../lib/dateUtils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import { SkeletonCard } from '../components/LoadingSpinner';
import RouterSelector from '../components/RouterSelector';

// Date filter types
type DateFilterPreset = 'today' | 'this_month';
type DateFilter = 
  | { type: 'preset'; preset: DateFilterPreset }
  | { type: 'days'; days: number }
  | { type: 'custom'; startDate: string; endDate: string };

// Date filter options for the selector
const DATE_FILTER_OPTIONS: { filter: DateFilter; label: string }[] = [
  { filter: { type: 'preset', preset: 'today' }, label: 'Today' },
  { filter: { type: 'days', days: 3 }, label: '3D' },
  { filter: { type: 'days', days: 7 }, label: '7D' },
  { filter: { type: 'days', days: 14 }, label: '14D' },
  { filter: { type: 'days', days: 30 }, label: '30D' },
  { filter: { type: 'preset', preset: 'this_month' }, label: 'This Month' },
];

export default function DashboardPage() {
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
  
  // UI state - use DateFilter type for flexibility
  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'preset', preset: 'today' });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Router filter state (default to router 3)
  const [selectedRouterId, setSelectedRouterId] = useState<number | null>(3);
  
  // Custom date range state
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Helper to check if two date filters are equal
  const isFilterEqual = (a: DateFilter, b: DateFilter): boolean => {
    if (a.type !== b.type) return false;
    if (a.type === 'preset' && b.type === 'preset') return a.preset === b.preset;
    if (a.type === 'days' && b.type === 'days') return a.days === b.days;
    if (a.type === 'custom' && b.type === 'custom') {
      return a.startDate === b.startDate && a.endDate === b.endDate;
    }
    return false;
  };

  // Fetch analytics (non-blocking)
  const loadAnalytics = useCallback(async () => {
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
      
      // Add router filter if selected
      if (selectedRouterId) {
        options.routerId = selectedRouterId;
      }
      
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

  // Fetch MikroTik metrics (non-blocking)
  const loadMikrotik = useCallback(async () => {
    try {
      setMikrotikLoading(true);
      setMikrotikError(null);
      const metrics = await api.getMikroTikMetrics(selectedRouterId ?? undefined);
      setMikrotik(metrics);
    } catch (err) {
      setMikrotikError(err instanceof Error ? err.message : 'Failed to load router metrics');
    } finally {
      setMikrotikLoading(false);
    }
  }, [selectedRouterId]);

  // Fetch bandwidth history (non-blocking)
  const loadBandwidth = useCallback(async () => {
    try {
      setBandwidthLoading(true);
      setBandwidthError(null);
      const history = await api.getBandwidthHistory(24, selectedRouterId ?? undefined);
      setBandwidth(history);
    } catch (err) {
      setBandwidthError(err instanceof Error ? err.message : 'Failed to load bandwidth data');
    } finally {
      setBandwidthLoading(false);
    }
  }, [selectedRouterId]);

  // Fetch top users (non-blocking)
  const loadTopUsers = useCallback(async () => {
    try {
      setTopUsersLoading(true);
      setTopUsersError(null);
      const users = await api.getTopUsers(10, selectedRouterId ?? undefined);
      setTopUsers(users);
    } catch (err) {
      setTopUsersError(err instanceof Error ? err.message : 'Failed to load top users');
    } finally {
      setTopUsersLoading(false);
    }
  }, [selectedRouterId]);

  // Load both in parallel on mount and when selectedDays changes
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // MikroTik metrics - auto-refresh every 30 seconds
  useEffect(() => {
    loadMikrotik();
    const interval = setInterval(loadMikrotik, 30000);
    return () => clearInterval(interval);
  }, [loadMikrotik]);

  useEffect(() => {
    loadBandwidth();
    // Auto-refresh bandwidth every 60 seconds
    const interval = setInterval(loadBandwidth, 60000);
    return () => clearInterval(interval);
  }, [loadBandwidth]);

  useEffect(() => {
    loadTopUsers();
    // Auto-refresh top users every 30 seconds
    const interval = setInterval(loadTopUsers, 30000);
    return () => clearInterval(interval);
  }, [loadTopUsers]);

  const refreshAll = () => {
    loadAnalytics();
    loadMikrotik();
    loadBandwidth();
    loadTopUsers();
  };

  const selectedDayData = selectedDate && data?.days[selectedDate];

  // Format period label for display
  const getPeriodLabel = (filter: DateFilter) => {
    if (filter.type === 'preset') {
      if (filter.preset === 'today') return "today";
      if (filter.preset === 'this_month') return "this month";
    }
    if (filter.type === 'days') {
      return `the last ${filter.days} days`;
    }
    if (filter.type === 'custom') {
      return `${filter.startDate} to ${filter.endDate}`;
    }
    return "selected period";
  };
  
  // Handle custom date range submission
  const applyCustomRange = () => {
    if (customStartDate && customEndDate) {
      setDateFilter({ type: 'custom', startDate: customStartDate, endDate: customEndDate });
      setShowCustomRange(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header 
        title="Dashboard" 
        subtitle={`Analytics overview for ${getPeriodLabel(dateFilter)}`}
        action={
          <button 
            onClick={refreshAll} 
            className="btn-secondary flex items-center gap-2"
            disabled={analyticsLoading}
          >
            <svg className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        }
      />

      {/* Filter Bar: Router & Period Selectors */}
      <div className="space-y-3 animate-fade-in">
        {/* Row 1: Router + Period label */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <RouterSelector
            selectedRouterId={selectedRouterId}
            onRouterChange={setSelectedRouterId}
            userId={1}
          />
          <div className="w-px h-6 bg-border hidden sm:block" />
          <span className="text-foreground-muted text-sm hidden sm:inline">Period:</span>
        </div>

        {/* Row 2: Period pills (scrollable on mobile) */}
        <div className="flex gap-1 p-1 bg-background-tertiary rounded-lg overflow-x-auto no-scrollbar">
          {DATE_FILTER_OPTIONS.map(({ filter, label }) => (
            <button
              key={label}
              onClick={() => {
                setDateFilter(filter);
                setShowCustomRange(false);
              }}
              className={`period-pill whitespace-nowrap flex-shrink-0 ${
                isFilterEqual(dateFilter, filter) && !showCustomRange ? 'period-pill-active' : 'period-pill-inactive'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setShowCustomRange(!showCustomRange)}
            className={`period-pill whitespace-nowrap flex-shrink-0 ${
              dateFilter.type === 'custom' || showCustomRange ? 'period-pill-active' : 'period-pill-inactive'
            }`}
          >
            Custom
          </button>
        </div>
        
        {/* Custom Date Range Picker */}
        {showCustomRange && (
          <div className="flex items-center gap-2 p-2 bg-background-tertiary rounded-lg animate-fade-in flex-wrap sm:flex-nowrap">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2 py-1.5 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 flex-1 min-w-0"
            />
            <span className="text-foreground-muted text-sm">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2 py-1.5 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 flex-1 min-w-0"
            />
            <button
              onClick={applyCustomRange}
              disabled={!customStartDate || !customEndDate}
              className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Analytics Section - Key Metrics FIRST */}
      {analyticsError ? (
        <div className="card p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-foreground-muted text-sm mb-4">{analyticsError}</p>
          <button onClick={loadAnalytics} className="btn-primary text-sm">
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Hero Stats Row - MOST IMPORTANT DATA AT THE TOP */}
          {analyticsLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : data ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
              <div style={{ animationDelay: '0.05s' }} className="animate-fade-in opacity-0">
                <StatCard
                  title="Total Revenue"
                  value={`KES ${data.summary.totalRevenue.toLocaleString()}`}
                  subtitle={
                    dateFilter.type === 'preset' 
                      ? dateFilter.preset === 'today' ? 'Today' : 'This month'
                      : dateFilter.type === 'days'
                        ? `${dateFilter.days} day period`
                        : 'Custom range'
                  }
                  icon={<CurrencyIcon />}
                  accent="primary"
                  size="large"
                />
              </div>
              <div style={{ animationDelay: '0.1s' }} className="animate-fade-in opacity-0">
                <StatCard
                  title="Transactions"
                  value={data.summary.totalTransactions}
                  subtitle={`${data.averages.dailyTransactions.toFixed(1)} avg/day`}
                  icon={<TransactionsIcon />}
                  accent="info"
                />
              </div>
              <div style={{ animationDelay: '0.15s' }} className="animate-fade-in opacity-0">
                <StatCard
                  title="Unique Customers"
                  value={data.summary.uniqueCustomers}
                  subtitle={`KES ${data.averages.revenuePerCustomer.toFixed(0)} avg spend`}
                  icon={<UsersIcon />}
                  accent="success"
                />
              </div>
              <div style={{ animationDelay: '0.2s' }} className="animate-fade-in opacity-0">
                <StatCard
                  title="Avg Transaction"
                  value={`KES ${data.averages.transactionValue.toFixed(0)}`}
                  subtitle={`KES ${data.averages.dailyRevenue.toFixed(0)}/day avg`}
                  icon={<ChartIcon />}
                  accent="secondary"
                />
              </div>
            </div>
          ) : null}

        </>
      )}

      {/* Router Health & Top Users - Side by Side, Same Height */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* MikroTik Router Status - Takes 2/3, determines row height */}
        <div className="xl:col-span-2 flex flex-col">
          <MikroTikSection 
            data={mikrotik} 
            loading={mikrotikLoading} 
            error={mikrotikError}
            onRetry={loadMikrotik}
          />
        </div>
        
        {/* Top Users - Takes 1/3, matches MikroTik height with scrollable content */}
        <div className="xl:col-span-1 flex flex-col">
          <TopUsersSection
            data={topUsers}
            loading={topUsersLoading}
            error={topUsersError}
            onRetry={loadTopUsers}
          />
        </div>
      </div>

      {/* Bandwidth History - Full Width Chart */}
      <BandwidthSection
        data={bandwidth}
        loading={bandwidthLoading}
        error={bandwidthError}
        onRetry={loadBandwidth}
      />

      {/* Analytics Charts Section */}
      {!analyticsError && !analyticsLoading && data && (
        <>
          {/* Revenue & Plan Performance Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Trend - 2/3 width */}
            <div className="lg:col-span-2 card p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.25s', opacity: 0 }}>
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
                  <span className="w-1.5 h-5 rounded-full bg-amber-500" />
                  Daily Revenue
                </h3>
                <span className="text-[10px] sm:text-xs text-foreground-muted">
                  {data.dailyTrend.length} days
                </span>
              </div>
              {data.dailyTrend.length === 0 ? (
                <EmptyState message="No transactions in this period" />
              ) : (
                <DailyTrendChart 
                  data={data.dailyTrend} 
                  onDateSelect={setSelectedDate} 
                  selectedDate={selectedDate} 
                />
              )}
            </div>

            {/* Plan Performance - 1/3 width */}
            <div className="card p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.3s', opacity: 0 }}>
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
                  <span className="w-1.5 h-5 rounded-full bg-emerald-500" />
                  Plan Performance
                </h3>
              </div>
              {data.planPerformance.length === 0 ? (
                <EmptyState message="No plan data available" />
              ) : (
                <PlanPerformanceList 
                  plans={data.planPerformance} 
                  totalRevenue={data.summary.totalRevenue} 
                />
              )}
            </div>
          </div>

          {/* Selected Day Detail - Only show if selected */}
          {selectedDayData && (
            <div className="card p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.35s', opacity: 0 }}>
              <DayDetailCard dayData={selectedDayData} />
            </div>
          )}

          {/* Active Days Grid */}
          <div className="animate-fade-in" style={{ animationDelay: '0.4s', opacity: 0 }}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
                <span className="w-1.5 h-5 rounded-full bg-orange-500" />
                Day Breakdown
              </h3>
              <span className="text-[10px] sm:text-xs text-foreground-muted">
                Tap to view
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
              {Object.entries(data.days)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, day]) => (
                  <DayCard
                    key={date}
                    day={day}
                    isSelected={selectedDate === date}
                    onClick={() => setSelectedDate(date)}
                  />
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Radial Gauge Component for CPU/Memory
function RadialGauge({ 
  value, 
  label, 
  icon,
  size = 110,
  thresholds = { warning: 60, danger: 80 },
  subtitle
}: { 
  value: number; 
  label: string; 
  icon: React.ReactNode;
  size?: number;
  thresholds?: { warning: number; danger: number };
  subtitle?: string;
}) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 8;
  const normalizedValue = Math.min(100, Math.max(0, value));
  const offset = circumference - (normalizedValue / 100) * circumference;
  
  // Determine color based on thresholds
  const getColor = () => {
    if (normalizedValue >= thresholds.danger) return { stroke: '#ef4444', text: 'text-red-500', bg: 'from-red-500/20 to-red-500/5' };
    if (normalizedValue >= thresholds.warning) return { stroke: '#f59e0b', text: 'text-amber-500', bg: 'from-amber-500/20 to-amber-500/5' };
    return { stroke: '#10b981', text: 'text-emerald-500', bg: 'from-emerald-500/20 to-emerald-500/5' };
  };
  
  const color = getColor();
  const riskLevel = normalizedValue >= thresholds.danger ? 'Critical' : 
                    normalizedValue >= thresholds.warning ? 'Warning' : 'Normal';

  return (
    <div className={`relative flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-gradient-to-b ${color.bg}`}>
      <div className="relative w-[90px] h-[90px] sm:w-[110px] sm:h-[110px]" style={{ maxWidth: size, maxHeight: size }}>
        {/* Background circle */}
        <svg className="absolute inset-0 -rotate-90 w-full h-full" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-background-tertiary"
          />
          {/* Risk zone indicators */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`mb-0.5 sm:mb-1 ${color.text}`}>{icon}</div>
          <span className={`text-lg sm:text-2xl font-bold stat-value ${color.text}`}>
            {normalizedValue.toFixed(0)}%
          </span>
          <span className={`text-[9px] sm:text-[10px] font-medium ${color.text}`}>{riskLevel}</span>
        </div>
      </div>
      
      <div className="mt-1.5 sm:mt-2 text-center">
        <p className="text-xs sm:text-sm font-medium text-foreground">{label}</p>
        {subtitle && <p className="text-[9px] sm:text-[10px] text-foreground-muted mt-0.5 truncate max-w-full">{subtitle}</p>}
      </div>
    </div>
  );
}

// Bandwidth Speedometer Component
function BandwidthSpeedometer({ 
  download, 
  upload,
  maxSpeed = 100 
}: { 
  download: number; 
  upload: number;
  maxSpeed?: number;
}) {
  const downloadPercent = Math.min((download / maxSpeed) * 100, 100);
  const uploadPercent = Math.min((upload / maxSpeed) * 100, 100);
  
  return (
    <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-background-tertiary to-background">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <span className="text-[10px] sm:text-xs text-foreground-muted uppercase tracking-wide font-medium">Live Bandwidth</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>
      
      <div className="space-y-3 sm:space-y-4">
        {/* Download */}
        <div>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <span className="text-xs sm:text-sm text-foreground-muted">Download</span>
            </div>
            <span className="text-lg sm:text-xl font-bold text-cyan-500 stat-value">
              {download.toFixed(2)} <span className="text-[10px] sm:text-xs font-normal">Mbps</span>
            </span>
          </div>
          <div className="h-3 bg-background rounded-full overflow-hidden relative">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500 relative"
              style={{ width: `${downloadPercent}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
        
        {/* Upload */}
        <div>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <span className="text-xs sm:text-sm text-foreground-muted">Upload</span>
            </div>
            <span className="text-lg sm:text-xl font-bold text-emerald-500 stat-value">
              {upload.toFixed(2)} <span className="text-[10px] sm:text-xs font-normal">Mbps</span>
            </span>
          </div>
          <div className="h-3 bg-background rounded-full overflow-hidden relative">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 relative"
              style={{ width: `${uploadPercent}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Combined total */}
      <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-border/30 flex items-center justify-between">
        <span className="text-[10px] sm:text-xs text-foreground-muted">Total Throughput</span>
        <span className="text-xs sm:text-sm font-semibold text-foreground">
          {(download + upload).toFixed(2)} Mbps
        </span>
      </div>
    </div>
  );
}

// MikroTik Section Component - Redesigned with Radial Gauges
function MikroTikSection({ 
  data, 
  loading, 
  error,
  onRetry 
}: { 
  data: MikroTikMetrics | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className="card p-5 border-red-500/30 animate-fade-in flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <RouterIcon className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">Router Status</p>
              <p className="text-xs text-red-400">{error}</p>
            </div>
          </div>
          <button onClick={onRetry} className="btn-ghost text-xs">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="card p-5 animate-fade-in flex-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl skeleton" />
          <div>
            <div className="w-24 h-4 skeleton mb-1" />
            <div className="w-32 h-3 skeleton" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 rounded-lg bg-background-tertiary">
              <div className="w-16 h-3 skeleton mb-2" />
              <div className="w-12 h-5 skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Safe access with defaults for all nested properties
  const cpuLoad = data.cpuLoadPercent ?? 0;
  const memory = data.memory ?? { usedPercent: 0, usedBytes: 0, totalBytes: 0 };
  const storage = data.storage ?? { usedPercent: 0, usedBytes: 0, totalBytes: 0 };
  const system = data.system ?? { boardName: 'Unknown', platform: 'Unknown', version: '0', uptime: 'N/A' };
  const interfaces = data.interfaces ?? [];
  const activeUsers = data.activeSessionCount ?? 0;
  const uptime = data.uptime || system.uptime || 'N/A';
  const routerName = data.routerName || system.boardName || 'Router';
  const bandwidth = data.bandwidth ?? { downloadMbps: 0, uploadMbps: 0 };
  
  return (
    <div className="card p-4 sm:p-5 animate-fade-in flex-1">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <RouterIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground text-sm sm:text-base">{routerName}</p>
              <span className="badge badge-success text-[10px]">Online</span>
              {data.cached && <span className="badge bg-blue-500/20 text-blue-400 text-[10px]">Cached</span>}
              {loading && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
            </div>
            <p className="text-[10px] sm:text-xs text-foreground-muted truncate">
              {system.boardName} • {system.platform || 'Unknown'} {system.version ? `v${system.version}` : ''} • Up: {uptime}
            </p>
          </div>
        </div>
        {data.generatedAt && (
          <div className="text-right hidden sm:block flex-shrink-0">
            <p className="text-xs text-foreground-muted">Last updated</p>
            <p className="text-xs text-foreground-muted" suppressHydrationWarning>
              {formatGMT3Date(parseUTCTimestamp(data.generatedAt), { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        )}
      </div>

      {/* Main Metrics Grid - Radial Gauges + Bandwidth */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-5">
        {/* CPU Gauge */}
        <RadialGauge 
          value={cpuLoad}
          label="CPU Load"
          icon={<CpuIcon className="w-5 h-5" />}
          thresholds={{ warning: 50, danger: 80 }}
        />
        
        {/* Memory Gauge */}
        <RadialGauge 
          value={memory.usedPercent ?? 0}
          label="Memory"
          icon={<MemoryIcon className="w-5 h-5" />}
          thresholds={{ warning: 60, danger: 80 }}
          subtitle={`${formatBytes(memory.usedBytes ?? 0)} / ${formatBytes(memory.totalBytes ?? 0)}`}
        />
        
        {/* Storage Gauge */}
        <RadialGauge 
          value={storage.usedPercent ?? 0}
          label="Storage"
          icon={<StorageIcon className="w-5 h-5" />}
          thresholds={{ warning: 70, danger: 90 }}
          subtitle={`${formatBytes(storage.usedBytes ?? 0)} / ${formatBytes(storage.totalBytes ?? 0)}`}
        />
        
        {/* Active Users Card */}
        <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-500/20 to-amber-500/5 flex flex-col items-center justify-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-2 sm:mb-3">
            <UsersIcon className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-amber-500 stat-value">{activeUsers}</span>
          <span className="text-xs sm:text-sm font-medium text-foreground mt-1">Active Users</span>
          <span className="text-[9px] sm:text-[10px] text-foreground-muted">Currently online</span>
        </div>
      </div>

      {/* Bandwidth Speedometer */}
      <BandwidthSpeedometer 
        download={bandwidth.downloadMbps ?? 0}
        upload={bandwidth.uploadMbps ?? 0}
        maxSpeed={100}
      />

      {/* Interfaces - Collapsible for cleaner look */}
      {interfaces.length > 0 && (
        <details className="mt-5 group">
          <summary className="cursor-pointer text-xs text-foreground-muted uppercase tracking-wide mb-3 flex items-center gap-2 hover:text-foreground transition-colors">
            <span className="w-4 h-4 rounded bg-background-tertiary flex items-center justify-center group-open:rotate-90 transition-transform">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
            Network Interfaces ({interfaces.filter(i => i?.type !== 'loopback').length})
          </summary>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 animate-fade-in">
            {interfaces.filter(iface => iface?.type !== 'loopback').map((iface) => (
              iface && <InterfaceCard key={iface.name || Math.random()} iface={iface} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// Bandwidth Section Component
function BandwidthSection({
  data,
  loading,
  error,
  onRetry
}: {
  data: BandwidthHistory | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className="card p-5 border-red-500/30 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <BandwidthIcon className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">Bandwidth History</p>
              <p className="text-xs text-red-400">{error}</p>
            </div>
          </div>
          <button onClick={onRetry} className="btn-ghost text-xs">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="card p-5 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl skeleton" />
          <div>
            <div className="w-32 h-4 skeleton mb-1" />
            <div className="w-24 h-3 skeleton" />
          </div>
        </div>
        <div className="h-48 skeleton rounded-lg" />
      </div>
    );
  }

  if (!data || data.history.length === 0) {
    return (
      <div className="card p-5 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <BandwidthIcon className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Bandwidth History</p>
            <p className="text-xs text-foreground-muted">Last 24 hours</p>
          </div>
        </div>
        <div className="text-center py-8 text-foreground-muted">
          <p className="text-sm">No bandwidth data available yet</p>
        </div>
      </div>
    );
  }

  // Calculate stats from the data (using average values which have more meaningful data)
  const latestPoint = data.history[data.history.length - 1];
  const maxDownload = Math.max(...data.history.map(d => d.avgDownloadMbps ?? 0));
  const maxUpload = Math.max(...data.history.map(d => d.avgUploadMbps ?? 0));
  const avgDownload = data.history.reduce((sum, d) => sum + (d.avgDownloadMbps ?? 0), 0) / data.history.length;
  const avgUpload = data.history.reduce((sum, d) => sum + (d.avgUploadMbps ?? 0), 0) / data.history.length;

  return (
    <div className="card p-4 sm:p-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-5 gap-2 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
            <BandwidthIcon className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground text-sm sm:text-base">Bandwidth History</p>
              {loading && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
            </div>
            <p className="text-[10px] sm:text-xs text-foreground-muted">
              Last {data.periodHours}h • {data.count} points
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 ml-12 sm:ml-0">
          <div className="sm:text-right">
            <p className="text-[10px] sm:text-xs text-foreground-muted">Current Avg</p>
            <p className="text-xs sm:text-sm font-semibold">
              <span className="text-cyan-500">↓{(latestPoint.avgDownloadMbps ?? 0).toFixed(2)}</span>
              <span className="text-foreground-muted mx-1">/</span>
              <span className="text-emerald-500">↑{(latestPoint.avgUploadMbps ?? 0).toFixed(2)}</span>
              <span className="text-foreground-muted text-[10px] sm:text-xs ml-1">Mbps</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
        <div className="p-2.5 sm:p-3 rounded-lg bg-background-tertiary">
          <p className="text-[9px] sm:text-[10px] text-foreground-muted uppercase tracking-wide">Peak Down</p>
          <p className="text-base sm:text-lg font-bold text-cyan-500 stat-value">{maxDownload.toFixed(2)} <span className="text-[10px] sm:text-xs font-normal">Mbps</span></p>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg bg-background-tertiary">
          <p className="text-[9px] sm:text-[10px] text-foreground-muted uppercase tracking-wide">Peak Up</p>
          <p className="text-base sm:text-lg font-bold text-emerald-500 stat-value">{maxUpload.toFixed(2)} <span className="text-[10px] sm:text-xs font-normal">Mbps</span></p>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg bg-background-tertiary">
          <p className="text-[9px] sm:text-[10px] text-foreground-muted uppercase tracking-wide">Avg Down</p>
          <p className="text-base sm:text-lg font-bold text-foreground stat-value">{avgDownload.toFixed(2)} <span className="text-[10px] sm:text-xs font-normal">Mbps</span></p>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg bg-background-tertiary">
          <p className="text-[9px] sm:text-[10px] text-foreground-muted uppercase tracking-wide">Avg Up</p>
          <p className="text-base sm:text-lg font-bold text-foreground stat-value">{avgUpload.toFixed(2)} <span className="text-[10px] sm:text-xs font-normal">Mbps</span></p>
        </div>
      </div>

      {/* Chart */}
      <BandwidthChart data={data.history} />
    </div>
  );
}

// Helper to parse UTC timestamp and convert to GMT+3 time
// Uses the centralized dateUtils for consistent GMT+3 handling
function parseUTCTimestamp(timestamp: string): Date {
  return parseUTCToGMT3(timestamp);
}

// Helper to convert UTC time string (HH:MM:SS or HH:MM) to GMT+3 local time
// Uses the centralized dateUtils for consistent GMT+3 handling
function convertUTCTimeToLocal(utcTime: string, dateStr?: string): string {
  return formatTimeGMT3(utcTime, dateStr);
}

// Helper to format date with GMT+3 timezone awareness
// Uses the centralized dateUtils for consistent GMT+3 handling
function formatLocalDate(dateStr: string, options: Intl.DateTimeFormatOptions): string {
  return formatDateOnlyGMT3(dateStr, options);
}

// Custom Tooltip for Bandwidth Chart
function BandwidthTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-[#1a1a1f] border border-[#2a2a35] rounded-lg p-3 shadow-xl">
      <p className="font-medium text-white/90 mb-2 text-sm">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-white/70">
            {entry.dataKey === 'avgDownloadMbps' ? 'Avg Download' : 'Avg Upload'}:
          </span>
          <span className="font-semibold" style={{ color: entry.color }}>
            {(entry.value ?? 0).toFixed(2)} Mbps
          </span>
        </div>
      ))}
    </div>
  );
}

// Top Users Section Component
function TopUsersSection({
  data,
  loading,
  error,
  onRetry
}: {
  data: TopUsersResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  // Format rate to Kbps or Mbps
  const formatRate = (bps: number) => {
    if (bps === 0) return '-';
    const kbps = bps / 1000;
    if (kbps < 1000) return `${kbps.toFixed(0)}K`;
    return `${(kbps / 1000).toFixed(1)}M`;
  };

  // Format MB to appropriate unit
  const formatUsage = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
  };

  if (error) {
    return (
      <div className="card p-4 border-red-500/30 animate-fade-in flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <TopUsersIcon className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Top Downloaders</p>
              <p className="text-xs text-red-400">{error}</p>
            </div>
          </div>
          <button onClick={onRetry} className="btn-ghost text-xs">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="card p-4 animate-fade-in flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg skeleton" />
          <div className="w-32 h-4 skeleton" />
        </div>
        <div className="flex-1 skeleton rounded-lg" />
      </div>
    );
  }

  if (!data || data.topUsers.length === 0) {
    return (
      <div className="card p-4 animate-fade-in flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <TopUsersIcon className="w-4 h-4 text-violet-500" />
          </div>
          <p className="font-semibold text-foreground text-sm">Top Downloaders</p>
        </div>
        <p className="text-sm text-foreground-muted text-center flex-1 flex items-center justify-center">No active users</p>
      </div>
    );
  }

  const maxDownload = Math.max(...data.topUsers.map(u => u.downloadMB));

  return (
    <div className="card p-4 animate-fade-in flex-1 flex flex-col">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <TopUsersIcon className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground text-sm">Top Downloaders</p>
              {loading && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
            </div>
          </div>
        </div>
        <span className="text-[10px] text-foreground-muted" suppressHydrationWarning>
          {data.totalQueues} queues
        </span>
      </div>

      {/* Compact Table - Scrollable content, scrollbar on left */}
      <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0" style={{ direction: 'rtl' }}>
        <table className="w-full text-xs" style={{ direction: 'ltr' }}>
          <thead>
            <tr className="text-foreground-muted text-[10px] uppercase tracking-wider">
              <th className="text-left pb-2 font-medium">#</th>
              <th className="text-left pb-2 font-medium">User</th>
              <th className="text-right pb-2 font-medium">↓ Down</th>
              <th className="text-right pb-2 font-medium hidden sm:table-cell">↑ Up</th>
              <th className="text-right pb-2 font-medium hidden lg:table-cell">Total</th>
              <th className="text-right pb-2 font-medium hidden sm:table-cell">Speed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {data.topUsers.map((user, index) => {
              const [uploadRate, downloadRate] = (user.currentRate || '0/0').split('/').map(Number);
              const isActive = downloadRate > 0 || uploadRate > 0;
              const downloadPercent = (user.downloadMB / maxDownload) * 100;
              const rank = index + 1;

              return (
                <tr 
                  key={user.mac} 
                  className={`${isActive ? 'bg-emerald-500/5' : ''} hover:bg-background-tertiary/50 transition-colors`}
                >
                  {/* Rank */}
                  <td className="py-2 pr-1.5 sm:pr-2">
                    <span className={`font-bold ${
                      rank === 1 ? 'text-amber-500' :
                      rank === 2 ? 'text-zinc-400' :
                      rank === 3 ? 'text-orange-600' :
                      'text-foreground-muted'
                    }`}>
                      {rank}
                    </span>
                  </td>
                  
                  {/* User Info */}
                  <td className="py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-foreground text-[11px] sm:text-xs">{user.customerPhone}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" title="Active" />
                      )}
                    </div>
                    {/* Mini progress bar */}
                    <div className="w-16 sm:w-20 h-1 bg-background-tertiary rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
                        style={{ width: `${downloadPercent}%` }}
                      />
                    </div>
                  </td>
                  
                  {/* Download */}
                  <td className="py-2 text-right text-cyan-500 font-medium">
                    {formatUsage(user.downloadMB)}
                  </td>
                  
                  {/* Upload - hidden on small screens */}
                  <td className="py-2 text-right text-emerald-500 font-medium hidden sm:table-cell">
                    {formatUsage(user.uploadMB)}
                  </td>
                  
                  {/* Total - hidden on small/medium */}
                  <td className="py-2 text-right font-semibold text-foreground hidden lg:table-cell">
                    {formatUsage(user.totalMB)}
                  </td>
                  
                  {/* Current Speed - hidden on small screens */}
                  <td className="py-2 text-right hidden sm:table-cell">
                    {isActive ? (
                      <span className="text-emerald-500">
                        {formatRate(downloadRate)}/s
                      </span>
                    ) : (
                      <span className="text-foreground-muted">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Top Users Icon
function TopUsersIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

// Bandwidth Chart Component using Recharts
function BandwidthChart({ data }: { data: BandwidthDataPoint[] }) {
  // Take last 60 points or all if less
  const displayData = data.slice(-60).map(point => ({
    ...point,
    time: formatGMT3Date(parseUTCTimestamp(point.timestamp), { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true,
    }),
  }));
  
  if (displayData.length === 0) return null;

  return (
    <div className="h-48 sm:h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={displayData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="downloadGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#ffffff10" 
            vertical={false}
          />
          
          <XAxis 
            dataKey="time" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#888', fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#888', fontSize: 11 }}
            tickFormatter={(value) => `${value.toFixed(1)}`}
            width={45}
          />
          
          <Tooltip 
            content={<BandwidthTooltip />}
            cursor={{ stroke: '#ffffff30', strokeWidth: 1 }}
          />
          
          <Legend 
            verticalAlign="top"
            height={36}
            formatter={(value) => (
              <span className="text-sm text-white/70">
                {value === 'avgDownloadMbps' ? 'Avg Download' : 'Avg Upload'}
              </span>
            )}
          />
          
          <Area
            type="monotone"
            dataKey="avgDownloadMbps"
            stroke="#06b6d4"
            strokeWidth={2}
            fill="url(#downloadGradient)"
            dot={false}
            activeDot={{ r: 5, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }}
          />
          
          <Area
            type="monotone"
            dataKey="avgUploadMbps"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#uploadGradient)"
            dot={false}
            activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Bandwidth Icon
function BandwidthIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

// Interface Card
function InterfaceCard({ iface }: { iface: MikroTikInterface }) {
  const isActive = iface.running && !iface.disabled;
  const typeIcons: Record<string, string> = {
    'ether': '🔌',
    'wlan': '📶',
    'bridge': '🌉',
    'wg': '🔒',
  };

  return (
    <div className={`p-3 rounded-lg border ${
      isActive 
        ? 'bg-emerald-500/5 border-emerald-500/20' 
        : 'bg-background-tertiary border-transparent'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm">{typeIcons[iface.type] || '📡'}</span>
        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-foreground-muted/30'}`} />
      </div>
      <p className="font-medium text-xs text-foreground truncate">{iface.name}</p>
      {isActive && (iface.rx_byte > 0 || iface.tx_byte > 0) && (
        <div className="mt-1.5 text-[10px] text-foreground-muted space-y-0.5">
          <p>↓ {formatBytes(iface.rx_byte)}</p>
          <p>↑ {formatBytes(iface.tx_byte)}</p>
        </div>
      )}
    </div>
  );
}

// Format bytes helper
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}


// Daily trend bar chart
function DailyTrendChart({
  data,
  onDateSelect,
  selectedDate,
}: {
  data: { date: string; label: string; transactions: number; revenue: number; users: number }[];
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
}) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue));

  return (
    <div className="space-y-2">
      {data.map((day) => {
        const isSelected = selectedDate === day.date;
        const percentage = (day.revenue / maxRevenue) * 100;
        
        return (
          <button
            key={day.date}
            onClick={() => onDateSelect(day.date)}
            className={`w-full group flex items-center gap-2 sm:gap-4 p-2.5 sm:p-3 rounded-xl transition-all duration-200 ${
              isSelected
                ? 'bg-amber-500/10 ring-1 ring-amber-500/30'
                : 'hover:bg-background-tertiary'
            }`}
          >
            <div className="w-14 sm:w-20 text-left flex-shrink-0">
              <p className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-amber-500' : 'text-foreground'}`}>
                {formatLocalDate(day.date, { weekday: 'short' })}
              </p>
              <p className="text-[10px] sm:text-xs text-foreground-muted">
                {formatLocalDate(day.date, { month: 'short', day: 'numeric' })}
              </p>
            </div>
            
            <div className="flex-1 h-6 sm:h-8 bg-background-tertiary rounded-lg overflow-hidden min-w-0">
              <div
                className={`h-full rounded-lg transition-all duration-500 ${
                  isSelected 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                    : 'bg-gradient-to-r from-amber-500/60 to-orange-500/60 group-hover:from-amber-500/80 group-hover:to-orange-500/80'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            
            <div className="w-20 sm:w-28 text-right flex-shrink-0">
              <p className={`font-semibold stat-value text-xs sm:text-base ${isSelected ? 'text-amber-500' : 'text-foreground'}`}>
                KES {day.revenue.toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs text-foreground-muted">
                {day.transactions} tx · {day.users}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Plan performance list
function PlanPerformanceList({ plans, totalRevenue }: { plans: { name: string; count: number; revenue: number }[]; totalRevenue: number }) {
  const colors = ['bg-amber-500', 'bg-orange-500', 'bg-yellow-500', 'bg-red-500', 'bg-pink-500'];
  
  return (
    <div className="space-y-4">
      {plans.map((plan, i) => {
        const percentage = (plan.revenue / totalRevenue) * 100;
        
        return (
          <div key={i} className="group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full ${colors[i % colors.length]} flex-shrink-0`} />
                <span className="font-medium text-sm text-foreground truncate">{plan.name}</span>
              </div>
              <span className="font-semibold text-sm text-amber-500 stat-value ml-2 flex-shrink-0">
                KES {plan.revenue.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-background-tertiary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${colors[i % colors.length]}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs text-foreground-muted w-16 text-right">
                {plan.count} sales
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}


// Day detail card
function DayDetailCard({ dayData }: { dayData: DayDetail }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-5 gap-3">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-foreground-muted uppercase tracking-wide font-medium">Selected Day</p>
          <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{dayData.dateLabel}</h3>
        </div>
        <span className="text-xl sm:text-2xl font-bold text-amber-500 stat-value flex-shrink-0">
          KES {dayData.totalRevenue.toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
        <MetricBox value={dayData.totalTransactions} label="Tx" />
        <MetricBox value={dayData.uniqueUsers} label="Users" color="emerald" />
        <MetricBox value={`${dayData.repeatCustomerPercent.toFixed(0)}%`} label="Repeat" color="amber" />
        <MetricBox value={`${dayData.avgDailySpendPerUser.toFixed(0)}`} label="Avg" prefix="KES" />
      </div>

      {/* Top Spenders */}
      <div className="mb-4 sm:mb-5">
        <p className="text-[10px] sm:text-xs text-foreground-muted uppercase tracking-wide font-medium mb-2 sm:mb-3">Top Spenders</p>
        <div className="space-y-2">
          {dayData.topSpenders.slice(0, 3).map((spender, i) => (
            <div key={i} className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg bg-background-tertiary">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-foreground-muted/10 text-foreground-muted'
                }`}>
                  {i + 1}
                </span>
                <span className="font-mono text-xs sm:text-sm text-foreground">****{spender.phone}</span>
              </div>
              <span className="font-semibold text-xs sm:text-sm text-amber-500 stat-value">
                KES {spender.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="p-2.5 sm:p-3 rounded-lg bg-background-tertiary">
        <div className="flex items-center justify-between text-center">
          <div>
            <p className="text-base sm:text-lg font-semibold text-foreground">{convertUTCTimeToLocal(dayData.firstTransaction, dayData.date)}</p>
            <p className="text-[10px] sm:text-xs text-foreground-muted">First Tx</p>
          </div>
          <div className="flex-1 mx-2 sm:mx-4">
            <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500 rounded-full" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-semibold text-foreground">{convertUTCTimeToLocal(dayData.lastTransaction, dayData.date)}</p>
            <p className="text-[10px] sm:text-xs text-foreground-muted">Last Tx</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric box component
function MetricBox({ 
  value, 
  label, 
  color = 'default',
  prefix = ''
}: { 
  value: string | number; 
  label: string; 
  color?: 'default' | 'emerald' | 'amber';
  prefix?: string;
}) {
  const colorClass = {
    default: 'text-foreground',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
  };

  return (
    <div className="text-center p-2 sm:p-2.5 rounded-lg bg-background-tertiary">
      <p className={`text-base sm:text-lg font-bold stat-value ${colorClass[color]}`}>
        {prefix && <span className="text-[10px] sm:text-xs font-normal">{prefix} </span>}
        {value}
      </p>
      <p className="text-[9px] sm:text-[10px] text-foreground-muted uppercase tracking-wide">{label}</p>
    </div>
  );
}

// Day card component
function DayCard({ 
  day, 
  isSelected, 
  onClick 
}: { 
  day: DayDetail; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`day-card text-left ${isSelected ? 'day-card-active' : ''}`}
    >
      <p className={`font-medium text-xs sm:text-sm ${isSelected ? 'text-amber-500' : 'text-foreground'}`}>
        {formatLocalDate(day.date, { weekday: 'short', month: 'short', day: 'numeric' })}
      </p>
      <div className="flex items-baseline justify-between mt-1.5 sm:mt-2">
        <span className="text-[10px] sm:text-xs text-foreground-muted">{day.totalTransactions} tx</span>
        <span className={`font-semibold text-xs sm:text-sm stat-value ${isSelected ? 'text-amber-500' : 'text-foreground'}`}>
          KES {day.totalRevenue.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 mt-1.5 sm:mt-2">
        <span className="text-[9px] sm:text-[10px] text-foreground-muted">{day.uniqueUsers} users</span>
        <span className="text-[9px] sm:text-[10px] text-foreground-muted">·</span>
        <span className="text-[9px] sm:text-[10px] text-foreground-muted">{day.repeatCustomerPercent.toFixed(0)}%</span>
      </div>
    </button>
  );
}

// Empty state component
function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// Icon components
function CurrencyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TransactionsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function UsersIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function RouterIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  );
}

function CpuIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  );
}

function MemoryIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function StorageIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );
}
