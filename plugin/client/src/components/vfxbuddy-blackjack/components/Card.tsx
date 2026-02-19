import React, { useState, useEffect } from 'react';
import { CardType } from '../types/game';
import { suitSymbol, isRedSuit } from '../utils/cardUtils';
import { COLORS } from '../utils/constants';

interface Props {
  card: CardType;
  index: number;
  glowColor?: string | null;
}

const CARD_W = 52;
const CARD_H = 72;

const NEU_SHADOW = 'var(--shadow-neu-icon)';
const NEU_SHADOW_ACTIVE = 'var(--shadow-neu-button)';

const cardStyle: React.CSSProperties = {
  width: CARD_W,
  height: CARD_H,
  perspective: '600px',
  flexShrink: 0,
};

const innerStyle = (flipped: boolean): React.CSSProperties => ({
  width: '100%',
  height: '100%',
  position: 'relative',
  transformStyle: 'preserve-3d',
  transition: 'transform 0.4s ease',
  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)',
});

const faceStyle: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  height: '100%',
  backfaceVisibility: 'hidden',
  borderRadius: 8,
};

export const PlayingCard: React.FC<Props> = ({ card, index, glowColor }) => {
  const [flipped, setFlipped] = useState(!card.faceUp);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFlipped(!card.faceUp);
      setEntered(true);
    }, index * 150 + 50);
    return () => clearTimeout(timer);
  }, [card.faceUp, index]);

  const suit = suitSymbol(card.suit);
  const red = isRedSuit(card.suit);
  const textColor = red ? COLORS.red : COLORS.textPrimary;

  return (
    <div
      style={{
        ...cardStyle,
        transform: entered ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.9)',
        opacity: entered ? 1 : 0,
        transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
        transitionDelay: `${index * 100}ms`,
      }}
    >
      <div style={innerStyle(flipped)}>
        {/* Card Front -- neumorphic raised surface */}
        <div
          style={{
            ...faceStyle,
            background: COLORS.cardFace,
            boxShadow: glowColor ? NEU_SHADOW_ACTIVE : NEU_SHADOW,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '4px 5px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
            <span style={{ color: textColor, fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
              {card.rank}
            </span>
            <span style={{ color: textColor, fontSize: 10, marginTop: -2 }}>{suit}</span>
          </div>

          <div style={{ textAlign: 'center', fontSize: 22, color: textColor, lineHeight: 1 }}>
            {suit}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              lineHeight: 1,
              transform: 'rotate(180deg)',
            }}
          >
            <span style={{ color: textColor, fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
              {card.rank}
            </span>
            <span style={{ color: textColor, fontSize: 10, marginTop: -2 }}>{suit}</span>
          </div>
        </div>

        {/* Card Back -- neumorphic surface with FXbuddy mascot icon */}
        <div
          style={{
            ...faceStyle,
            transform: 'rotateY(180deg)',
            background: COLORS.cardFace,
            boxShadow: NEU_SHADOW,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <svg width="30" height="22" viewBox="0 0 30 22">
            {/* Mini mascot face: black rounded rect + white oval eyes */}
            <rect x="1" y="1" width="28" height="20" rx="7" fill="var(--mascot-body)" />
            <ellipse cx="10.5" cy="11" rx="3" ry="3.5" fill="var(--mascot-face)" />
            <ellipse cx="19.5" cy="11" rx="3" ry="3.5" fill="var(--mascot-face)" />
          </svg>
        </div>
      </div>
    </div>
  );
};
