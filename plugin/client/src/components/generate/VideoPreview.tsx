import React from 'react';
import { Film } from 'lucide-react';

interface VideoPreviewProps {
  clipName?: string;
  clipDuration?: string;
  thumbnailUrl?: string;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  clipName,
  clipDuration,
  thumbnailUrl,
}) => {
  const hasClip = !!clipName;

  return (
    <div
      className={`
        relative w-full h-[120px] rounded-glass overflow-hidden
        ${hasClip
          ? 'bg-glass-1'
          : 'border-2 border-dashed border-border-glass bg-transparent'
        }
      `}
      style={hasClip ? { boxShadow: 'inset 0 0 0 1px var(--border-glass)' } : undefined}
    >
      {hasClip ? (
        <>
          {/* Thumbnail */}
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={clipName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-glass-1 flex items-center justify-center">
              <Film size={32} className="text-text-tertiary" />
            </div>
          )}

          {/* Bottom overlay with clip info */}
          <div className="absolute bottom-0 inset-x-0 px-2.5 py-2 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-caption font-medium text-text-primary truncate">
                {clipName}
              </span>
              {clipDuration && (
                <span className="text-[10px] text-text-secondary flex-shrink-0 ml-2">
                  {clipDuration}
                </span>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <Film size={24} className="text-text-tertiary" />
          <span className="text-caption text-text-tertiary">
            Select a clip in your timeline
          </span>
        </div>
      )}
    </div>
  );
};
