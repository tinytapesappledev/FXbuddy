import React from 'react';
import { GameId } from './types';
import { Spade, Bird, LayoutGrid, Hash, ArrowLeft, LucideIcon } from 'lucide-react';

interface Props {
  onSelectGame: (game: GameId) => void;
  onExit: () => void;
}

const GAMES: { id: GameId; label: string; tagline: string; icon: LucideIcon }[] = [
  { id: 'blackjack', label: 'Blackjack', tagline: 'Beat the dealer', icon: Spade },
  { id: 'flappy', label: 'Flappy Buddy', tagline: 'Dodge the pipes', icon: Bird },
  { id: 'memory', label: 'Buddy Match', tagline: 'Find the pairs', icon: LayoutGrid },
  { id: 'wordle', label: 'Buddy Words', tagline: 'Guess the word', icon: Hash },
];

export const GameSelector: React.FC<Props> = ({ onSelectGame, onExit }) => {
  return (
    <div className="w-full h-full bg-base flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-md flex flex-col items-center px-6 py-8 gap-6">
        {/* Header */}
        <div className="flex items-center w-full">
          <button
            onClick={onExit}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-base shadow-neu-button hover:shadow-neu-button-active active:scale-95 transition-all"
            title="Back"
          >
            <ArrowLeft size={14} className="text-neu-text" />
          </button>
          <h2 className="flex-1 text-center text-lg font-bold text-neu-text font-syne pr-8">Games</h2>
        </div>

        {/* Mini mascot */}
        <div className="flex justify-center">
          <svg width="48" height="32" viewBox="0 0 48 32">
            <rect x="2" y="2" width="44" height="28" rx="10" fill="var(--mascot-body)" />
            <ellipse cx="17" cy="16" rx="5" ry="6" fill="var(--mascot-face)" />
            <ellipse cx="31" cy="16" rx="5" ry="6" fill="var(--mascot-face)" />
          </svg>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-2 gap-4 w-full">
          {GAMES.map((game) => {
            const Icon = game.icon;
            return (
              <button
                key={game.id}
                onClick={() => onSelectGame(game.id)}
                className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-base shadow-neu-button hover:shadow-neu-button-active active:scale-[0.97] transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-base shadow-neu-pressed flex items-center justify-center">
                  <Icon size={18} className="text-neu-accent" />
                </div>
                <span className="text-sm font-bold text-neu-text font-syne">{game.label}</span>
                <span className="text-[10px] text-neu-text-light">{game.tagline}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
