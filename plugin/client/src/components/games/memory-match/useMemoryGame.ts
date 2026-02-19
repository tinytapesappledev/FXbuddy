import { useState, useCallback, useRef } from 'react';

const STORAGE_KEY = 'fxbuddy-memory-best';

export type ExpressionId = 'happy' | 'star' | 'error' | 'sleeping' | 'spiral' | 'idle';

export interface MemoryCard {
  id: number;
  expression: ExpressionId;
  flipped: boolean;
  matched: boolean;
}

const EXPRESSIONS: ExpressionId[] = ['happy', 'star', 'error', 'sleeping', 'spiral', 'idle'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(): MemoryCard[] {
  const pairs = [...EXPRESSIONS, ...EXPRESSIONS];
  const shuffled = shuffle(pairs);
  return shuffled.map((expression, i) => ({
    id: i,
    expression,
    flipped: false,
    matched: false,
  }));
}

export function useMemoryGame() {
  const [cards, setCards] = useState<MemoryCard[]>(buildDeck);
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });
  const [won, setWon] = useState(false);
  const lockRef = useRef(false);

  const flipCard = useCallback((id: number) => {
    if (lockRef.current) return;

    setCards((prev) => {
      const card = prev.find((c) => c.id === id);
      if (!card || card.flipped || card.matched) return prev;

      const flippedCards = prev.filter((c) => c.flipped && !c.matched);
      if (flippedCards.length >= 2) return prev;

      const next = prev.map((c) => (c.id === id ? { ...c, flipped: true } : c));
      const nowFlipped = next.filter((c) => c.flipped && !c.matched);

      if (nowFlipped.length === 2) {
        lockRef.current = true;
        const [a, b] = nowFlipped;

        setMoves((m) => m + 1);

        if (a.expression === b.expression) {
          setTimeout(() => {
            setCards((cur) => {
              const updated = cur.map((c) =>
                c.id === a.id || c.id === b.id ? { ...c, matched: true } : c,
              );
              if (updated.every((c) => c.matched)) {
                setWon(true);
                const finalMoves = updated.length / 2; // will be set by the moves+1 above
                setMoves((m) => {
                  if (m > 0 && (best === 0 || m < best)) {
                    setBest(m);
                    localStorage.setItem(STORAGE_KEY, String(m));
                  }
                  return m;
                });
              }
              lockRef.current = false;
              return updated;
            });
          }, 400);
        } else {
          setTimeout(() => {
            setCards((cur) =>
              cur.map((c) =>
                c.id === a.id || c.id === b.id ? { ...c, flipped: false } : c,
              ),
            );
            lockRef.current = false;
          }, 800);
        }
      }

      return next;
    });
  }, [best]);

  const restart = useCallback(() => {
    lockRef.current = false;
    setCards(buildDeck());
    setMoves(0);
    setWon(false);
  }, []);

  const matchedCount = cards.filter((c) => c.matched).length / 2;

  return { cards, moves, best, won, matchedCount, totalPairs: 6, flipCard, restart };
}
