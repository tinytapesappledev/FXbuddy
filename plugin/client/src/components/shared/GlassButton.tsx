import React from 'react';

interface GlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  onClick,
  className = '',
  disabled = false,
  size = 'md',
  active = false,
}) => {
  const sizeClasses = {
    sm: 'h-7 px-2.5 text-caption',
    md: 'h-9 px-3 text-body',
    lg: 'h-11 px-4 text-subhead',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-1.5
        rounded-glass-sm font-medium
        transition-all duration-200 ease-out
        ${active
          ? 'bg-glass-3 border border-border-glass-active text-text-primary'
          : 'bg-glass-1 border border-border-glass text-text-secondary hover:bg-glass-2 hover:border-border-glass-hover hover:text-text-primary'
        }
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {children}
    </button>
  );
};
