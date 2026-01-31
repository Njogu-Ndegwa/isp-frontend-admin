interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accent?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'default' | 'large';
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  accent = 'primary',
  size = 'default',
}: StatCardProps) {
  const accentStyles = {
    primary: {
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      ring: 'ring-amber-500/20',
    },
    secondary: {
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
      ring: 'ring-orange-500/20',
    },
    success: {
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      ring: 'ring-emerald-500/20',
    },
    warning: {
      iconBg: 'bg-yellow-500/10',
      iconColor: 'text-yellow-500',
      ring: 'ring-yellow-500/20',
    },
    danger: {
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      ring: 'ring-red-500/20',
    },
    info: {
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-500',
      ring: 'ring-indigo-500/20',
    },
  };

  const styles = accentStyles[accent];

  return (
    <div className="group relative overflow-hidden bg-background-secondary border border-border rounded-2xl p-5 transition-all duration-300 hover:border-border-hover hover:shadow-lg">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2.5 rounded-xl ${styles.iconBg} ring-1 ${styles.ring}`}>
            <div className={styles.iconColor}>{icon}</div>
          </div>
          {trend && (
            <div
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                trend.isPositive 
                  ? 'bg-emerald-500/10 text-emerald-500' 
                  : 'bg-red-500/10 text-red-500'
              }`}
            >
              <svg
                className={`w-3 h-3 ${!trend.isPositive && 'rotate-180'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {Math.abs(trend.value).toFixed(1)}%
            </div>
          )}
        </div>
        
        <div>
          <p className="text-foreground-muted text-xs font-medium uppercase tracking-wider mb-1.5">{title}</p>
          <p className={`font-bold text-foreground stat-value ${size === 'large' ? 'text-3xl' : 'text-2xl'}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-foreground-muted text-xs mt-1.5">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact stat for inline displays
export function MiniStat({ 
  label, 
  value, 
  color = 'default' 
}: { 
  label: string; 
  value: string | number; 
  color?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
}) {
  const colorClasses = {
    default: 'text-foreground',
    success: 'text-emerald-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
    primary: 'text-amber-500',
  };

  return (
    <div className="text-center">
      <p className={`text-xl font-bold stat-value ${colorClasses[color]}`}>{value}</p>
      <p className="text-xs text-foreground-muted mt-0.5">{label}</p>
    </div>
  );
}
