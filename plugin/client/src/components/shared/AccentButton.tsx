import React from 'react';

interface AccentButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export const AccentButton: React.FC<AccentButtonProps> = ({
  children,
  onClick,
  className = '',
  disabled = false,
  loading = false,
  fullWidth = true,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative h-11 rounded-glass
        bg-gradient-to-br from-accent to-accent-violet
        text-white text-subhead font-semibold
        shadow-glow
        transition-all duration-200 ease-out
        ${fullWidth ? 'w-full' : 'px-6'}
        ${disabled || loading
          ? 'opacity-40 cursor-not-allowed shadow-none'
          : 'cursor-pointer hover:brightness-110 hover:shadow-glow-lg active:scale-[0.98]'
        }
        ${className}
      `}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-1">
          <span className="loading-dot w-1.5 h-1.5 rounded-full bg-white" />
          <span className="loading-dot w-1.5 h-1.5 rounded-full bg-white" />
          <span className="loading-dot w-1.5 h-1.5 rounded-full bg-white" />
        </span>
      ) : (
        children
      )}
    </button>
  );
};
