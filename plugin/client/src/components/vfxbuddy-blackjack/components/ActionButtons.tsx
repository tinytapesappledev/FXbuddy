import React from 'react';
import { COLORS } from '../utils/constants';

interface Props {
  onHit: () => void;
  onStand: () => void;
  onDoubleDown: () => void;
  onSplit: () => void;
  canDoubleDown: boolean;
  canSplit: boolean;
  disabled: boolean;
}

const NEU_BTN = 'var(--shadow-neu-button)';
const NEU_BTN_ACTIVE = 'var(--shadow-neu-button-active)';

export const ActionButtons: React.FC<Props> = ({
  onHit,
  onStand,
  onDoubleDown,
  onSplit,
  canDoubleDown,
  canSplit,
  disabled,
}) => {
  const btnClass = 'rounded-full font-bold text-xs uppercase tracking-wide transition-all active:scale-95';

  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      {/* Hit */}
      <button
        onClick={onHit}
        disabled={disabled}
        className={btnClass}
        style={{
          padding: '10px 22px',
          background: COLORS.bg,
          color: COLORS.textPrimary,
          boxShadow: disabled ? 'none' : NEU_BTN,
          opacity: disabled ? 0.4 : 1,
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        onMouseDown={(e) => { if (!disabled) e.currentTarget.style.boxShadow = NEU_BTN_ACTIVE; }}
        onMouseUp={(e) => { if (!disabled) e.currentTarget.style.boxShadow = NEU_BTN; }}
        onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.boxShadow = NEU_BTN; }}
      >
        Hit
      </button>

      {/* Stand */}
      <button
        onClick={onStand}
        disabled={disabled}
        className={btnClass}
        style={{
          padding: '10px 22px',
          background: COLORS.bg,
          color: COLORS.textPrimary,
          boxShadow: disabled ? 'none' : NEU_BTN,
          opacity: disabled ? 0.4 : 1,
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        onMouseDown={(e) => { if (!disabled) e.currentTarget.style.boxShadow = NEU_BTN_ACTIVE; }}
        onMouseUp={(e) => { if (!disabled) e.currentTarget.style.boxShadow = NEU_BTN; }}
        onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.boxShadow = NEU_BTN; }}
      >
        Stand
      </button>

      {/* Double Down */}
      {canDoubleDown && (
        <button
          onClick={onDoubleDown}
          disabled={disabled}
          className={btnClass}
          style={{
            padding: '10px 16px',
            background: COLORS.bg,
            color: COLORS.textSecondary,
            boxShadow: disabled ? 'none' : NEU_BTN,
            opacity: disabled ? 0.4 : 1,
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          onMouseDown={(e) => { if (!disabled) e.currentTarget.style.boxShadow = NEU_BTN_ACTIVE; }}
          onMouseUp={(e) => { if (!disabled) e.currentTarget.style.boxShadow = NEU_BTN; }}
          onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.boxShadow = NEU_BTN; }}
        >
          2x
        </button>
      )}

      {/* Split */}
      {canSplit && (
        <button
          onClick={onSplit}
          disabled={disabled}
          className={btnClass}
          style={{
            padding: '10px 16px',
            background: COLORS.bg,
            color: COLORS.textSecondary,
            boxShadow: disabled ? 'none' : NEU_BTN,
            opacity: disabled ? 0.4 : 1,
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          onMouseDown={(e) => { if (!disabled) e.currentTarget.style.boxShadow = NEU_BTN_ACTIVE; }}
          onMouseUp={(e) => { if (!disabled) e.currentTarget.style.boxShadow = NEU_BTN; }}
          onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.boxShadow = NEU_BTN; }}
        >
          Split
        </button>
      )}
    </div>
  );
};
