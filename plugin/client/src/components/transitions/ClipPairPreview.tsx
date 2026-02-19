import React from 'react';
import { ChevronRight, Film } from 'lucide-react';

interface ClipInfo {
  name: string;
  thumbnailUrl?: string;
}

interface ClipPairPreviewProps {
  clipA?: ClipInfo;
  clipB?: ClipInfo;
}

export const ClipPairPreview: React.FC<ClipPairPreviewProps> = ({ clipA, clipB }) => {
  const renderClip = (clip: ClipInfo | undefined, label: string) => (
    <div className="flex-1 flex flex-col gap-1">
      <div
        className={`
          h-[100px] rounded-glass overflow-hidden
          ${clip
            ? 'bg-glass-1'
            : 'border-2 border-dashed border-border-glass bg-transparent'
          }
        `}
        style={clip ? { boxShadow: 'inset 0 0 0 1px var(--border-glass)' } : undefined}
      >
        {clip ? (
          clip.thumbnailUrl ? (
            <img src={clip.thumbnailUrl} alt={clip.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-glass-1 flex items-center justify-center">
              <Film size={24} className="text-text-tertiary" />
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] text-text-tertiary">{label}</span>
          </div>
        )}
      </div>
      <span className="text-[10px] text-text-tertiary text-center truncate px-1">
        {clip ? clip.name : '---'}
      </span>
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      {renderClip(clipA, 'Select clip A')}

      {/* Arrow */}
      <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-glass-1 border border-border-glass">
        <ChevronRight size={14} className="text-text-secondary" />
      </div>

      {renderClip(clipB, 'Select clip B')}
    </div>
  );
};
