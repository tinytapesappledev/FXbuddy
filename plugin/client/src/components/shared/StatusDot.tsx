import React from 'react';

interface StatusDotProps {
  status: 'completed' | 'processing' | 'failed' | 'pending';
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  size = 'sm',
  className = '',
}) => {
  const colorClasses = {
    completed: 'bg-status-success',
    processing: 'bg-status-processing animate-pulse-slow',
    failed: 'bg-status-error',
    pending: 'bg-text-tertiary',
  };

  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
  };

  return (
    <span
      className={`
        inline-block rounded-full flex-shrink-0
        ${colorClasses[status]}
        ${sizeClasses[size]}
        ${className}
      `}
    />
  );
};
