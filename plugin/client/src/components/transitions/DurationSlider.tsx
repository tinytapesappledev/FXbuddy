import React from 'react';

interface DurationSliderProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export const DurationSlider: React.FC<DurationSliderProps> = ({
  value,
  min = 5,
  max = 10,
  onChange,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-caption text-text-secondary">Duration</span>
        <span className="text-body font-semibold text-text-primary">{value}s</span>
      </div>

      <div className="relative">
        {/* Track */}
        <div className="w-full h-1 rounded-full bg-glass-2">
          {/* Filled portion */}
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-violet shadow-glow"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Native range input (invisible, for interaction) */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {/* Custom thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-accent to-accent-violet shadow-glow pointer-events-none border-2 border-white/20"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>

      <div className="flex justify-between">
        <span className="text-[10px] text-text-tertiary">{min}s</span>
        <span className="text-[10px] text-text-tertiary">{max}s</span>
      </div>
    </div>
  );
};
