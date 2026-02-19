export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type Rank =
  | 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K';

export interface CardType {
  suit: Suit;
  rank: Rank;
  id: string;
  faceUp: boolean;
}

export type GamePhase = 'betting' | 'playerTurn' | 'dealerTurn' | 'resolved';

export type HandResult = 'blackjack' | 'win' | 'lose' | 'push' | 'bust' | null;

export type DealerExpression =
  | 'idle'
  | 'dealing'
  | 'playerBlackjack'
  | 'playerBust'
  | 'playerWin'
  | 'dealerWin'
  | 'dealerBust'
  | 'push'
  | 'hotStreak'
  | 'generationComplete';

export interface HandState {
  cards: CardType[];
  bet: number;
  result: HandResult;
  isDoubledDown: boolean;
}

export interface VFXBuddyBlackjackProps {
  isVisible: boolean;
  renderTimeRemaining: number | null;
  generationComplete: boolean;
  onExit: () => void;
}
