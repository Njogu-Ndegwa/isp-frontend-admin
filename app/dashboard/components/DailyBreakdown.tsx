'use client';
import React from 'react';
import { DashboardAnalytics, DayDetail } from '../../lib/types';
import { formatTimeGMT3, formatDateOnlyGMT3 } from '../../lib/dateUtils';
import { SectionEmpty } from './SectionCard';

// ---------------------------------------------------------------------------
// Date-helper wrappers (mirrors DashboardClient 1383–1399)
// ---------------------------------------------------------------------------

function convertUTCTimeToLocal(utcTime: string, dateStr?: string): string {
  return formatTimeGMT3(utcTime, dateStr);
}

function formatLocalDate(dateStr: string, options: Intl.DateTimeFormatOptions): string {
  return formatDateOnlyGMT3(dateStr, options);
}

// ---------------------------------------------------------------------------
// EmptyState (mirrors DashboardClient 1930–1940)
// ---------------------------------------------------------------------------

function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricBox (mirrors DashboardClient 1868–1895)
// ---------------------------------------------------------------------------

function MetricBox({
  value,
  label,
  color = 'default',
  prefix = '',
}: {
  value: string | number;
  label: string;
  color?: 'default' | 'emerald' | 'amber';
  prefix?: string;
}) {
  const colorClass: Record<string, string> = {
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

// ---------------------------------------------------------------------------
// DayDetailCard (mirrors DashboardClient 1805–1866)
// ---------------------------------------------------------------------------

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
        <p className="text-[10px] sm:text-xs text-foreground-muted uppercase tracking-wide font-medium mb-2 sm:mb-3">
          Top Spenders
        </p>
        <div className="space-y-2">
          {dayData.topSpenders.slice(0, 3).map((spender, i) => (
            <div key={i} className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg bg-background-tertiary">
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-foreground-muted/10 text-foreground-muted'
                  }`}
                >
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
            <p className="text-base sm:text-lg font-semibold text-foreground">
              {convertUTCTimeToLocal(dayData.firstTransaction, dayData.date)}
            </p>
            <p className="text-[10px] sm:text-xs text-foreground-muted">First Tx</p>
          </div>
          <div className="flex-1 mx-2 sm:mx-4">
            <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500 rounded-full" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-semibold text-foreground">
              {convertUTCTimeToLocal(dayData.lastTransaction, dayData.date)}
            </p>
            <p className="text-[10px] sm:text-xs text-foreground-muted">Last Tx</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DayCard (mirrors DashboardClient 1897–1928)
// ---------------------------------------------------------------------------

function DayCard({
  day,
  isSelected,
  onClick,
}: {
  day: DayDetail;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`day-card text-left ${isSelected ? 'day-card-active' : ''}`}>
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

// ---------------------------------------------------------------------------
// DailyTrendChart (mirrors DashboardClient 1703–1764)
// ---------------------------------------------------------------------------

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
        const percentage = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;

        return (
          <button
            key={day.date}
            onClick={() => onDateSelect(day.date)}
            className={`w-full group flex items-center gap-2 sm:gap-4 p-2.5 sm:p-3 rounded-xl transition-all duration-200 ${
              isSelected ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : 'hover:bg-background-tertiary'
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

// ---------------------------------------------------------------------------
// DailyBreakdown — public export
// ---------------------------------------------------------------------------

export default function DailyBreakdown(props: {
  data: DashboardAnalytics;
  selectedDate: string | null;
  onDateSelect: (d: string) => void;
}): React.JSX.Element {
  const { data, selectedDate, onDateSelect } = props;

  const sortedDayEntries = Object.entries(data.days).sort(([a], [b]) => b.localeCompare(a));
  const selectedDayData = selectedDate ? data.days[selectedDate] ?? null : null;
  const hasDays = sortedDayEntries.length > 0;
  const hasTrend = data.dailyTrend.length > 0;

  return (
    <details className="card min-w-0 group/details">
      {/* Summary row — acts as the collapsible trigger */}
      <summary className="flex items-center justify-between gap-3 p-4 sm:p-5 cursor-pointer list-none select-none">
        <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base min-w-0">
          <span className="w-1.5 h-5 rounded-full flex-shrink-0 bg-orange-500" />
          <span className="truncate">Daily Breakdown</span>
        </h3>
        {/* Chevron — rotates when open */}
        <svg
          className="w-4 h-4 text-foreground-muted flex-shrink-0 transition-transform duration-200 group-open/details:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>

      {/* Body — shown when open */}
      <div className="px-4 pb-5 sm:px-5 space-y-6">
        {/* 1. Daily Revenue Bar List */}
        <section>
          <p className="text-[10px] sm:text-xs text-foreground-muted uppercase tracking-wide font-medium mb-3">
            Daily Revenue
          </p>
          {hasTrend ? (
            <DailyTrendChart
              data={data.dailyTrend}
              onDateSelect={onDateSelect}
              selectedDate={selectedDate}
            />
          ) : (
            <SectionEmpty message="No daily trend data available." />
          )}
        </section>

        {/* 2. Selected-Day Detail Panel */}
        {selectedDayData ? (
          <section className="border-t border-border/50 pt-5">
            <DayDetailCard dayData={selectedDayData} />
          </section>
        ) : (
          <section className="border-t border-border/50 pt-5">
            <EmptyState message="Select a day to view details." />
          </section>
        )}

        {/* 3. Day Grid (Active Days) */}
        <section className="border-t border-border/50 pt-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <span className="w-1.5 h-5 rounded-full bg-orange-500" />
              Day Breakdown
            </h3>
            <span className="text-[10px] sm:text-xs text-foreground-muted">Tap to view</span>
          </div>
          {hasDays ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
              {sortedDayEntries.map(([date, day]) => (
                <DayCard
                  key={date}
                  day={day}
                  isSelected={selectedDate === date}
                  onClick={() => onDateSelect(date)}
                />
              ))}
            </div>
          ) : (
            <SectionEmpty message="No day data available." />
          )}
        </section>
      </div>
    </details>
  );
}
