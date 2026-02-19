import React, { useState } from 'react';
import { ClipPairPreview } from './ClipPairPreview';
import { TransPresetPicker } from './TransPresetPicker';
import { DurationSlider } from './DurationSlider';
import { AccentButton } from '../shared/AccentButton';
import { GlassPill } from '../shared/GlassPill';
import { Sparkles } from 'lucide-react';

export const TransitionsPanel: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState('flame_burst');
  const [duration, setDuration] = useState(5);

  // Demo data
  const clipA = { name: 'MV_Take_04.mp4' };
  const clipB = { name: 'MV_Take_05.mp4' };

  return (
    <div className="space-y-4 pt-2 animate-fade-in">
      {/* Clip Pair Preview */}
      <ClipPairPreview clipA={clipA} clipB={clipB} />

      {/* Transition Preset Picker */}
      <div>
        <h3 className="text-caption font-semibold text-text-tertiary uppercase tracking-wider mb-2">
          Transition Effect
        </h3>
        <TransPresetPicker
          selectedPreset={selectedPreset}
          onPresetChange={setSelectedPreset}
        />
      </div>

      {/* Duration */}
      <DurationSlider
        value={duration}
        min={5}
        max={10}
        onChange={setDuration}
      />

      {/* Cost estimate */}
      <div className="flex justify-center">
        <GlassPill size="sm">
          <Sparkles size={10} className="text-text-accent" />
          <span>~{duration * 3} credits</span>
        </GlassPill>
      </div>

      {/* Generate Button */}
      <AccentButton>
        Generate Transition
      </AccentButton>
    </div>
  );
};
