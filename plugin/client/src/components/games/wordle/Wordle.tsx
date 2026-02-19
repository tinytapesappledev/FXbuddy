import React, { useEffect, useCallback } from 'react';
import { MiniGameProps } from '../types';
import { useWordleGame, LetterState, GameState } from './useWordleGame';
import { ArrowLeft, RotateCcw, Delete } from 'lucide-react';

const KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'back'],
];

const MiniMascot: React.FC<{ gameState: GameState; guessCount: number }> = ({ gameState, guessCount }) => {
  const renderEyes = () => {
    if (gameState === 'won') {
      return (
        <>
          <polygon points="15,8 16.2,11 19.5,11.3 17,13.2 17.7,16.5 15,14.8 12.3,16.5 13,13.2 10.5,11.3 13.8,11" fill="var(--mascot-face)" />
          <polygon points="33,8 34.2,11 37.5,11.3 35,13.2 35.7,16.5 33,14.8 30.3,16.5 31,13.2 28.5,11.3 31.8,11" fill="var(--mascot-face)" />
        </>
      );
    }
    if (gameState === 'lost') {
      return (
        <>
          <line x1="12" y1="9" x2="18" y2="15" stroke="var(--mascot-face)" strokeWidth="2" strokeLinecap="round" />
          <line x1="18" y1="9" x2="12" y2="15" stroke="var(--mascot-face)" strokeWidth="2" strokeLinecap="round" />
          <line x1="30" y1="9" x2="36" y2="15" stroke="var(--mascot-face)" strokeWidth="2" strokeLinecap="round" />
          <line x1="36" y1="9" x2="30" y2="15" stroke="var(--mascot-face)" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    }
    if (guessCount > 0 && guessCount < 6) {
      return (
        <>
          <ellipse cx="15" cy="12" rx="4.5" ry={6 - guessCount * 0.4} fill="var(--mascot-face)" />
          <ellipse cx="33" cy="12" rx="4.5" ry={6 - guessCount * 0.4} fill="var(--mascot-face)" />
        </>
      );
    }
    return (
      <>
        <ellipse cx="15" cy="12" rx="4.5" ry="6" fill="var(--mascot-face)" />
        <ellipse cx="33" cy="12" rx="4.5" ry="6" fill="var(--mascot-face)" />
      </>
    );
  };

  return (
    <svg width="48" height="24" viewBox="0 0 48 24">
      <rect x="0" y="0" width="48" height="24" rx="8" fill="var(--mascot-body)" />
      {renderEyes()}
    </svg>
  );
};

function tileColor(state: LetterState): string {
  switch (state) {
    case 'correct': return 'var(--status-success)';
    case 'present': return 'var(--status-present)';
    case 'absent': return 'var(--glass-3)';
    default: return 'transparent';
  }
}

function tileTextColor(state: LetterState): string {
  switch (state) {
    case 'correct':
    case 'present':
      return '#ffffff';
    default:
      return 'var(--text-primary)';
  }
}

function keyBg(state: LetterState | undefined): string {
  if (!state) return 'var(--bg-base)';
  switch (state) {
    case 'correct': return 'var(--status-success)';
    case 'present': return 'var(--status-present)';
    case 'absent': return 'var(--glass-3)';
    default: return 'var(--bg-base)';
  }
}

function keyTextColor(state: LetterState | undefined): string {
  if (state === 'correct' || state === 'present') return '#ffffff';
  return 'var(--text-primary)';
}

export const Wordle: React.FC<MiniGameProps> = ({ onExit }) => {
  const {
    answer, guesses, currentInput, gameState, stats, shakeRow,
    letterStates, addLetter, removeLetter, submitGuess, restart,
  } = useWordleGame();

  const keyMap = letterStates();

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Enter') { submitGuess(); return; }
    if (e.key === 'Backspace') { removeLetter(); return; }
    if (/^[a-zA-Z]$/.test(e.key)) { addLetter(e.key); }
  }, [submitGuess, removeLetter, addLetter]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const renderGrid = () => {
    const rows: React.ReactNode[] = [];
    for (let r = 0; r < 6; r++) {
      const isCurrentRow = r === guesses.length && gameState === 'playing';
      const guess = guesses[r];
      const tiles: React.ReactNode[] = [];

      for (let c = 0; c < 5; c++) {
        let letter = '';
        let state: LetterState = 'empty';

        if (guess) {
          letter = guess[c].letter;
          state = guess[c].state;
        } else if (isCurrentRow && c < currentInput.length) {
          letter = currentInput[c];
        }

        const hasLetter = letter !== '';
        const isRevealed = !!guess;

        tiles.push(
          <div
            key={c}
            className="flex items-center justify-center text-sm font-bold uppercase rounded-lg transition-all duration-200"
            style={{
              width: 40,
              height: 44,
              background: isRevealed ? tileColor(state) : 'var(--bg-base)',
              color: isRevealed ? tileTextColor(state) : 'var(--text-primary)',
              boxShadow: hasLetter && !isRevealed
                ? 'var(--shadow-neu-button)'
                : isRevealed
                  ? 'none'
                  : 'var(--shadow-neu-pressed)',
              transform: hasLetter && !isRevealed ? 'scale(1.05)' : 'scale(1)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {letter}
          </div>,
        );
      }

      rows.push(
        <div
          key={r}
          className={`flex gap-1.5 justify-center ${isCurrentRow && shakeRow ? 'animate-shake' : ''}`}
        >
          {tiles}
        </div>,
      );
    }
    return rows;
  };

  const renderKeyboard = () => {
    return KEYBOARD_ROWS.map((row, ri) => (
      <div key={ri} className="flex gap-1 justify-center">
        {row.map((key) => {
          const isEnter = key === 'enter';
          const isBack = key === 'back';
          const state = keyMap[key];

          return (
            <button
              key={key}
              onClick={() => {
                if (isEnter) submitGuess();
                else if (isBack) removeLetter();
                else addLetter(key);
              }}
              className="flex items-center justify-center rounded-lg text-xs font-bold uppercase transition-all active:scale-95"
              style={{
                width: isEnter || isBack ? 42 : 28,
                height: 36,
                background: isEnter || isBack ? 'var(--bg-base)' : keyBg(state),
                color: isEnter || isBack ? 'var(--text-primary)' : keyTextColor(state),
                boxShadow: 'var(--shadow-neu-button)',
                fontSize: isEnter ? 9 : 11,
              }}
            >
              {isBack ? <Delete size={14} /> : key}
            </button>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="w-full h-full bg-base flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-md flex flex-col items-center px-4 py-3 gap-3 flex-1">
        {/* Header */}
        <div className="flex items-center w-full">
          <button
            onClick={onExit}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-base shadow-neu-button hover:shadow-neu-button-active active:scale-95 transition-all"
          >
            <ArrowLeft size={14} className="text-neu-text" />
          </button>
          <h2 className="flex-1 text-center text-base font-bold text-neu-text font-syne">Buddy Words</h2>
          <button
            onClick={restart}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-base shadow-neu-button hover:shadow-neu-button-active active:scale-95 transition-all"
          >
            <RotateCcw size={14} className="text-neu-text" />
          </button>
        </div>

        {/* Mascot */}
        <MiniMascot gameState={gameState} guessCount={guesses.length} />

        {/* Grid */}
        <div className="flex flex-col gap-1.5">
          {renderGrid()}
        </div>

        {/* Result overlay */}
        {gameState !== 'playing' && (
          <div className="flex flex-col items-center gap-2 py-2 animate-fade-in">
            <span className="text-sm font-bold text-neu-text font-syne">
              {gameState === 'won' ? 'Nice!' : `The word was ${answer.toUpperCase()}`}
            </span>
            <div className="flex gap-4 text-[10px] text-neu-text-light">
              <span>Played: {stats.played}</span>
              <span>Win: {stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0}%</span>
              <span>Streak: {stats.streak}</span>
            </div>
            <button
              onClick={restart}
              className="px-5 py-2 rounded-full bg-base text-xs font-bold text-neu-text shadow-neu-button hover:shadow-neu-button-active active:scale-95 transition-all font-syne"
            >
              New Word
            </button>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Keyboard */}
        <div className="flex flex-col gap-1 pb-2 w-full">
          {renderKeyboard()}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        .animate-shake { animation: shake 0.4s ease; }
      `}</style>
    </div>
  );
};
