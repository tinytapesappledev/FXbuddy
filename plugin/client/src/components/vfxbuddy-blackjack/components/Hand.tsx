import React from 'react';
import { CardType, HandResult } from '../types/game';
import { handValue } from '../utils/cardUtils';
import { PlayingCard } from './Card';
import { COLORS } from '../utils/constants';

interface Props {
  cards: CardType[];
  label: string;
  result?: HandResult;
  isActive?: boolean;
  showValue?: boolean;
}

export const Hand: React.FC<Props> = ({
  cards,
  label,
  result,
  isActive = false,
  showValue = true,
}) => {
  const hv = cards.length > 0 ? handValue(cards) : null;

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Cards row */}
      <div className="flex items-center justify-center" style={{ minHeight: 76 }}>
        {cards.map((card, i) => (
          <div
            key={card.id}
            style={{
              marginLeft: i > 0 ? -18 : 0,
              zIndex: i,
              position: 'relative',
            }}
          >
            <PlayingCard card={card} index={i} glowColor={result ? 'active' : null} />
          </div>
        ))}
        {cards.length === 0 && (
          <div
            className="rounded-lg flex items-center justify-center"
            style={{
              width: 52,
              height: 72,
              background: COLORS.bg,
              boxShadow: 'var(--shadow-neu-pressed)',
              opacity: 0.5,
            }}
          >
            <span style={{ color: COLORS.textDim, fontSize: 10 }}>?</span>
          </div>
        )}
      </div>

      {/* Hand info */}
      {showValue && cards.length > 0 && (
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium"
            style={{ color: COLORS.textPrimary, opacity: isActive ? 1 : 0.7 }}
          >
            {label}: {hv?.display}
          </span>
          {result && (
            <span
              className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
              style={{
                color:
                  result === 'win' || result === 'blackjack'
                    ? COLORS.green
                    : result === 'push'
                      ? COLORS.textSecondary
                      : COLORS.red,
                background:
                  result === 'win' || result === 'blackjack'
                    ? 'var(--status-success-bg)'
                    : result === 'push'
                      ? COLORS.secondaryDim
                      : 'var(--status-error-bg)',
              }}
            >
              {result === 'blackjack' ? 'BJ!' : result}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
