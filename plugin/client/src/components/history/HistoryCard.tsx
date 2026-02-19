import React from 'react';
import { Download, RefreshCw, Copy, Film } from 'lucide-react';
import { GlassPill } from '../shared/GlassPill';
import { StatusDot } from '../shared/StatusDot';

export interface Generation {
  id: string;
  prompt: string;
  model: string;
  status: 'completed' | 'processing' | 'failed' | 'pending';
  credits: number;
  timeAgo: string;
  thumbnailUrl?: string;
}

interface HistoryCardProps {
  generation: Generation;
}

export const HistoryCard: React.FC<HistoryCardProps> = ({ generation }) => {
  const isProcessing = generation.status === 'processing';

  return (
    <div
      className={`
        relative flex items-center gap-3 p-2.5 rounded-glass
        bg-glass-1 border border-border-glass
        transition-all duration-200 ease-out
        group hover:bg-glass-2 hover:border-border-glass-hover
        ${isProcessing ? 'animate-border-glow' : ''}
      `}
    >
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-12 h-12 rounded-glass-sm overflow-hidden bg-glass-2">
        {generation.thumbnailUrl ? (
          <img
            src={generation.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : isProcessing ? (
          <div className="w-full h-full bg-gradient-to-br from-glass-1 to-glass-2 animate-shimmer"
            style={{ backgroundSize: '200% 100%' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film size={16} className="text-text-tertiary" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Prompt (truncated) */}
        <p className="text-body font-medium text-text-primary truncate">
          {generation.prompt}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <GlassPill size="xs">
            {generation.model}
          </GlassPill>
          <StatusDot status={generation.status} />
          <span className="text-[10px] text-text-tertiary capitalize">
            {generation.status}
          </span>
          <span className="text-[10px] text-text-tertiary ml-auto flex-shrink-0">
            {generation.credits} cred
          </span>
        </div>
      </div>

      {/* Time ago */}
      <span className="flex-shrink-0 text-[10px] text-text-tertiary self-start mt-0.5 group-hover:opacity-0 transition-opacity">
        {generation.timeAgo}
      </span>

      {/* Hover action icons */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {generation.status === 'completed' && (
          <button className="flex items-center justify-center w-7 h-7 rounded-glass-sm bg-glass-2 border border-border-glass text-text-secondary hover:text-text-primary hover:bg-glass-3 transition-all cursor-pointer">
            <Download size={12} />
          </button>
        )}
        <button className="flex items-center justify-center w-7 h-7 rounded-glass-sm bg-glass-2 border border-border-glass text-text-secondary hover:text-text-primary hover:bg-glass-3 transition-all cursor-pointer">
          <RefreshCw size={12} />
        </button>
        <button className="flex items-center justify-center w-7 h-7 rounded-glass-sm bg-glass-2 border border-border-glass text-text-secondary hover:text-text-primary hover:bg-glass-3 transition-all cursor-pointer">
          <Copy size={12} />
        </button>
      </div>
    </div>
  );
};
