'use client';

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ComposedChart, Line,
} from 'recharts';
import {
  formatReporting, formatReportingAxis, type ReportingCurrency,
} from '../lib/reportingCurrency';

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

// Series values are KES; the reporting mode decides how they are shown.
const revenueFormatter = (mode: ReportingCurrency, usdRate?: number) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (value: any) => [formatReporting(Number(value) || 0, mode, usdRate), 'Revenue'];
const subscriptionRevenueFormatter = (mode: ReportingCurrency, usdRate?: number) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (value: any, name: any) => {
    const labels: Record<string, string> = {
      revenue: 'Collected',
      cumulativeRevenue: 'Total collected',
      prevCumulativeRevenue: 'Previous total',
    };
    return [formatReporting(Number(value) || 0, mode, usdRate), labels[String(name)] ?? String(name)];
  };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const signupsFormatter = (value: any) => [value ?? 0, 'Signups'];

export function MpesaRevenueChart({
  data,
  currencyMode = 'KES',
  usdRate,
}: {
  data: { name: string; revenue: number; mpesa: number }[];
  currencyMode?: ReportingCurrency;
  usdRate?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="mpesaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} tickFormatter={(v) => formatReportingAxis(Number(v), currencyMode, usdRate)} />
        <Tooltip {...chartTooltipStyle} formatter={revenueFormatter(currencyMode, usdRate)} />
        <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#mpesaGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SubscriptionRevenueChart({
  data,
  showCompare,
  currencyMode = 'KES',
  usdRate,
}: {
  data: { name: string; revenue: number; cumulativeRevenue: number; prevCumulativeRevenue?: number }[];
  showCompare: boolean;
  currencyMode?: ReportingCurrency;
  usdRate?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data}>
        <defs>
          <linearGradient id="subRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} tickFormatter={(v) => formatReportingAxis(Number(v), currencyMode, usdRate)} />
        <Tooltip {...chartTooltipStyle} formatter={subscriptionRevenueFormatter(currencyMode, usdRate)} />
        <Bar dataKey="revenue" fill="#818cf8" opacity={0.35} radius={[3, 3, 0, 0]} />
        <Area type="monotone" dataKey="cumulativeRevenue" stroke="#6366f1" fill="url(#subRevGrad)" strokeWidth={2.5} />
        {showCompare && (
          <Line type="monotone" dataKey="prevCumulativeRevenue" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="5 5" dot={false} opacity={0.55} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function ResellerSignupsChart({
  data,
}: {
  data: { name: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} allowDecimals={false} />
        <Tooltip {...chartTooltipStyle} formatter={signupsFormatter} />
        <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CustomerSignupsChart({
  data,
  showCompare,
}: {
  data: { name: string; count: number; prevCount?: number }[];
  showCompare: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--color-foreground-muted)' }} allowDecimals={false} />
        <Tooltip {...chartTooltipStyle} formatter={signupsFormatter} />
        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        {showCompare && (
          <Bar dataKey="prevCount" fill="#8b5cf6" opacity={0.25} radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
