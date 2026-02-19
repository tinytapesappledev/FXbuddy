import React, { useEffect, useRef, useState } from 'react';
import { CreditIcon } from './CreditIcon';

interface CreditBadgeProps {
  credits: number | null;
  onClick?: () => void;
}

export const CreditBadge: React.FC<CreditBadgeProps> = ({ credits, onClick }) => {
  const [displayCredits, setDisplayCredits] = useState(credits ?? 0);
  const prevCreditsRef = useRef(credits ?? 0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (credits == null) return;

    const from = prevCreditsRef.current;
    const to = credits;
    prevCreditsRef.current = to;

    if (from === to) {
      setDisplayCredits(to);
      return;
    }

    const duration = 600;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayCredits(Math.round(from + (to - from) * eased));
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [credits]);

  const isLow = credits != null && credits > 0 && credits < 10;
  const isEmpty = credits != null && credits <= 0;

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums
        transition-all duration-200 cursor-pointer
        ${isEmpty
          ? 'bg-red-50 text-red-500 shadow-neu-pressed'
          : isLow
            ? 'bg-amber-50 text-amber-600 shadow-neu-pressed animate-pulse-slow'
            : 'bg-base text-neu-text shadow-neu-pressed hover:shadow-neu-button'
        }
      `}
      title={isEmpty ? 'Out of credits — buy more or upgrade' : isLow ? 'Running low on credits' : 'View credits & settings'}
    >
      <span>{credits != null ? displayCredits : '—'}</span>
      <CreditIcon size={10} className="opacity-50" />
    </button>
  );
};
