import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  elevated = false,
  onClick,
  padding = 'md',
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };

  return (
    <div
      className={`
        ${elevated ? 'glass-elevated' : 'glass-surface'}
        ${paddingClasses[padding]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
