import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showGlow?: boolean;
  completed?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className = '',
  showGlow = true,
  completed = false,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div
      className={`
        w-full h-[3px] rounded-full overflow-hidden
        bg-glass-2
        ${className}
      `}
    >
      <div
        className={`
          h-full rounded-full
          transition-all duration-500 ease-out
          ${completed
            ? 'bg-status-success animate-completion-flash'
            : 'bg-gradient-to-r from-accent to-accent-violet'
          }
          ${showGlow && !completed ? 'animate-progress-glow' : ''}
        `}
        style={{ width: `${clampedProgress}%` }}
      />
    </div>
  );
};
