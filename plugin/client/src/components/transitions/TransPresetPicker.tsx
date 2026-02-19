import React from 'react';

interface TransitionPreset {
  id: string;
  name: string;
  description: string;
  gradient: string;
}

const transitionPresets: TransitionPreset[] = [
  {
    id: 'flame_burst',
    name: 'Flame Burst',
    description: 'Fire erupts and clears to reveal the next scene',
    gradient: 'linear-gradient(135deg, #8b2500, #ff4500)',
  },
  {
    id: 'fire_transition',
    name: 'Fire Wipe',
    description: 'Wall of fire sweeps across revealing new scene',
    gradient: 'linear-gradient(135deg, #cc4400, #ffaa00)',
  },
  {
    id: 'explosion',
    name: 'Explosion',
    description: 'Scene explodes outward transitioning to next',
    gradient: 'linear-gradient(135deg, #660000, #ffcc00)',
  },
  {
    id: 'disintegration',
    name: 'Disintegrate',
    description: 'Particles scatter and reform into new scene',
    gradient: 'linear-gradient(135deg, #2a1a2a, #886688)',
  },
  {
    id: 'shatter',
    name: 'Shatter',
    description: 'Scene shatters like glass revealing next clip',
    gradient: 'linear-gradient(135deg, #1a2a3a, #8ab4e8)',
  },
  {
    id: 'morph',
    name: 'Morph',
    description: 'Smooth fluid morphing between scenes',
    gradient: 'linear-gradient(135deg, #3d0066, #cc44ff)',
  },
  {
    id: 'smoke',
    name: 'Smoke',
    description: 'Smoke engulfs and clears to reveal next scene',
    gradient: 'linear-gradient(135deg, #1a1a2a, #4a5a6a)',
  },
  {
    id: 'earth_zoom',
    name: 'Earth Zoom',
    description: 'Camera pulls up to space then descends to new scene',
    gradient: 'linear-gradient(135deg, #003300, #0066cc)',
  },
];

interface TransPresetPickerProps {
  selectedPreset: string;
  onPresetChange: (presetId: string) => void;
}

export const TransPresetPicker: React.FC<TransPresetPickerProps> = ({
  selectedPreset,
  onPresetChange,
}) => {
  const selected = transitionPresets.find((p) => p.id === selectedPreset);

  return (
    <div className="space-y-2">
      {/* Horizontal scroll of preset thumbnails */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {transitionPresets.map((preset) => {
          const isActive = selectedPreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onPresetChange(preset.id)}
              className={`
                flex-shrink-0 w-14 h-14 rounded-glass-sm overflow-hidden
                border-2 transition-all duration-200 ease-out cursor-pointer
                ${isActive
                  ? 'border-accent shadow-glow scale-105'
                  : 'border-border-glass hover:border-border-glass-hover'
                }
              `}
            >
              <div
                className="w-full h-full"
                style={{ background: preset.gradient }}
              />
            </button>
          );
        })}
      </div>

      {/* Selected preset info */}
      {selected && (
        <div className="px-1">
          <p className="text-caption font-medium text-text-primary">{selected.name}</p>
          <p className="text-[10px] text-text-tertiary">{selected.description}</p>
        </div>
      )}
    </div>
  );
};
