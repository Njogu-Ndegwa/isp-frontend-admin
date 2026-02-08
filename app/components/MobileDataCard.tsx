'use client';

import Link from 'next/link';

interface DataField {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

interface MobileDataCardProps {
  title: string;
  subtitle?: string;
  avatar?: {
    initials: string;
    color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  };
  status?: {
    label: string;
    variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  };
  fields: DataField[];
  href?: string;
  onClick?: () => void;
  className?: string;
  rightAction?: React.ReactNode;
}

const avatarColors = {
  primary: 'bg-accent-primary/10 text-accent-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
};

const badgeClasses = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  neutral: 'badge-neutral',
  info: 'badge-info',
};

export default function MobileDataCard({
  title,
  subtitle,
  avatar,
  status,
  fields,
  href,
  onClick,
  className = '',
  rightAction,
}: MobileDataCardProps) {
  const CardWrapper = href ? Link : onClick ? 'button' : 'div';
  const wrapperProps = href
    ? { href, className: 'block' }
    : onClick
    ? { onClick, className: 'w-full text-left' }
    : { className: '' };

  return (
    <CardWrapper {...(wrapperProps as any)}>
      <div className={`card p-4 mobile-card ${className}`}>
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          {avatar && (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium flex-shrink-0 ${avatarColors[avatar.color || 'primary']}`}>
              {avatar.initials}
            </div>
          )}
          
          {/* Title & Subtitle */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">{title}</h3>
            {subtitle && (
              <p className="text-sm text-foreground-muted truncate">{subtitle}</p>
            )}
          </div>
          
          {/* Status & Action */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {status && (
              <span className={`badge ${badgeClasses[status.variant]} text-xs capitalize`}>
                {status.label}
              </span>
            )}
            {rightAction}
          </div>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-border mb-3" />
        
        {/* Fields */}
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              {field.icon && (
                <span className="text-foreground-muted flex-shrink-0">{field.icon}</span>
              )}
              <span className="text-foreground-muted flex-shrink-0">{field.label}:</span>
              <span className="text-foreground truncate">{field.value}</span>
            </div>
          ))}
        </div>
      </div>
    </CardWrapper>
  );
}
