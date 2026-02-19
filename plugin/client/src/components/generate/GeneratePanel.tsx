import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { VideoPreview } from './VideoPreview';
import { GlassInput } from '../shared/GlassInput';
import { ModelSelector } from './ModelSelector';
import { OptionsRow } from './OptionsRow';
import { GlassPill } from '../shared/GlassPill';
import { AccentButton } from '../shared/AccentButton';

interface GeneratePanelProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const GeneratePanel: React.FC<GeneratePanelProps> = ({
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
}) => {
  const [selectedModel, setSelectedModel] = useState('gen4_turbo');
  const [enhanceEnabled, setEnhanceEnabled] = useState(true);
  const [duration, setDuration] = useState(5);

  // Cost estimate based on model multiplier and duration
  const multipliers: Record<string, number> = {
    gen4_turbo: 1,
    gen4_aleph: 3,
    veo3_1_fast: 2,
  };
  const estimatedCredits = duration * (multipliers[selectedModel] || 1);

  const canGenerate = prompt.trim().length > 0 && !isGenerating;

  return (
    <div className="space-y-3 pt-2 animate-fade-in">
      {/* Video Preview */}
      <VideoPreview
        clipName="MV_Take_04.mp4"
        clipDuration="00:08.24"
      />

      {/* Prompt Input */}
      <GlassInput
        value={prompt}
        onChange={onPromptChange}
        placeholder="Describe the VFX you want..."
        multiline
        rows={4}
        maxRows={8}
        maxLength={1000}
        showCharCount
      />

      {/* Model Selector */}
      <ModelSelector
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />

      {/* Options Row */}
      <OptionsRow
        enhanceEnabled={enhanceEnabled}
        onEnhanceChange={setEnhanceEnabled}
        duration={duration}
        onDurationChange={setDuration}
      />

      {/* Cost Estimate */}
      <div className="flex justify-center">
        <GlassPill size="sm">
          <Sparkles size={10} className="text-text-accent" />
          <span>~{estimatedCredits} credits</span>
        </GlassPill>
      </div>

      {/* Generate Button */}
      <AccentButton
        onClick={onGenerate}
        disabled={!canGenerate}
        loading={isGenerating}
      >
        Generate VFX
      </AccentButton>
    </div>
  );
};
