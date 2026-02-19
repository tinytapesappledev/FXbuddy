import React, { useState, useEffect } from 'react';
import { COLORS } from '../utils/constants';

interface Props {
  visible: boolean;
  onViewResult: () => void;
}

const NEU_RAISED = 'var(--shadow-neu-flat)';
const NEU_ICON = 'var(--shadow-neu-icon)';
const NEU_BTN = 'var(--shadow-neu-button)';

export const GenerationComplete: React.FC<Props> = ({ visible, onViewResult }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setShow(true), 300);
      return () => clearTimeout(t);
    }
    setShow(false);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'color-mix(in srgb, var(--bg-base) 88%, transparent)',
        backdropFilter: 'blur(8px)',
        opacity: show ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      <div
        className="flex flex-col items-center gap-4 p-8 rounded-neu"
        style={{
          background: COLORS.bg,
          boxShadow: NEU_RAISED,
          transform: show ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          transition: 'transform 0.4s ease',
          borderRadius: 20,
        }}
      >
        {/* Film icon in neumorphic orb */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: COLORS.bg,
            boxShadow: NEU_ICON,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="3" width="20" height="18" rx="2" stroke="var(--text-primary)" strokeWidth="2" />
            <line x1="2" y1="8" x2="22" y2="8" stroke="var(--text-primary)" strokeWidth="1.5" />
            <line x1="2" y1="16" x2="22" y2="16" stroke="var(--text-primary)" strokeWidth="1.5" />
            <line x1="7" y1="3" x2="7" y2="8" stroke="var(--text-primary)" strokeWidth="1.5" />
            <line x1="12" y1="3" x2="12" y2="8" stroke="var(--text-primary)" strokeWidth="1.5" />
            <line x1="17" y1="3" x2="17" y2="8" stroke="var(--text-primary)" strokeWidth="1.5" />
            <line x1="7" y1="16" x2="7" y2="21" stroke="var(--text-primary)" strokeWidth="1.5" />
            <line x1="12" y1="16" x2="12" y2="21" stroke="var(--text-primary)" strokeWidth="1.5" />
            <line x1="17" y1="16" x2="17" y2="21" stroke="var(--text-primary)" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="text-center">
          <p className="text-sm font-bold font-syne" style={{ color: COLORS.textPrimary }}>
            Your VFX is ready!
          </p>
          <p className="text-[11px] mt-1" style={{ color: COLORS.textSecondary }}>
            Generation complete
          </p>
        </div>

        <button
          onClick={onViewResult}
          className="px-6 py-2.5 rounded-full text-sm font-bold uppercase tracking-wide transition-all active:scale-95"
          style={{
            background: COLORS.bg,
            color: COLORS.textPrimary,
            boxShadow: NEU_BTN,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          View Result
        </button>
      </div>
    </div>
  );
};
