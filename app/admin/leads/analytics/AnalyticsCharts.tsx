'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

export function LeadFunnelChart({
  data,
}: {
  data: { name: string; reached: number; dropOff: number; fill: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <XAxis type="number" tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }} />
        <YAxis dataKey="name" type="category" tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }} width={100} />
        <Tooltip
          contentStyle={{ background: 'var(--background-secondary)', border: '1px solid var(--border)', borderRadius: 12 }}
          labelStyle={{ color: 'var(--foreground)' }}
          itemStyle={{ color: 'var(--foreground-muted)' }}
          formatter={(value: number | undefined) => [value ?? 0, 'Reached']}
        />
        <Bar dataKey="reached" radius={[0, 6, 6, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AvgDaysInStageChart({
  data,
}: {
  data: { name: string; days: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 10, right: 10 }}>
        <XAxis dataKey="name" tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }} />
        <Tooltip
          contentStyle={{ background: 'var(--background-secondary)', border: '1px solid var(--border)', borderRadius: 12 }}
          labelStyle={{ color: 'var(--foreground)' }}
          formatter={(value: number | undefined) => [`${value ?? 0} days`, 'Avg']}
        />
        <Bar dataKey="days" fill="var(--accent-primary)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
