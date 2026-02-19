import { useCallback, useRef } from 'react';
import { CardType } from '../types/game';
import { createDeck, shuffleDeck } from '../utils/cardUtils';

let drawCounter = 0;

export function useDeck() {
  const deckRef = useRef<CardType[]>(shuffleDeck(createDeck()));

  const drawCard = useCallback((faceUp: boolean = true): CardType => {
    if (deckRef.current.length < 15) {
      deckRef.current = shuffleDeck(createDeck());
    }
    const card = deckRef.current.pop()!;
    return {
      ...card,
      faceUp,
      id: `${card.suit}-${card.rank}-${drawCounter++}`,
    };
  }, []);

  const resetDeck = useCallback(() => {
    deckRef.current = shuffleDeck(createDeck());
  }, []);

  return { drawCard, resetDeck };
}
