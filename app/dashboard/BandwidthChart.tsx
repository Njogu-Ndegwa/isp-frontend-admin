'use client';

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
import { BandwidthDataPoint } from '../lib/types';
import { parseUTCToGMT3, formatGMT3Date } from '../lib/dateUtils';

// Helper to parse UTC timestamp and convert to GMT+3 time
// Uses the centralized dateUtils for consistent GMT+3 handling
function parseUTCTimestamp(timestamp: string): Date {
  return parseUTCToGMT3(timestamp);
}

// Custom Tooltip for Bandwidth Chart
function BandwidthTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-background-secondary border border-border rounded-lg p-3 shadow-xl">
      <p className="font-medium text-foreground/90 mb-2 text-sm">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-foreground-muted">
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

// Bandwidth Chart Component using Recharts
export default function BandwidthChart({ data }: { data: BandwidthDataPoint[] }) {
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
            stroke="var(--border)"
            vertical={false}
          />

          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={50}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
            tickFormatter={(value) => `${value.toFixed(1)}`}
            width={45}
          />

          <Tooltip
            content={<BandwidthTooltip />}
            cursor={{ stroke: 'var(--border-hover)', strokeWidth: 1 }}
          />

          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => (
              <span className="text-sm text-foreground-muted">
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
