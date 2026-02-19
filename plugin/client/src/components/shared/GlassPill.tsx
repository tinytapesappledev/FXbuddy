import React from 'react';

interface GlassPillProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'accent' | 'success' | 'error' | 'warning';
  size?: 'xs' | 'sm' | 'md';
  onClick?: () => void;
  active?: boolean;
}

export const GlassPill: React.FC<GlassPillProps> = ({
  children,
  className = '',
  variant = 'default',
  size = 'sm',
  onClick,
  active = false,
}) => {
  const variantClasses = {
    default: 'bg-glass-1 border-border-glass text-text-secondary',
    accent: 'bg-accent-surface border-accent/30 text-text-accent',
    success: 'bg-status-success-bg border-status-success/20 text-status-success',
    error: 'bg-status-error-bg border-status-error/20 text-status-error',
    warning: 'bg-glass-1 border-status-warning/20 text-status-warning',
  };

  const sizeClasses = {
    xs: 'h-5 px-1.5 text-[10px]',
    sm: 'h-7 px-2.5 text-caption',
    md: 'h-8 px-3 text-caption',
  };

  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 rounded-pill
        border font-medium whitespace-nowrap
        transition-all duration-200 ease-out
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${active ? 'bg-glass-3 border-border-glass-active text-text-primary' : ''}
        ${onClick ? 'cursor-pointer hover:bg-glass-2 hover:border-border-glass-hover' : ''}
        ${className}
      `}
    >
      {children}
    </span>
  );
};
