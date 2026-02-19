import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { GlassToggle } from '../shared/GlassToggle';

interface OptionsRowProps {
  enhanceEnabled: boolean;
  onEnhanceChange: (enabled: boolean) => void;
  duration: number;
  onDurationChange: (duration: number) => void;
}

export const OptionsRow: React.FC<OptionsRowProps> = ({
  enhanceEnabled,
  onEnhanceChange,
  duration,
  onDurationChange,
}) => {
  return (
    <div className="flex items-center justify-between">
      {/* Enhance Toggle */}
      <GlassToggle
        checked={enhanceEnabled}
        onChange={onEnhanceChange}
        label="Enhance"
      />

      {/* Duration Stepper */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onDurationChange(Math.max(2, duration - 1))}
          disabled={duration <= 2}
          className="
            flex items-center justify-center w-7 h-7
            rounded-glass-sm bg-glass-1 border border-border-glass
            text-text-secondary hover:text-text-primary hover:bg-glass-2
            transition-all duration-150 cursor-pointer
            disabled:opacity-30 disabled:cursor-not-allowed
          "
        >
          <Minus size={12} />
        </button>
        <span className="w-8 text-center text-body font-semibold text-text-primary">
          {duration}s
        </span>
        <button
          onClick={() => onDurationChange(Math.min(10, duration + 1))}
          disabled={duration >= 10}
          className="
            flex items-center justify-center w-7 h-7
            rounded-glass-sm bg-glass-1 border border-border-glass
            text-text-secondary hover:text-text-primary hover:bg-glass-2
            transition-all duration-150 cursor-pointer
            disabled:opacity-30 disabled:cursor-not-allowed
          "
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
};
