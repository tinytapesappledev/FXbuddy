import React from 'react';
import { COLORS } from '../utils/constants';

interface Props {
  renderTimeRemaining: number | null;
  onExit: () => void;
}

const NEU_PRESSED = 'var(--shadow-neu-pressed)';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const StatusBar: React.FC<Props> = ({
  renderTimeRemaining,
  onExit,
}) => {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-full"
      style={{
        background: COLORS.bg,
        boxShadow: NEU_PRESSED,
      }}
    >
      {/* Render timer */}
      {renderTimeRemaining !== null && renderTimeRemaining > 0 && (
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: COLORS.green,
              animation: 'bj-pulse 1.5s ease-in-out infinite',
            }}
          />
          <span className="text-[10px]" style={{ color: COLORS.textSecondary }}>
            VFX rendering... ~{formatTime(renderTimeRemaining)}
          </span>
        </div>
      )}

      {/* Exit */}
      <button
        onClick={onExit}
        className="text-[10px] transition-colors"
        style={{ color: COLORS.textDim }}
        onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.textPrimary)}
        onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.textDim)}
      >
        Back to status
      </button>

      <style>{`
        @keyframes bj-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};
