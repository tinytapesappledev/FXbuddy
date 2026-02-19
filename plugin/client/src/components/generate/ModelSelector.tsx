import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Lock } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  multiplier: string;
  locked: boolean;
}

const models: Model[] = [
  { id: 'gen4_turbo', name: 'Gen-4 Turbo', multiplier: '1x', locked: false },
  { id: 'gen4_aleph', name: 'Gen-4 Aleph', multiplier: '3x', locked: false },
  { id: 'veo3_1_fast', name: 'Veo 3.1 Fast', multiplier: '2x', locked: true },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = models.find((m) => m.id === selectedModel) || models[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 h-9 px-3 w-full
          rounded-glass-sm bg-glass-1 border border-border-glass
          text-body text-text-primary font-medium
          hover:bg-glass-2 hover:border-border-glass-hover
          transition-all duration-200 ease-out cursor-pointer
        "
      >
        <span className="flex-1 text-left">{selected.name}</span>
        <span className="text-[10px] text-text-accent bg-accent-surface px-1.5 py-0.5 rounded-pill">
          {selected.multiplier}
        </span>
        <ChevronDown size={14} className={`text-text-tertiary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 rounded-glass glass-elevated p-1 animate-fade-in">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                if (!model.locked) {
                  onModelChange(model.id);
                  setIsOpen(false);
                }
              }}
              disabled={model.locked}
              className={`
                flex items-center gap-2 w-full h-9 px-2.5 rounded-glass-sm
                transition-all duration-150 ease-out
                ${model.id === selectedModel
                  ? 'bg-glass-3 text-text-primary'
                  : model.locked
                    ? 'text-text-tertiary cursor-not-allowed'
                    : 'text-text-secondary hover:bg-glass-2 hover:text-text-primary cursor-pointer'
                }
              `}
            >
              <span className="flex-1 text-left text-body font-medium">{model.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-pill ${model.locked ? 'bg-glass-1 text-text-tertiary' : 'bg-accent-surface text-text-accent'}`}>
                {model.multiplier}
              </span>
              {model.locked && <Lock size={12} className="text-text-tertiary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
