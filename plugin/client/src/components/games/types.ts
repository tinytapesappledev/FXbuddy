export type GameId = 'selector' | 'blackjack' | 'flappy' | 'memory' | 'wordle';

export interface MiniGameProps {
  onExit: () => void;
}
