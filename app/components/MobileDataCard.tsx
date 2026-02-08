'use client';

import Link from 'next/link';

interface DataField {
  label?: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

interface MobileDataCardProps {
  id: string | number;
  title: string;
  subtitle?: string;
  avatar?: {
    text: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  };
  status?: {
    label: string;
    variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  };
  badge?: {
    label: string;
    color?: string;
  };
  fields: DataField[];
  href?: string;
  onClick?: () => void;
  className?: string;
  expandableContent?: React.ReactNode;
  rightAction?: React.ReactNode;
  highlight?: boolean;
  highlightColor?: 'danger' | 'warning' | 'success';
}

const avatarColors = {
  primary: 'bg-accent-primary/10 text-accent-primary',
  secondary: 'bg-accent-secondary/10 text-accent-secondary',
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
  id,
  title,
  subtitle,
  avatar,
  status,
  badge,
  fields,
  href,
  onClick,
  className = '',
  expandableContent,
  rightAction,
  highlight = false,
  highlightColor = 'danger',
}: MobileDataCardProps) {
  const CardWrapper = href ? Link : onClick ? 'button' : 'div';
  const wrapperProps = href
    ? { href, className: 'block' }
    : onClick
    ? { onClick, className: 'w-full text-left' }
    : { className: '' };

  const highlightBorder = highlight
    ? highlightColor === 'danger'
      ? 'border-red-500/20'
      : highlightColor === 'warning'
      ? 'border-warning/20'
      : 'border-success/20'
    : '';

  return (
    <CardWrapper {...(wrapperProps as any)}>
      <div className={`card p-4 mobile-card ${highlightBorder} ${className}`}>
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          {avatar && (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium flex-shrink-0 ${avatarColors[avatar.color || 'primary']}`}>
              {avatar.text}
            </div>
          )}
          
          {/* Title & Subtitle */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">{title}</h3>
            {subtitle && (
              <p className="text-sm text-foreground-muted truncate">{subtitle}</p>
            )}
            {status && (
              <span className={`badge ${badgeClasses[status.variant]} text-xs capitalize mt-1 inline-block`}>
                {status.label}
              </span>
            )}
            {badge && (
              <span className={`text-xs ${badge.color || 'text-foreground-muted'} mt-1 inline-block`}>
                {badge.label}
              </span>
            )}
          </div>
          
          {/* Right Action */}
          {rightAction && (
            <div className="flex-shrink-0">
              {rightAction}
            </div>
          )}
        </div>
        
        {/* Divider */}
        <div className="h-px bg-border mb-3" />
        
        {/* Fields */}
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={index} className={`flex items-center gap-2 text-sm ${field.className || ''}`}>
              {field.icon && (
                <span className="text-foreground-muted flex-shrink-0">{field.icon}</span>
              )}
              {field.label && (
                <span className="text-foreground-muted flex-shrink-0">{field.label}:</span>
              )}
              <span className="text-foreground truncate">{field.value}</span>
            </div>
          ))}
        </div>

        {/* Expandable Content */}
        {expandableContent && (
          <div className="mt-3 pt-3 border-t border-border">
            {expandableContent}
          </div>
        )}
      </div>
    </CardWrapper>
  );
}
