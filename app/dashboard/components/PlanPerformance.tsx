'use client';

import SectionCard, { SectionEmpty } from './SectionCard';

interface Plan {
  name: string;
  count: number;
  revenue: number;
}

export default function PlanPerformance({ plans, totalRevenue }: { plans: Plan[]; totalRevenue: number }) {
  const colors = ['bg-amber-500', 'bg-orange-500', 'bg-yellow-500', 'bg-red-500', 'bg-pink-500'];

  return (
    <SectionCard title="Plan Performance" accent="emerald">
      {plans.length === 0 ? (
        <SectionEmpty message="No plan data available" />
      ) : (
        <div className="space-y-4">
          {plans.map((plan, i) => {
            const percentage = totalRevenue > 0 ? (plan.revenue / totalRevenue) * 100 : 0;

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
      )}
    </SectionCard>
  );
}
