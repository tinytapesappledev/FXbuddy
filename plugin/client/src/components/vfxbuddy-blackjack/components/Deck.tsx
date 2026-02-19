import React from 'react';
import { COLORS } from '../utils/constants';

const NEU_SHADOW = 'var(--shadow-neu-icon)';
const NEU_SHADOW_LIGHT = 'var(--shadow-neu-icon)';

export const DeckStack: React.FC = () => (
  <div className="relative" style={{ width: 42, height: 58 }}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="absolute"
        style={{
          width: 42,
          height: 58,
          top: i * -1.5,
          left: i * 1.5,
          background: COLORS.cardFace,
          borderRadius: 6,
          boxShadow: i === 0 ? NEU_SHADOW : NEU_SHADOW_LIGHT,
          zIndex: 3 - i,
        }}
      >
        {i === 0 && (
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 42 58"
            className="absolute inset-0"
          >
            <rect x="8" y="16" width="26" height="18" rx="6" fill="var(--mascot-body)" />
            <ellipse cx="17" cy="25" rx="2.5" ry="3" fill="var(--mascot-face)" />
            <ellipse cx="25" cy="25" rx="2.5" ry="3" fill="var(--mascot-face)" />
          </svg>
        )}
      </div>
    ))}
  </div>
);
