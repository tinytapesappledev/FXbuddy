import { CardType, Rank, Suit } from '../types/game';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let cardIdCounter = 0;

export function createDeck(): CardType[] {
  const deck: CardType[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `card-${cardIdCounter++}`, faceUp: false });
    }
  }
  return deck;
}

export function shuffleDeck(deck: CardType[]): CardType[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function cardNumericValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (rank === 'K' || rank === 'Q' || rank === 'J') return 10;
  return parseInt(rank, 10);
}

export function handValue(cards: CardType[]): {
  value: number;
  soft: boolean;
  display: string;
} {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (!card.faceUp) continue;
    total += cardNumericValue(card.rank);
    if (card.rank === 'A') aces++;
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  const soft = aces > 0 && total <= 21;
  const lowTotal = soft ? total - 10 : total;
  const display =
    soft && total !== 21 ? `${lowTotal} / ${total}` : `${total}`;

  return { value: total, soft, display };
}

export function handValueAll(cards: CardType[]): {
  value: number;
  soft: boolean;
} {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    total += cardNumericValue(card.rank);
    if (card.rank === 'A') aces++;
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return { value: total, soft: aces > 0 && total <= 21 };
}

export function isBlackjack(cards: CardType[]): boolean {
  return cards.length === 2 && handValueAll(cards).value === 21;
}

export function isBust(cards: CardType[]): boolean {
  return handValueAll(cards).value > 21;
}

export function canSplit(cards: CardType[]): boolean {
  return (
    cards.length === 2 &&
    cardNumericValue(cards[0].rank) === cardNumericValue(cards[1].rank)
  );
}

export function suitSymbol(suit: Suit): string {
  const map: Record<Suit, string> = {
    hearts: '\u2665',
    diamonds: '\u2666',
    clubs: '\u2663',
    spades: '\u2660',
  };
  return map[suit];
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}
