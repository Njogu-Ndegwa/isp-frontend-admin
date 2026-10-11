'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CustomerUsageTimeline } from '../../lib/types';
import { parseUTCToGMT3, formatGMT3Date } from '../../lib/dateUtils';
import { formatUsageMb, slotLabel } from './usageFormat';

// Download/upload use cyan + violet: the design system's cyan/green pair is
// too close for colour-blind readers (validated: ΔE 11 normal vision).
const DOWNLOAD_COLOR = 'var(--chart-2)';
const UPLOAD_COLOR = 'var(--chart-4)';

type ChartPoint = {
  label: string;
  tooltip: string;
  download: number;
  upload: number;
  total: number;
};

function formatAxisMb(mb: number): string {
  if (!Number.isFinite(mb) || mb <= 0) return '0';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)}G`;
  return `${mb.toFixed(0)}M`;
}

function UsageTooltip({ active, payload }: { active?: boolean; payload?: { payload?: ChartPoint }[] }) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return (
    <div className="bg-background-secondary border border-border rounded-lg p-3 shadow-xl text-sm">
      <p className="font-medium text-foreground mb-1.5">{point.tooltip}</p>
      <p className="font-semibold text-foreground tabular-nums mb-1">{formatUsageMb(point.total)}</p>
      {([
        ['Download', point.download, DOWNLOAD_COLOR],
        ['Upload', point.upload, UPLOAD_COLOR],
      ] as const).map(([name, value, color]) => (
        <div key={name} className="flex items-center gap-2 text-foreground-muted">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
          <span>{name}</span>
          <span className="ml-auto pl-3 tabular-nums text-foreground">{formatUsageMb(value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function UsageTimelineChart({ timeline }: { timeline: CustomerUsageTimeline }) {
  const hourly = timeline.granularity === 'hour';
  const data: ChartPoint[] = timeline.points.map((p) => {
    const local = parseUTCToGMT3(p.start);
    return {
      label: hourly
        ? formatGMT3Date(local, { hour: '2-digit', minute: '2-digit', hour12: false })
        : formatGMT3Date(local, { month: 'short', day: 'numeric' }),
      tooltip: slotLabel(p.start, timeline.granularity),
      download: p.download_mb,
      upload: p.upload_mb,
      total: p.total_mb,
    };
  });

  return (
    <div>
      <div className="h-56 sm:h-64 w-full" data-testid="usage-timeline-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="18%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
              tickFormatter={(v) => formatAxisMb(Number(v))}
              width={40}
            />
            <Tooltip content={<UsageTooltip />} cursor={{ fill: 'var(--background-tertiary)', opacity: 0.6 }} />
            {/* Surface-coloured stroke leaves a hairline gap between stacked segments. */}
            <Bar dataKey="download" stackId="usage" fill={DOWNLOAD_COLOR} stroke="var(--background-secondary)" strokeWidth={1} name="Download" />
            <Bar dataKey="upload" stackId="usage" fill={UPLOAD_COLOR} stroke="var(--background-secondary)" strokeWidth={1} radius={[4, 4, 0, 0]} name="Upload" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-foreground-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DOWNLOAD_COLOR }} /> Download
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: UPLOAD_COLOR }} /> Upload
        </span>
        <span className="ml-auto">Times in EAT</span>
      </div>
    </div>
  );
}
