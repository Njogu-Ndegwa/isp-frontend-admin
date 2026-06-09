'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const PIE_COLORS = ['#22c55e', '#3b82f6', '#ef4444'];

export default function RevenuePie({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--color-background-secondary)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
          labelStyle={{ color: 'var(--color-foreground)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
