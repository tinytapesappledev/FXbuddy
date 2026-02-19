import React from 'react';
import { DealerExpression } from '../types/game';

interface Props {
  expression: DealerExpression;
  streak: number;
}

/* ── Eye sets (brand spec: white oval eyes, expression through shape only) ── */

const EyesIdle: React.FC<{ blink: boolean }> = ({ blink }) =>
  blink ? (
    <>
      <line x1="22" y1="38" x2="32" y2="38" stroke="var(--mascot-face)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="48" y1="38" x2="58" y2="38" stroke="var(--mascot-face)" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ) : (
    <>
      <ellipse cx="27" cy="38" rx="6" ry="7.5" fill="var(--mascot-face)" />
      <ellipse cx="53" cy="38" rx="6" ry="7.5" fill="var(--mascot-face)" />
    </>
  );

const EyesDealing: React.FC = () => (
  <>
    {/* Squinted / focused -- scaleY reduced */}
    <ellipse cx="27" cy="38" rx="6" ry="4" fill="var(--mascot-face)" />
    <ellipse cx="53" cy="38" rx="6" ry="4" fill="var(--mascot-face)" />
  </>
);

const EyesPlayerBlackjack: React.FC = () => (
  <>
    {/* Surprised -- wide eyes */}
    <ellipse cx="27" cy="38" rx="7.5" ry="9.5" fill="var(--mascot-face)" />
    <ellipse cx="53" cy="38" rx="7.5" ry="9.5" fill="var(--mascot-face)" />
  </>
);

const EyesPlayerBust: React.FC = () => (
  <>
    {/* X-eyes -- error state */}
    <line x1="23" y1="34" x2="31" y2="42" stroke="var(--mascot-face)" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="31" y1="34" x2="23" y2="42" stroke="var(--mascot-face)" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="49" y1="34" x2="57" y2="42" stroke="var(--mascot-face)" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="57" y1="34" x2="49" y2="42" stroke="var(--mascot-face)" strokeWidth="2.5" strokeLinecap="round" />
  </>
);

const EyesPlayerWin: React.FC = () => (
  <>
    {/* Happy arc eyes -- ^_^ */}
    <path d="M21 41 Q27 31 33 41" stroke="var(--mascot-face)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M47 41 Q53 31 59 41" stroke="var(--mascot-face)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </>
);

const EyesDealerWin: React.FC = () => (
  <>
    {/* One normal, one winking -- sheepish */}
    <ellipse cx="27" cy="38" rx="6" ry="7.5" fill="var(--mascot-face)" />
    <path d="M47 38 Q53 34 59 38" stroke="var(--mascot-face)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </>
);

const EyesDealerBust: React.FC = () => (
  <>
    {/* Surprised / embarrassed -- wide */}
    <ellipse cx="27" cy="38" rx="7" ry="9" fill="var(--mascot-face)" />
    <ellipse cx="53" cy="38" rx="7" ry="9" fill="var(--mascot-face)" />
  </>
);

const EyesPush: React.FC = () => (
  <>
    {/* Neutral -- standard ovals */}
    <ellipse cx="27" cy="38" rx="5.5" ry="6.5" fill="var(--mascot-face)" />
    <ellipse cx="53" cy="38" rx="5.5" ry="6.5" fill="var(--mascot-face)" />
  </>
);

const EyesHotStreak: React.FC<{ level: number }> = ({ level }) => (
  <>
    {/* Nervous eyes that get smaller / higher with more wins */}
    <ellipse
      cx="27"
      cy={37 - Math.min(level, 3)}
      rx={5 - Math.min(level * 0.3, 1)}
      ry={6 - Math.min(level * 0.4, 1.5)}
      fill="var(--mascot-face)"
    />
    <ellipse
      cx="53"
      cy={37 - Math.min(level, 3)}
      rx={5 - Math.min(level * 0.3, 1)}
      ry={6 - Math.min(level * 0.4, 1.5)}
      fill="var(--mascot-face)"
    />
  </>
);

const EyesGenComplete: React.FC = () => (
  <>
    {/* Happy arc eyes for generation complete */}
    <path d="M21 41 Q27 31 33 41" stroke="var(--mascot-face)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M47 41 Q53 31 59 41" stroke="var(--mascot-face)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </>
);

/* ── Accessories ── */

const SweatDrops: React.FC<{ count: number }> = ({ count }) => (
  <>
    <ellipse cx="64" cy="30" rx="2" ry="3" fill="var(--text-secondary)" opacity="0.5">
      <animate attributeName="cy" values="30;36;30" dur="1.2s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.5;0.15;0.5" dur="1.2s" repeatCount="indefinite" />
    </ellipse>
    {count >= 2 && (
      <ellipse cx="16" cy="32" rx="1.5" ry="2.5" fill="var(--text-secondary)" opacity="0.35">
        <animate attributeName="cy" values="32;38;32" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;0.1;0.35" dur="1.5s" repeatCount="indefinite" />
      </ellipse>
    )}
    {count >= 3 && (
      <ellipse cx="62" cy="46" rx="1.5" ry="2" fill="var(--text-secondary)" opacity="0.25">
        <animate attributeName="cy" values="46;51;46" dur="1s" repeatCount="indefinite" />
      </ellipse>
    )}
  </>
);

const Sparkles: React.FC = () => (
  <>
    <circle cx="14" cy="24" r="1.5" fill="var(--text-primary)" opacity="0.4">
      <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.5s" repeatCount="indefinite" />
      <animate attributeName="r" values="1.5;2;1.5" dur="1.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="66" cy="26" r="1" fill="var(--text-tertiary)" opacity="0.35">
      <animate attributeName="opacity" values="0.35;0.1;0.35" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="12" cy="50" r="1" fill="var(--text-primary)" opacity="0.25">
      <animate attributeName="opacity" values="0.25;0.05;0.25" dur="1.8s" repeatCount="indefinite" />
    </circle>
    <circle cx="68" cy="52" r="1.2" fill="var(--text-tertiary)" opacity="0.2">
      <animate attributeName="opacity" values="0.2;0.05;0.2" dur="1.3s" repeatCount="indefinite" />
    </circle>
  </>
);

const ShruggingArms: React.FC = () => (
  <>
    <path d="M8 56 Q5 51 10 48" stroke="var(--text-tertiary)" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M72 56 Q75 51 70 48" stroke="var(--text-tertiary)" strokeWidth="2" fill="none" strokeLinecap="round" />
  </>
);

const Earpiece: React.FC = () => (
  <>
    <circle cx="66" cy="34" r="3" fill="var(--text-primary)" opacity="0.6">
      <animate attributeName="opacity" values="0.6;0.3;0.6" dur="0.8s" repeatCount="indefinite" />
    </circle>
    <line x1="64" y1="32" x2="62" y2="28" stroke="var(--text-primary)" strokeWidth="1" opacity="0.4" />
  </>
);

/* ── Main export ── */

export const MascotFace: React.FC<Props> = ({ expression, streak }) => {
  const renderEyes = () => {
    switch (expression) {
      case 'idle': return <EyesIdle blink={false} />;
      case 'dealing': return <EyesDealing />;
      case 'playerBlackjack': return <EyesPlayerBlackjack />;
      case 'playerBust': return <EyesPlayerBust />;
      case 'playerWin': return <EyesPlayerWin />;
      case 'dealerWin': return <EyesDealerWin />;
      case 'dealerBust': return <EyesDealerBust />;
      case 'push': return <EyesPush />;
      case 'hotStreak': return <EyesHotStreak level={streak} />;
      case 'generationComplete': return <EyesGenComplete />;
      default: return <EyesIdle blink={false} />;
    }
  };

  const renderAccessories = () => {
    switch (expression) {
      case 'hotStreak':
        return <SweatDrops count={Math.min(streak - 2, 3)} />;
      case 'playerWin':
      case 'playerBlackjack':
        return <Sparkles />;
      case 'push':
        return <ShruggingArms />;
      case 'generationComplete':
        return <Earpiece />;
      case 'dealerBust':
        return <SweatDrops count={1} />;
      default:
        return null;
    }
  };

  return (
    <>
      {renderEyes()}
      {renderAccessories()}
    </>
  );
};

export const BlinkingEyes: React.FC = () => <EyesIdle blink={true} />;
