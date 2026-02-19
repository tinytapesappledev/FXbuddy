import React from 'react';
import { CHIP_DENOMINATIONS, COLORS } from '../utils/constants';

interface Props {
  currentBet: number;
  chips: number;
  onSelectBet: (amount: number) => void;
  disabled: boolean;
}

const NEU_CHIP = 'var(--shadow-neu-icon)';
const NEU_CHIP_ACTIVE = 'var(--shadow-neu-button-active)';

export const ChipSelector: React.FC<Props> = ({
  currentBet,
  chips,
  onSelectBet,
  disabled,
}) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        {CHIP_DENOMINATIONS.map((denom) => {
          const isSelected = currentBet === denom;
          const canAfford = chips >= denom;

          return (
            <button
              key={denom}
              onClick={() => onSelectBet(denom)}
              disabled={disabled || !canAfford}
              className="relative flex items-center justify-center rounded-full transition-all duration-150 active:scale-95"
              style={{
                width: 44,
                height: 44,
                background: COLORS.bg,
                boxShadow: isSelected ? NEU_CHIP_ACTIVE : NEU_CHIP,
                opacity: disabled || !canAfford ? 0.35 : 1,
                cursor: disabled || !canAfford ? 'not-allowed' : 'pointer',
              }}
            >
              {/* Inner ring */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 34,
                  height: 34,
                  border: `1.5px dashed ${isSelected ? 'var(--glass-4)' : 'var(--glass-2)'}`,
                }}
              />
              <span
                className="text-xs font-bold relative z-10"
                style={{
                  color: isSelected ? COLORS.textPrimary : COLORS.textSecondary,
                }}
              >
                {denom}
              </span>
            </button>
          );
        })}
      </div>
      <span className="text-[11px]" style={{ color: COLORS.textSecondary }}>
        Bet: <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{currentBet}</span> chips
      </span>
    </div>
  );
};
