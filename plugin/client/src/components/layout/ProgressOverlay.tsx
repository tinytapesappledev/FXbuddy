import React from 'react';
import { ProgressBar } from '../shared/ProgressBar';

interface ProgressOverlayProps {
  progress: number;
  completed: boolean;
}

export const ProgressOverlay: React.FC<ProgressOverlayProps> = ({
  progress,
  completed,
}) => {
  return (
    <div
      className={`
        flex-shrink-0 mx-3 mb-1 p-3 rounded-glass glass-elevated
        animate-fade-in
        ${completed ? 'animate-slide-up-out' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${completed ? 'bg-status-success' : 'bg-status-processing animate-pulse-slow'}`} />
          <span className="text-caption text-text-secondary">
            {completed ? 'Complete!' : 'Generating...'}
          </span>
        </div>
        <span className="text-body font-semibold text-text-accent">
          {progress}%
        </span>
      </div>
      <ProgressBar progress={progress} completed={completed} />
    </div>
  );
};
