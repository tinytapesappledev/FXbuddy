import { useState, useCallback } from 'react';
import { getRandomWord, WORDS } from './words';

const STORAGE_KEY = 'fxbuddy-wordle-stats';

export type LetterState = 'correct' | 'present' | 'absent' | 'empty';
export type GameState = 'playing' | 'won' | 'lost';

export interface TileData {
  letter: string;
  state: LetterState;
}

interface Stats {
  played: number;
  wins: number;
  streak: number;
  maxStreak: number;
}

function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { played: 0, wins: 0, streak: 0, maxStreak: 0 };
}

function saveStats(stats: Stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function evaluateGuess(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = Array(5).fill('absent');
  const answerChars = answer.split('');
  const remaining: (string | null)[] = [...answerChars];

  // First pass: correct positions
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      result[i] = 'correct';
      remaining[i] = null;
    }
  }

  // Second pass: present but wrong position
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    const idx = remaining.indexOf(guess[i]);
    if (idx !== -1) {
      result[i] = 'present';
      remaining[idx] = null;
    }
  }

  return result;
}

export function useWordleGame() {
  const [answer, setAnswer] = useState(getRandomWord);
  const [guesses, setGuesses] = useState<TileData[][]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [gameState, setGameState] = useState<GameState>('playing');
  const [stats, setStats] = useState<Stats>(loadStats);
  const [shakeRow, setShakeRow] = useState(false);

  const letterStates = useCallback((): Record<string, LetterState> => {
    const map: Record<string, LetterState> = {};
    for (const row of guesses) {
      for (const tile of row) {
        if (!tile.letter) continue;
        const existing = map[tile.letter];
        if (tile.state === 'correct') {
          map[tile.letter] = 'correct';
        } else if (tile.state === 'present' && existing !== 'correct') {
          map[tile.letter] = 'present';
        } else if (!existing) {
          map[tile.letter] = tile.state;
        }
      }
    }
    return map;
  }, [guesses]);

  const addLetter = useCallback((letter: string) => {
    if (gameState !== 'playing') return;
    if (currentInput.length >= 5) return;
    setCurrentInput((prev) => prev + letter.toLowerCase());
  }, [gameState, currentInput]);

  const removeLetter = useCallback(() => {
    if (gameState !== 'playing') return;
    setCurrentInput((prev) => prev.slice(0, -1));
  }, [gameState]);

  const submitGuess = useCallback(() => {
    if (gameState !== 'playing') return;
    if (currentInput.length !== 5) {
      setShakeRow(true);
      setTimeout(() => setShakeRow(false), 500);
      return;
    }

    if (!WORDS.includes(currentInput)) {
      setShakeRow(true);
      setTimeout(() => setShakeRow(false), 500);
      return;
    }

    const states = evaluateGuess(currentInput, answer);
    const row: TileData[] = currentInput.split('').map((letter, i) => ({
      letter,
      state: states[i],
    }));

    const newGuesses = [...guesses, row];
    setGuesses(newGuesses);
    setCurrentInput('');

    if (currentInput === answer) {
      setGameState('won');
      const newStats = {
        ...stats,
        played: stats.played + 1,
        wins: stats.wins + 1,
        streak: stats.streak + 1,
        maxStreak: Math.max(stats.maxStreak, stats.streak + 1),
      };
      setStats(newStats);
      saveStats(newStats);
    } else if (newGuesses.length >= 6) {
      setGameState('lost');
      const newStats = {
        ...stats,
        played: stats.played + 1,
        streak: 0,
      };
      setStats(newStats);
      saveStats(newStats);
    }
  }, [gameState, currentInput, answer, guesses, stats]);

  const restart = useCallback(() => {
    setAnswer(getRandomWord());
    setGuesses([]);
    setCurrentInput('');
    setGameState('playing');
    setShakeRow(false);
  }, []);

  return {
    answer,
    guesses,
    currentInput,
    gameState,
    stats,
    shakeRow,
    letterStates,
    addLetter,
    removeLetter,
    submitGuess,
    restart,
  };
}
