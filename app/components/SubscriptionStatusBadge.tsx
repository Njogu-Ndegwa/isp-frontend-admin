'use client';

interface SubscriptionStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  active: { label: 'Active', classes: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  trial: { label: 'Trial', classes: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  suspended: { label: 'Suspended', classes: 'bg-red-500/10 text-red-500 border-red-500/20' },
  inactive: { label: 'Inactive', classes: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

export default function SubscriptionStatusBadge({ status, size = 'sm' }: SubscriptionStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
  const sizeClasses = size === 'md' ? 'text-xs px-3 py-1' : 'text-[10px] px-2 py-0.5';

  return (
    <span className={`inline-flex items-center font-semibold rounded-full border ${config.classes} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === 'active' ? 'bg-emerald-500' :
        status === 'trial' ? 'bg-blue-500' :
        status === 'suspended' ? 'bg-red-500' : 'bg-gray-400'
      }`} />
      {config.label}
    </span>
  );
}
