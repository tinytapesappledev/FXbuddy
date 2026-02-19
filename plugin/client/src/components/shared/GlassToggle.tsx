import React from 'react';

interface GlassToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const GlassToggle: React.FC<GlassToggleProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
}) => {
  return (
    <label
      className={`
        inline-flex items-center gap-2 select-none
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`
          relative w-9 h-5 rounded-full
          transition-all duration-200 ease-out
          ${checked
            ? 'bg-gradient-to-r from-accent to-accent-violet'
            : 'bg-glass-2 border border-border-glass'
          }
        `}
      >
        <span
          className={`
            absolute top-0.5 w-4 h-4 rounded-full
            transition-all duration-200 ease-out
            ${checked
              ? 'left-[18px] bg-white shadow-sm'
              : 'left-0.5 bg-text-secondary'
            }
          `}
        />
      </button>
      {label && (
        <span className="text-caption text-text-secondary">{label}</span>
      )}
    </label>
  );
};
