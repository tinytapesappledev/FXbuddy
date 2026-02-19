import { useState, useCallback, useRef } from 'react';

export function useStreakTracker() {
  const [winStreak, setWinStreak] = useState(0);

  const winStreakRef = useRef(winStreak);
  winStreakRef.current = winStreak;

  const recordWin = useCallback(() => {
    const newStreak = winStreakRef.current + 1;
    setWinStreak(newStreak);
    winStreakRef.current = newStreak;
  }, []);

  const recordLoss = useCallback(() => {
    setWinStreak(0);
    winStreakRef.current = 0;
  }, []);

  const recordPush = useCallback(() => {
    /* Push doesn't break or add to streak */
  }, []);

  return {
    winStreak,
    recordWin,
    recordLoss,
    recordPush,
  };
}
