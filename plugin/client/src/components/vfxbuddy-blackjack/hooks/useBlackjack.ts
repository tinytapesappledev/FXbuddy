import { useState, useCallback, useRef, useEffect } from 'react';
import { CardType, GamePhase, HandResult, HandState } from '../types/game';
import { useDeck } from './useDeck';
import { useStreakTracker } from './useStreakTracker';
import {
  handValue,
  handValueAll,
  isBlackjack,
  isBust,
  canSplit as canSplitCards,
} from '../utils/cardUtils';
import {
  INITIAL_CHIPS,
  MIN_BET,
  MAX_BET,
  BLACKJACK_PAYOUT,
  DEBOUNCE_MS,
} from '../utils/constants';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function emptyHand(): HandState {
  return { cards: [], bet: 0, result: null, isDoubledDown: false };
}

function resolveAllHands(
  hands: HandState[],
  dealer: CardType[],
): {
  resolved: HandState[];
  overall: HandResult;
  message: string;
  winnings: number;
} {
  const dv = handValueAll(dealer).value;
  const dealerBusted = dv > 21;
  let winnings = 0;

  const resolved = hands.map((h) => {
    if (h.result === 'bust') return h;
    const pv = handValueAll(h.cards).value;
    let result: HandResult;

    if (dealerBusted) {
      result = 'win';
      winnings += h.bet * 2;
    } else if (pv > dv) {
      result = 'win';
      winnings += h.bet * 2;
    } else if (pv < dv) {
      result = 'lose';
    } else {
      result = 'push';
      winnings += h.bet;
    }
    return { ...h, result };
  });

  const active = resolved.filter((h) => h.result !== 'bust');
  const results = active.map((h) => h.result);
  let overall: HandResult;
  let message: string;

  if (resolved.every((h) => h.result === 'bust')) {
    overall = 'bust';
    message = 'Bust!';
  } else if (dealerBusted) {
    overall = 'win';
    message = 'Dealer busts!';
  } else if (results.every((r) => r === 'win')) {
    overall = 'win';
    message = 'You win!';
  } else if (results.every((r) => r === 'lose')) {
    overall = 'lose';
    message = 'Dealer wins';
  } else if (results.every((r) => r === 'push')) {
    overall = 'push';
    message = 'Push!';
  } else {
    const w = results.filter((r) => r === 'win').length;
    const l = results.filter((r) => r === 'lose').length;
    overall = w >= l ? 'win' : 'lose';
    message = w >= l ? 'Split: net win!' : 'Split: net loss';
  }

  return { resolved, overall, message, winnings };
}

export function useBlackjack(
  generationComplete: boolean,
) {
  const { drawCard } = useDeck();
  const streak = useStreakTracker();

  const [phase, setPhase] = useState<GamePhase>('betting');
  const [playerHands, setPlayerHands] = useState<HandState[]>([emptyHand()]);
  const [activeHandIndex, setActiveHandIndex] = useState(0);
  const [dealerCards, setDealerCards] = useState<CardType[]>([]);
  const [chips, setChips] = useState(INITIAL_CHIPS);
  const [currentBet, setCurrentBet] = useState(MIN_BET);
  const [result, setResult] = useState<HandResult>(null);
  const [resultMessage, setResultMessage] = useState('');
  const [showRefillMessage, setShowRefillMessage] = useState(false);
  const [genNoticeReady, setGenNoticeReady] = useState(false);

  // Refs to avoid stale closures in async dealer play
  const drawCardRef = useRef(drawCard);
  drawCardRef.current = drawCard;
  const playerHandsRef = useRef(playerHands);
  playerHandsRef.current = playerHands;
  const dealerCardsRef = useRef(dealerCards);
  dealerCardsRef.current = dealerCards;
  const chipsRef = useRef(chips);
  chipsRef.current = chips;
  const activeHandIndexRef = useRef(activeHandIndex);
  activeHandIndexRef.current = activeHandIndex;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const currentBetRef = useRef(currentBet);
  currentBetRef.current = currentBet;
  const streakRef = useRef(streak);
  streakRef.current = streak;

  // Debounce
  const lastAction = useRef(0);
  const isDebounced = useCallback((): boolean => {
    const now = Date.now();
    if (now - lastAction.current < DEBOUNCE_MS) return true;
    lastAction.current = now;
    return false;
  }, []);

  // Generation complete flag
  useEffect(() => {
    if (generationComplete) setGenNoticeReady(true);
  }, [generationComplete]);

  // Chip refill
  const refillIfNeeded = useCallback(() => {
    if (chipsRef.current < MIN_BET) {
      setChips(INITIAL_CHIPS);
      chipsRef.current = INITIAL_CHIPS;
      setShowRefillMessage(true);
      setTimeout(() => setShowRefillMessage(false), 3000);
    }
  }, []);

  // Async dealer turn triggered by phase change
  useEffect(() => {
    if (phase !== 'dealerTurn') return;
    let cancelled = false;

    const playDealer = async () => {
      await delay(400);
      if (cancelled) return;

      let cards = dealerCardsRef.current.map((c) => ({ ...c, faceUp: true }));
      setDealerCards([...cards]);

      await delay(500);
      if (cancelled) return;

      while (handValueAll(cards).value < 17) {
        const nc = drawCardRef.current(true);
        cards = [...cards, nc];
        setDealerCards([...cards]);
        await delay(600);
        if (cancelled) return;
      }

      await delay(300);
      if (cancelled) return;

      const { resolved, overall, message, winnings } = resolveAllHands(
        playerHandsRef.current,
        cards,
      );

      setPlayerHands(resolved);
      setResult(overall);
      setResultMessage(message);
      setChips((prev) => prev + winnings);
      chipsRef.current = chipsRef.current + winnings;

      if (overall === 'win') {
        streakRef.current.recordWin();
      } else if (overall === 'push') {
        streakRef.current.recordPush();
      } else {
        streakRef.current.recordLoss();
      }

      setPhase('resolved');
    };

    playDealer();
    return () => {
      cancelled = true;
    };
  }, [phase]);

  // --- Actions ---

  const placeBet = useCallback((amount: number) => {
    if (phaseRef.current !== 'betting') return;
    const clamped = Math.min(amount, chipsRef.current, MAX_BET);
    setCurrentBet(clamped);
    currentBetRef.current = clamped;
  }, []);

  const deal = useCallback(() => {
    if (isDebounced()) return;
    if (phaseRef.current !== 'betting') return;
    const bet = currentBetRef.current;
    if (bet > chipsRef.current || bet < MIN_BET) return;

    setChips((prev) => prev - bet);
    chipsRef.current -= bet;

    const p1 = drawCardRef.current(true);
    const d1 = drawCardRef.current(true);
    const p2 = drawCardRef.current(true);
    const d2 = drawCardRef.current(false);

    const pCards = [p1, p2];
    const dCards = [d1, d2];

    const newHand: HandState = {
      cards: pCards,
      bet,
      result: null,
      isDoubledDown: false,
    };

    setPlayerHands([newHand]);
    setDealerCards(dCards);
    setActiveHandIndex(0);
    setResult(null);
    setResultMessage('');
    playerHandsRef.current = [newHand];
    dealerCardsRef.current = dCards;
    activeHandIndexRef.current = 0;

    const playerBJ = isBlackjack(pCards);
    const dealerBJ = isBlackjack(dCards);

    if (playerBJ || dealerBJ) {
      const revealed = dCards.map((c) => ({ ...c, faceUp: true }));
      setDealerCards(revealed);
      dealerCardsRef.current = revealed;

      if (playerBJ && dealerBJ) {
        setChips((prev) => prev + bet);
        chipsRef.current += bet;
        setResult('push');
        setResultMessage('Push!');
        setPlayerHands([{ ...newHand, result: 'push' }]);
        streakRef.current.recordPush();
      } else if (playerBJ) {
        const payout = bet + Math.floor(bet * BLACKJACK_PAYOUT);
        setChips((prev) => prev + payout);
        chipsRef.current += payout;
        setResult('blackjack');
        setResultMessage('Blackjack!');
        setPlayerHands([{ ...newHand, result: 'blackjack' }]);
        streakRef.current.recordWin();
      } else {
        setResult('lose');
        setResultMessage('Dealer Blackjack');
        setPlayerHands([{ ...newHand, result: 'lose' }]);
        streakRef.current.recordLoss();
      }
      setPhase('resolved');
      return;
    }

    setPhase('playerTurn');
    phaseRef.current = 'playerTurn';
  }, [isDebounced]);

  const finishPlayerTurn = useCallback(
    (hands: HandState[], currentIdx: number) => {
      if (hands.length > 1 && currentIdx < hands.length - 1) {
        const next = currentIdx + 1;
        setActiveHandIndex(next);
        activeHandIndexRef.current = next;
        return;
      }
      const allBusted = hands.every((h) => h.result === 'bust');
      if (allBusted) {
        setResult('bust');
        setResultMessage('Bust!');
        streakRef.current.recordLoss();
        setPhase('resolved');
      } else {
        setPhase('dealerTurn');
        phaseRef.current = 'dealerTurn';
      }
    },
    [],
  );

  const hit = useCallback(() => {
    if (isDebounced()) return;
    if (phaseRef.current !== 'playerTurn') return;

    const idx = activeHandIndexRef.current;
    const hands = [...playerHandsRef.current];
    const hand = { ...hands[idx] };
    const newCard = drawCardRef.current(true);
    hand.cards = [...hand.cards, newCard];

    const busted = isBust(hand.cards);
    const got21 = handValueAll(hand.cards).value === 21;

    if (busted) hand.result = 'bust';
    hands[idx] = hand;
    setPlayerHands(hands);
    playerHandsRef.current = hands;

    if (busted || got21) {
      finishPlayerTurn(hands, idx);
    }
  }, [isDebounced, finishPlayerTurn]);

  const stand = useCallback(() => {
    if (isDebounced()) return;
    if (phaseRef.current !== 'playerTurn') return;
    finishPlayerTurn(playerHandsRef.current, activeHandIndexRef.current);
  }, [isDebounced, finishPlayerTurn]);

  const doubleDown = useCallback(() => {
    if (isDebounced()) return;
    if (phaseRef.current !== 'playerTurn') return;

    const idx = activeHandIndexRef.current;
    const hands = [...playerHandsRef.current];
    const hand = { ...hands[idx] };

    if (hand.cards.length !== 2 || hand.isDoubledDown) return;
    if (chipsRef.current < hand.bet) return;

    setChips((prev) => prev - hand.bet);
    chipsRef.current -= hand.bet;

    const newCard = drawCardRef.current(true);
    hand.cards = [...hand.cards, newCard];
    hand.bet *= 2;
    hand.isDoubledDown = true;

    if (isBust(hand.cards)) hand.result = 'bust';
    hands[idx] = hand;
    setPlayerHands(hands);
    playerHandsRef.current = hands;

    finishPlayerTurn(hands, idx);
  }, [isDebounced, finishPlayerTurn]);

  const split = useCallback(() => {
    if (isDebounced()) return;
    if (phaseRef.current !== 'playerTurn') return;

    const idx = activeHandIndexRef.current;
    const hands = playerHandsRef.current;
    const hand = hands[idx];

    if (!canSplitCards(hand.cards) || hands.length > 1) return;
    if (chipsRef.current < hand.bet) return;

    setChips((prev) => prev - hand.bet);
    chipsRef.current -= hand.bet;

    const c1 = hand.cards[0];
    const c2 = hand.cards[1];
    const nc1 = drawCardRef.current(true);
    const nc2 = drawCardRef.current(true);

    const newHands: HandState[] = [
      { cards: [c1, nc1], bet: hand.bet, result: null, isDoubledDown: false },
      { cards: [c2, nc2], bet: hand.bet, result: null, isDoubledDown: false },
    ];

    setPlayerHands(newHands);
    playerHandsRef.current = newHands;
    setActiveHandIndex(0);
    activeHandIndexRef.current = 0;
  }, [isDebounced]);

  const newHand = useCallback(() => {
    if (generationComplete) return;
    refillIfNeeded();
    setPlayerHands([emptyHand()]);
    setDealerCards([]);
    setActiveHandIndex(0);
    setResult(null);
    setResultMessage('');
    setPhase('betting');
    phaseRef.current = 'betting';
    playerHandsRef.current = [emptyHand()];
    dealerCardsRef.current = [];
    activeHandIndexRef.current = 0;
  }, [generationComplete, refillIfNeeded]);

  const canDoubleDown = (): boolean => {
    if (phaseRef.current !== 'playerTurn') return false;
    const hand = playerHandsRef.current[activeHandIndexRef.current];
    if (!hand) return false;
    return hand.cards.length === 2 && !hand.isDoubledDown && chipsRef.current >= hand.bet;
  };

  const canSplitHand = (): boolean => {
    if (phaseRef.current !== 'playerTurn') return false;
    const hand = playerHandsRef.current[activeHandIndexRef.current];
    if (!hand) return false;
    return (
      canSplitCards(hand.cards) &&
      playerHandsRef.current.length === 1 &&
      chipsRef.current >= hand.bet
    );
  };

  return {
    state: {
      phase,
      playerHands,
      activeHandIndex,
      dealerCards,
      chips,
      currentBet,
      result,
      resultMessage,
      winStreak: streak.winStreak,
      showRefillMessage,
      showGenComplete: genNoticeReady && phase === 'resolved',
    },
    actions: {
      placeBet,
      deal,
      hit,
      stand,
      doubleDown,
      split,
      newHand,
      canDoubleDown,
      canSplitHand,
    },
  };
}
