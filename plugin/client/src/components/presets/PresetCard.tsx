import React, { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';

export interface Preset {
  id: string;
  name: string;
  category: string;
  prompt: string;
  supportsTransition: boolean;
  gradient: string; // CSS gradient as placeholder for thumbnails
}

interface PresetCardProps {
  preset: Preset;
  onSelect: (prompt: string) => void;
}

export const PresetCard: React.FC<PresetCardProps> = ({ preset, onSelect }) => {
  const [ripple, setRipple] = useState(false);

  const handleClick = () => {
    setRipple(true);
    setTimeout(() => {
      setRipple(false);
      onSelect(preset.prompt);
    }, 300);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        relative w-full aspect-[4/3] rounded-glass overflow-hidden
        border border-border-glass
        transition-all duration-200 ease-out cursor-pointer
        hover:-translate-y-0.5 hover:scale-[1.02] hover:border-border-glass-hover
        active:scale-[0.98]
        group
        ${ripple ? 'animate-ripple' : ''}
      `}
    >
      {/* Thumbnail placeholder (gradient) */}
      <div
        className="absolute inset-0"
        style={{ background: preset.gradient }}
      />

      {/* Transition badge */}
      {preset.supportsTransition && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 h-5 px-1.5 rounded-pill bg-glass-2 backdrop-blur-glass border border-border-glass text-[9px] text-text-secondary">
          <ArrowLeftRight size={9} />
        </div>
      )}

      {/* Category icon (top left) */}
      <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-glass-2 backdrop-blur-glass flex items-center justify-center opacity-60">
        <span className="text-[9px] text-text-secondary">
          {preset.category === 'fire' ? '🔥' : preset.category === 'destruction' ? '💥' : preset.category === 'morphing' ? '🌀' : preset.category === 'camera' ? '📷' : '✨'}
        </span>
      </div>

      {/* Bottom overlay with name */}
      <div className="absolute bottom-0 inset-x-0 px-2 py-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <span className="text-caption font-medium text-text-primary group-hover:text-white transition-colors">
          {preset.name}
        </span>
      </div>
    </button>
  );
};
