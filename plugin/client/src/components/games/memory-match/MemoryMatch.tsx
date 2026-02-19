import React from 'react';
import { MiniGameProps } from '../types';
import { useMemoryGame, ExpressionId } from './useMemoryGame';
import { ArrowLeft, RotateCcw } from 'lucide-react';

const MascotExpression: React.FC<{ expression: ExpressionId; size?: number }> = ({ expression, size = 56 }) => {
  const bodyW = size;
  const bodyH = size * 0.65;
  const vb = `0 0 ${bodyW} ${bodyH}`;
  const cx1 = bodyW * 0.35;
  const cx2 = bodyW * 0.65;
  const cy = bodyH * 0.5;
  const rx = bodyW * 0.09;
  const ry = bodyH * 0.18;

  const renderEyes = () => {
    switch (expression) {
      case 'happy':
        return (
          <>
            <path d={`M${cx1 - rx * 1.2} ${cy + ry * 0.5} Q${cx1} ${cy - ry * 1.5} ${cx1 + rx * 1.2} ${cy + ry * 0.5}`} stroke="var(--mascot-face)" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d={`M${cx2 - rx * 1.2} ${cy + ry * 0.5} Q${cx2} ${cy - ry * 1.5} ${cx2 + rx * 1.2} ${cy + ry * 0.5}`} stroke="var(--mascot-face)" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        );
      case 'star':
        return (
          <>
            <polygon points={starPoints(cx1, cy, rx * 1.5)} fill="var(--mascot-face)" />
            <polygon points={starPoints(cx2, cy, rx * 1.5)} fill="var(--mascot-face)" />
          </>
        );
      case 'error':
        return (
          <>
            <line x1={cx1 - rx} y1={cy - ry} x2={cx1 + rx} y2={cy + ry} stroke="var(--mascot-face)" strokeWidth="2" strokeLinecap="round" />
            <line x1={cx1 + rx} y1={cy - ry} x2={cx1 - rx} y2={cy + ry} stroke="var(--mascot-face)" strokeWidth="2" strokeLinecap="round" />
            <line x1={cx2 - rx} y1={cy - ry} x2={cx2 + rx} y2={cy + ry} stroke="var(--mascot-face)" strokeWidth="2" strokeLinecap="round" />
            <line x1={cx2 + rx} y1={cy - ry} x2={cx2 - rx} y2={cy + ry} stroke="var(--mascot-face)" strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case 'sleeping':
        return (
          <>
            <path d={`M${cx1 - rx} ${cy} Q${cx1} ${cy - ry * 0.8} ${cx1 + rx} ${cy}`} stroke="var(--mascot-face)" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d={`M${cx2 - rx} ${cy} Q${cx2} ${cy - ry * 0.8} ${cx2 + rx} ${cy}`} stroke="var(--mascot-face)" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        );
      case 'spiral':
        return (
          <>
            <circle cx={cx1} cy={cy} r={rx * 1.2} fill="var(--mascot-face)" />
            <path d={`M${cx1} ${cy - rx} A${rx * 0.7} ${rx * 0.7} 0 0 1 ${cx1 + rx * 0.7} ${cy} A${rx * 0.4} ${rx * 0.4} 0 0 1 ${cx1} ${cy + rx * 0.2}`} stroke="var(--mascot-body)" strokeWidth="1.5" fill="none" />
            <circle cx={cx2} cy={cy} r={rx * 1.2} fill="var(--mascot-face)" />
            <path d={`M${cx2} ${cy - rx} A${rx * 0.7} ${rx * 0.7} 0 0 1 ${cx2 + rx * 0.7} ${cy} A${rx * 0.4} ${rx * 0.4} 0 0 1 ${cx2} ${cy + rx * 0.2}`} stroke="var(--mascot-body)" strokeWidth="1.5" fill="none" />
          </>
        );
      case 'idle':
      default:
        return (
          <>
            <ellipse cx={cx1} cy={cy} rx={rx} ry={ry} fill="var(--mascot-face)" />
            <ellipse cx={cx2} cy={cy} rx={rx} ry={ry} fill="var(--mascot-face)" />
          </>
        );
    }
  };

  return (
    <svg width={bodyW} height={bodyH} viewBox={vb}>
      <rect x="0" y="0" width={bodyW} height={bodyH} rx={bodyH * 0.28} fill="var(--mascot-body)" />
      {renderEyes()}
    </svg>
  );
};

function starPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 2) * -1 + (Math.PI / 5) * i;
    const rad = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${cx + Math.cos(angle) * rad},${cy + Math.sin(angle) * rad}`);
  }
  return pts.join(' ');
}

export const MemoryMatch: React.FC<MiniGameProps> = ({ onExit }) => {
  const { cards, moves, best, won, matchedCount, totalPairs, flipCard, restart } = useMemoryGame();

  return (
    <div className="w-full h-full bg-base flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-md flex flex-col items-center px-4 py-4 gap-4">
        {/* Header */}
        <div className="flex items-center w-full">
          <button
            onClick={onExit}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-base shadow-neu-button hover:shadow-neu-button-active active:scale-95 transition-all"
            title="Back"
          >
            <ArrowLeft size={14} className="text-neu-text" />
          </button>
          <h2 className="flex-1 text-center text-base font-bold text-neu-text font-syne">Buddy Match</h2>
          <button
            onClick={restart}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-base shadow-neu-button hover:shadow-neu-button-active active:scale-95 transition-all"
            title="Restart"
          >
            <RotateCcw size={14} className="text-neu-text" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <span className="text-[10px] text-neu-text-light block">Moves</span>
            <span className="text-sm font-bold text-neu-text">{moves}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-neu-text-light block">Matched</span>
            <span className="text-sm font-bold text-neu-text">{matchedCount}/{totalPairs}</span>
          </div>
          {best > 0 && (
            <div className="text-center">
              <span className="text-[10px] text-neu-text-light block">Best</span>
              <span className="text-sm font-bold text-neu-text">{best}</span>
            </div>
          )}
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-4 gap-2.5 w-full" style={{ maxWidth: 300 }}>
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => flipCard(card.id)}
              disabled={card.flipped || card.matched}
              className="aspect-[3/4] rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center overflow-hidden"
              style={{
                background: 'var(--bg-base)',
                boxShadow: card.flipped || card.matched
                  ? 'var(--shadow-neu-button)'
                  : 'var(--shadow-neu-pressed)',
                border: card.matched ? '2px solid var(--status-success)' : '2px solid transparent',
                opacity: card.matched ? 0.7 : 1,
                cursor: card.flipped || card.matched ? 'default' : 'pointer',
              }}
            >
              {card.flipped || card.matched ? (
                <MascotExpression expression={card.expression} size={52} />
              ) : (
                <svg width="28" height="18" viewBox="0 0 28 18">
                  <rect x="0" y="0" width="28" height="18" rx="5" fill="var(--mascot-body)" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Win overlay */}
        {won && (
          <div className="flex flex-col items-center gap-3 py-4 animate-fade-in">
            <MascotExpression expression="happy" size={64} />
            <span className="text-lg font-bold text-neu-text font-syne">Nice one!</span>
            <span className="text-sm text-neu-text-light">Completed in {moves} moves</span>
            <button
              onClick={restart}
              className="px-6 py-2.5 rounded-full bg-base text-sm font-bold text-neu-text shadow-neu-button hover:shadow-neu-button-active active:scale-95 transition-all font-syne"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
