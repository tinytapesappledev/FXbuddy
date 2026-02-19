import React, { useState, useEffect } from 'react';
import { HandResult } from '../types/game';
import { COLORS } from '../utils/constants';

interface Props {
  result: HandResult;
  message: string;
  onNewHand: () => void;
  generationComplete: boolean;
}

const NEU_BTN = 'var(--shadow-neu-button)';
const NEU_PRESSED = 'var(--shadow-neu-pressed)';

export const GameResult: React.FC<Props> = ({
  result,
  message,
  onNewHand,
  generationComplete,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (result) {
      const t = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [result]);

  if (!result) return null;

  const isWin = result === 'win' || result === 'blackjack';
  const isPush = result === 'push';

  const bannerColor = isWin
    ? COLORS.green
    : isPush
      ? COLORS.textSecondary
      : COLORS.red;

  const bannerBg = isWin
    ? 'var(--status-success-bg)'
    : isPush
      ? COLORS.secondaryDim
      : 'var(--status-error-bg)';

  return (
    <div
      className="flex flex-col items-center gap-2 transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.95)',
      }}
    >
      {/* Result banner -- neumorphic pressed */}
      <div
        className="px-5 py-2 rounded-full font-bold text-sm tracking-wide"
        style={{
          color: bannerColor,
          background: bannerBg,
          boxShadow: NEU_PRESSED,
        }}
      >
        {message}
      </div>

      {/* New Hand button */}
      {!generationComplete && (
        <button
          onClick={onNewHand}
          className="mt-1 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all active:scale-95"
          style={{
            background: COLORS.bg,
            color: COLORS.textPrimary,
            boxShadow: NEU_BTN,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          New Hand
        </button>
      )}

    </div>
  );
};
