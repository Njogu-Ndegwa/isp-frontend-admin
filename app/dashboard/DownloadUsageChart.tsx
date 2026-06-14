'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BandwidthDataPoint } from '../lib/types';
import { parseUTCToGMT3, formatGMT3Date } from '../lib/dateUtils';

export type DownloadUsageServiceFilter = 'all' | 'hotspot' | 'pppoe';

type ChartPoint = {
  time: string;
  tooltipTime: string;
  hotspotDownloadMB: number;
  pppoeDownloadMB: number;
  totalDownloadMB: number;
};

type TooltipPayloadEntry = {
  value?: number;
  dataKey?: string;
  color?: string;
  fill?: string;
  stroke?: string;
  payload?: ChartPoint;
};

function formatUsageMb(mb: number): string {
  if (!Number.isFinite(mb) || mb <= 0) return '0 MB';
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

function formatAxisMb(mb: number): string {
  if (!Number.isFinite(mb) || mb <= 0) return '0';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)}G`;
  return `${mb.toFixed(0)}M`;
}

function labelForKey(dataKey: string | undefined): string {
  switch (dataKey) {
    case 'hotspotDownloadMB':
      return 'Hotspot';
    case 'pppoeDownloadMB':
      return 'PPPoE';
    case 'totalDownloadMB':
      return 'Total';
    default:
      return 'Download';
  }
}

function bucketDownloadData(data: BandwidthDataPoint[], maxPoints = 96): ChartPoint[] {
  const bucketSize = Math.max(1, Math.ceil(data.length / maxPoints));
  const points: ChartPoint[] = [];

  for (let i = 0; i < data.length; i += bucketSize) {
    const bucket = data.slice(i, i + bucketSize);
    const last = bucket[bucket.length - 1];
    const timestamp = parseUTCToGMT3(last.timestamp);
    const hotspotDownloadMB = bucket.reduce((sum, point) => sum + (point.hotspotDownloadMB ?? 0), 0);
    const pppoeDownloadMB = bucket.reduce((sum, point) => sum + (point.pppoeDownloadMB ?? 0), 0);
    const trackedDownloadMB = bucket.reduce((sum, point) => {
      const splitTotal = (point.hotspotDownloadMB ?? 0) + (point.pppoeDownloadMB ?? 0);
      return sum + (point.trackedDownloadMB ?? splitTotal);
    }, 0);

    points.push({
      time: formatGMT3Date(timestamp, {
        month: data.length > 48 ? 'short' : undefined,
        day: data.length > 48 ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit',
      }),
      tooltipTime: formatGMT3Date(timestamp, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      hotspotDownloadMB,
      pppoeDownloadMB,
      totalDownloadMB: trackedDownloadMB,
    });
  }

  return points;
}

function DownloadUsageTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const tooltipLabel = payload[0]?.payload?.tooltipTime ?? label;

  return (
    <div className="bg-background-secondary border border-border rounded-lg p-3 shadow-xl">
      <p className="font-medium text-foreground/90 mb-2 text-sm">{tooltipLabel}</p>
      {payload
        .filter((entry) => (entry.value ?? 0) > 0)
        .map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color ?? entry.fill ?? entry.stroke }}
            />
            <span className="text-foreground-muted">{labelForKey(entry.dataKey)}:</span>
            <span className="font-semibold" style={{ color: entry.color ?? entry.fill ?? entry.stroke }}>
              {formatUsageMb(entry.value ?? 0)}
            </span>
          </div>
        ))}
    </div>
  );
}

export default function DownloadUsageChart({
  data,
  service,
}: {
  data: BandwidthDataPoint[];
  service: DownloadUsageServiceFilter;
}) {
  const displayData = bucketDownloadData(data);
  const selectedHasUsage = displayData.some((point) => {
    if (service === 'hotspot') return point.hotspotDownloadMB > 0;
    if (service === 'pppoe') return point.pppoeDownloadMB > 0;
    return point.totalDownloadMB > 0;
  });

  if (displayData.length === 0 || !selectedHasUsage) {
    return (
      <div className="h-64 sm:h-72 w-full flex items-center justify-center rounded-lg bg-background-tertiary text-sm text-foreground-muted">
        No download usage recorded for this filter yet
      </div>
    );
  }

  return (
    <div className="h-64 sm:h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            minTickGap={45}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
            tickFormatter={(value) => formatAxisMb(Number(value))}
            width={48}
          />
          <Tooltip
            content={<DownloadUsageTooltip />}
            cursor={{ fill: 'var(--background-tertiary)', opacity: 0.45 }}
          />

          {(service === 'all' || service === 'hotspot') && (
            <Bar
              dataKey="hotspotDownloadMB"
              stackId={service === 'all' ? 'download' : undefined}
              fill="#f59e0b"
              radius={[3, 3, 0, 0]}
              name="Hotspot"
            />
          )}
          {(service === 'all' || service === 'pppoe') && (
            <Bar
              dataKey="pppoeDownloadMB"
              stackId={service === 'all' ? 'download' : undefined}
              fill="#8b5cf6"
              radius={[3, 3, 0, 0]}
              name="PPPoE"
            />
          )}
          {service === 'all' && (
            <Line
              type="monotone"
              dataKey="totalDownloadMB"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }}
              name="Total"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
