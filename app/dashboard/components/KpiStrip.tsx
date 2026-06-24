'use client';

import React from 'react';
import StatCard from '../../components/StatCard';
import { SkeletonCard } from '../../components/LoadingSpinner';
import Sparkline from './Sparkline';
import { revenueSeries, transactionSeries, userSeries } from './kpiSeries';
import { CurrencyIcon, TransactionsIcon, UsersIcon, ChartIcon } from './icons';
import type { DashboardAnalytics } from '../../lib/types';

export default function KpiStrip(props: {
  data: DashboardAnalytics | null;
  loading: boolean;
  periodLabel: string;
}): React.JSX.Element {
  const { data, loading, periodLabel } = props;

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!data) {
    return <></>;
  }

  const trend = data.dailyTrend ?? [];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
      {/* Total Revenue */}
      <div style={{ animationDelay: '0.05s' }} className="animate-fade-in opacity-0">
        <div className="relative">
          <StatCard
            title="Total Revenue"
            value={`KES ${data.summary.totalRevenue.toLocaleString()}`}
            subtitle={periodLabel}
            icon={<CurrencyIcon />}
            accent="primary"
            size="large"
          />
          <div className="px-5 pb-3 -mt-1">
            <Sparkline
              values={revenueSeries(trend)}
              color="var(--chart-1)"
              className="w-full mt-2 opacity-70"
            />
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div style={{ animationDelay: '0.1s' }} className="animate-fade-in opacity-0">
        <div className="relative">
          <StatCard
            title="Transactions"
            value={data.summary.totalTransactions}
            subtitle={`${data.averages.dailyTransactions.toFixed(1)} avg/day`}
            icon={<TransactionsIcon />}
            accent="info"
          />
          <div className="px-5 pb-3 -mt-1">
            <Sparkline
              values={transactionSeries(trend)}
              color="var(--chart-2)"
              className="w-full mt-2 opacity-70"
            />
          </div>
        </div>
      </div>

      {/* Unique Customers */}
      <div style={{ animationDelay: '0.15s' }} className="animate-fade-in opacity-0">
        <div className="relative">
          <StatCard
            title="Unique Customers"
            value={data.summary.uniqueCustomers}
            subtitle={`KES ${data.averages.revenuePerCustomer.toFixed(0)} avg spend`}
            icon={<UsersIcon />}
            accent="success"
          />
          <div className="px-5 pb-3 -mt-1">
            <Sparkline
              values={userSeries(trend)}
              color="var(--chart-3)"
              className="w-full mt-2 opacity-70"
            />
          </div>
        </div>
      </div>

      {/* Avg Transaction */}
      <div style={{ animationDelay: '0.2s' }} className="animate-fade-in opacity-0">
        <div className="relative">
          <StatCard
            title="Avg Transaction"
            value={`KES ${data.averages.transactionValue.toFixed(0)}`}
            subtitle={`KES ${data.averages.dailyRevenue.toFixed(0)}/day avg`}
            icon={<ChartIcon />}
            accent="secondary"
          />
          <div className="px-5 pb-3 -mt-1">
            <Sparkline
              values={transactionSeries(trend)}
              color="var(--chart-5)"
              className="w-full mt-2 opacity-70"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
