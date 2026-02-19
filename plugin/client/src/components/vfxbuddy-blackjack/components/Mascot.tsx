import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DealerExpression } from '../types/game';

interface Props {
  expression: DealerExpression;
  streak: number;
}

/* ═══ Physics constants ═══ */
const SPRING = 0.065;
const DAMP = 0.8;
const MAX_MOVE = 5;
const IDLE_LOOK_MS = 2800;

/* ═══ Eye components (white shapes only — no pupils) ═══ */

/** Idle: simple white oval */
const EyeIdle: React.FC<{ blink: boolean }> = ({ blink }) => (
  <svg width="18" height="24" viewBox="0 0 18 24" className="transition-all duration-75">
    {blink ? (
      <path d="M 2 12 Q 9 12 16 12" stroke="var(--mascot-face)" strokeWidth="3" fill="none" strokeLinecap="round" />
    ) : (
      <ellipse cx="9" cy="12" rx="7" ry="9" fill="var(--mascot-face)" />
    )}
  </svg>
);

/** Dealing: squinted focus */
const EyeDealing: React.FC = () => (
  <svg width="18" height="14" viewBox="0 0 18 14">
    <ellipse cx="9" cy="7" rx="7" ry="5" fill="var(--mascot-face)" />
  </svg>
);

/** Shocked (player blackjack): huge wide eyes */
const EyeShocked: React.FC = () => (
  <svg width="22" height="28" viewBox="0 0 22 28">
    <ellipse cx="11" cy="14" rx="9" ry="12" fill="var(--mascot-face)" />
  </svg>
);

/** Smug (player bust): happy arcs ^_^ */
const EyeSmug: React.FC = () => (
  <svg width="18" height="14" viewBox="0 0 18 14">
    <path d="M3 12 Q9 0, 15 12" stroke="var(--mascot-face)" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

/** Annoyed (player wins): narrow squint */
const EyeAnnoyed: React.FC = () => (
  <svg width="18" height="12" viewBox="0 0 18 12">
    <ellipse cx="9" cy="6" rx="7" ry="4" fill="var(--mascot-face)" />
  </svg>
);

/** Proud (dealer wins): happy arc + wink combo */
const EyeProud: React.FC<{ isLeft: boolean }> = ({ isLeft }) =>
  isLeft ? (
    <svg width="18" height="14" viewBox="0 0 18 14">
      <path d="M3 12 Q9 2, 15 12" stroke="var(--mascot-face)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="18" height="14" viewBox="0 0 18 14">
      <path d="M3 8 Q9 4, 15 8" stroke="var(--mascot-face)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );

/** Embarrassed (dealer busts): X-eyes */
const EyeEmbarrassed: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <line x1="3" y1="3" x2="13" y2="13" stroke="var(--mascot-face)" strokeWidth="3" strokeLinecap="round" />
    <line x1="13" y1="3" x2="3" y2="13" stroke="var(--mascot-face)" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/** Nervous (hot streak): shrinking ovals */
const EyeNervous: React.FC<{ level: number }> = ({ level }) => {
  const ry = Math.max(5, 8 - level * 0.5);
  const rx = Math.max(4, 6.5 - level * 0.3);
  return (
    <svg width="18" height="22" viewBox="0 0 18 22">
      <ellipse cx="9" cy="11" rx={rx} ry={ry} fill="var(--mascot-face)" />
    </svg>
  );
};

/** Excited (generation complete): pulsing star eyes */
const EyeExcited: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 22 22">
    <polygon
      points="11,2 13,8 19.5,8 14.5,12 16.5,18.5 11,14.5 5.5,18.5 7.5,12 2.5,8 9,8"
      fill="var(--mascot-face)"
    >
      <animate attributeName="opacity" values="0.8;1;0.8" dur="1s" repeatCount="indefinite" />
    </polygon>
  </svg>
);

/* ═══ Accessory components ═══ */

const SweatDrops: React.FC<{ count: number }> = ({ count }) => (
  <div className="absolute -top-1 -right-3" style={{ pointerEvents: 'none' }}>
    <svg width="20" height="24" viewBox="0 0 20 24">
      <ellipse cx="10" cy="10" rx="3" ry="4.5" fill="var(--text-secondary)" opacity="0.45">
        <animate attributeName="cy" values="10;18;10" dur="1.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.45;0.1;0.45" dur="1.2s" repeatCount="indefinite" />
      </ellipse>
    </svg>
    {count >= 2 && (
      <svg
        width="16" height="20" viewBox="0 0 16 20"
        className="absolute -left-14 top-1" style={{ pointerEvents: 'none' }}
      >
        <ellipse cx="8" cy="8" rx="2.5" ry="3.5" fill="var(--text-secondary)" opacity="0.3">
          <animate attributeName="cy" values="8;15;8" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.08;0.3" dur="1.5s" repeatCount="indefinite" />
        </ellipse>
      </svg>
    )}
    {count >= 3 && (
      <svg
        width="14" height="18" viewBox="0 0 14 18"
        className="absolute -left-8 top-5" style={{ pointerEvents: 'none' }}
      >
        <ellipse cx="7" cy="7" rx="2" ry="3" fill="var(--text-secondary)" opacity="0.2">
          <animate attributeName="cy" values="7;13;7" dur="1s" repeatCount="indefinite" />
        </ellipse>
      </svg>
    )}
  </div>
);

const Sparkles: React.FC = () => (
  <div className="absolute -top-2 -right-4" style={{ pointerEvents: 'none' }}>
    <svg width="32" height="32" viewBox="0 0 32 32">
      <circle cx="6" cy="8" r="2" fill="var(--mascot-body)" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.08;0.3" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="r" values="2;2.8;2" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="24" cy="6" r="1.5" fill="var(--text-tertiary)" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.05;0.25" dur="2s" repeatCount="indefinite" />
        <animate attributeName="r" values="1.5;2.2;1.5" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="28" cy="24" r="1.5" fill="var(--mascot-body)" opacity="0.2">
        <animate attributeName="opacity" values="0.2;0.05;0.2" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="4" cy="26" r="1" fill="var(--text-tertiary)" opacity="0.15">
        <animate attributeName="opacity" values="0.15;0.4;0.15" dur="1.3s" repeatCount="indefinite" />
      </circle>
    </svg>
  </div>
);

const ShruggingArms: React.FC = () => (
  <div className="absolute -bottom-1 w-full" style={{ pointerEvents: 'none', left: -10 }}>
    <svg width="120" height="20" viewBox="0 0 120 20">
      <path d="M10 15 Q5 8 14 4" stroke="var(--text-tertiary)" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <animate
          attributeName="d"
          values="M10 15 Q5 8 14 4;M10 11 Q5 4 14 1;M10 15 Q5 8 14 4"
          dur="1.5s" repeatCount="indefinite"
        />
      </path>
      <path d="M110 15 Q115 8 106 4" stroke="var(--text-tertiary)" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <animate
          attributeName="d"
          values="M110 15 Q115 8 106 4;M110 11 Q115 4 106 1;M110 15 Q115 8 106 4"
          dur="1.5s" repeatCount="indefinite"
        />
      </path>
    </svg>
  </div>
);

const ExclamationMark: React.FC = () => (
  <div className="absolute -top-6 -right-1" style={{ pointerEvents: 'none' }}>
    <svg width="16" height="24" viewBox="0 0 16 24">
      <text
        x="8" y="18"
        fill="var(--mascot-body)" fontSize="18" fontWeight="900" textAnchor="middle" opacity="0"
      >
        !
        <animate attributeName="opacity" values="0;0.7;0.7" dur="0.3s" fill="freeze" />
        <animate attributeName="y" values="22;18" dur="0.3s" fill="freeze" />
      </text>
    </svg>
  </div>
);

const ThinkingDots: React.FC = () => (
  <div className="absolute -top-5 -right-6" style={{ pointerEvents: 'none' }}>
    <svg width="30" height="18" viewBox="0 0 30 18">
      <circle cx="7" cy="9" r="2.2" fill="var(--text-secondary)" opacity="0.15">
        <animate attributeName="opacity" values="0.1;0.5;0.1" dur="1.2s" begin="0s" repeatCount="indefinite" />
      </circle>
      <circle cx="15" cy="9" r="2.2" fill="var(--text-secondary)" opacity="0.15">
        <animate attributeName="opacity" values="0.1;0.5;0.1" dur="1.2s" begin="0.25s" repeatCount="indefinite" />
      </circle>
      <circle cx="23" cy="9" r="2.2" fill="var(--text-secondary)" opacity="0.15">
        <animate attributeName="opacity" values="0.1;0.5;0.1" dur="1.2s" begin="0.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  </div>
);

const Earpiece: React.FC = () => (
  <div className="absolute -top-1 -right-2" style={{ pointerEvents: 'none' }}>
    <svg width="16" height="20" viewBox="0 0 16 20">
      <circle cx="8" cy="8" r="4" fill="var(--mascot-body)" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="0.8s" repeatCount="indefinite" />
      </circle>
      <line x1="6" y1="6" x2="3" y2="2" stroke="var(--mascot-body)" strokeWidth="1.5" opacity="0.35" />
    </svg>
  </div>
);

/* ═══ Main DealerMascot ═══ */

export const DealerMascot: React.FC<Props> = ({ expression, streak }) => {
  const [blink, setBlink] = useState(false);
  const blinkTimer = useRef<ReturnType<typeof setTimeout>>();

  // Spring physics refs
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState(0);
  const [squash, setSquash] = useState({ sx: 1, sy: 1 });
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const lastMouseMove = useRef(Date.now());

  /* ── Blink (idle + push only) — pauses when panel is backgrounded ── */
  useEffect(() => {
    if (expression !== 'idle' && expression !== 'push') {
      setBlink(false);
      return;
    }

    let cancelled = false;

    const clearPending = () => {
      if (blinkTimer.current) { clearTimeout(blinkTimer.current); blinkTimer.current = undefined; }
    };

    const schedule = (delay: number) => {
      clearPending();
      blinkTimer.current = setTimeout(doBlink, delay);
    };

    const doBlink = () => {
      if (cancelled || document.hidden) return;

      setBlink(true);
      setTimeout(() => { if (!cancelled) setBlink(false); }, 140);

      if (Math.random() < 0.08) {
        setTimeout(() => {
          if (!cancelled && !document.hidden) {
            setBlink(true);
            setTimeout(() => { if (!cancelled) setBlink(false); }, 120);
          }
        }, 220);
      }

      schedule(3500 + Math.random() * 5000);
    };

    const onHidden = () => { clearPending(); setBlink(false); };
    const onVisible = () => { if (!cancelled) schedule(1800 + Math.random() * 2000); };

    const handleVisibility = () => { document.hidden ? onHidden() : onVisible(); };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', onHidden);
    window.addEventListener('focus', onVisible);

    schedule(1800 + Math.random() * 2000);

    return () => {
      cancelled = true;
      clearPending();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', onHidden);
      window.removeEventListener('focus', onVisible);
    };
  }, [expression]);

  /* ── Physics loop ── */
  useEffect(() => {
    const animate = () => {
      const dx = target.current.x - current.current.x;
      const dy = target.current.y - current.current.y;
      vel.current.x = (vel.current.x + dx * SPRING) * DAMP;
      vel.current.y = (vel.current.y + dy * SPRING) * DAMP;
      current.current.x += vel.current.x;
      current.current.y += vel.current.y;
      setPos({ x: current.current.x, y: current.current.y });
      setTilt(current.current.x * 0.6);

      const speed = Math.sqrt(vel.current.x ** 2 + vel.current.y ** 2);
      const s = Math.min(speed * 0.02, 0.08);
      setSquash({ sx: 1 - s, sy: 1 + s });

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ── Mouse tracking + idle look-around ── */
  useEffect(() => {
    const canTrack = expression === 'idle' || expression === 'push';

    const onMouse = (e: MouseEvent) => {
      lastMouseMove.current = Date.now();
      if (!containerRef.current || !canTrack) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const mx = ((e.clientX - cx) / window.innerWidth) * MAX_MOVE * 3;
      const my = ((e.clientY - cy) / window.innerHeight) * MAX_MOVE * 3;
      target.current = {
        x: Math.max(-MAX_MOVE, Math.min(MAX_MOVE, mx)),
        y: Math.max(-MAX_MOVE, Math.min(MAX_MOVE, my)),
      };
    };

    const idleTimer = setInterval(() => {
      if (Date.now() - lastMouseMove.current > 1200 && canTrack) {
        target.current = {
          x: (Math.random() - 0.5) * MAX_MOVE * 1.6,
          y: (Math.random() - 0.5) * MAX_MOVE * 1.6,
        };
      }
    }, IDLE_LOOK_MS);

    if (canTrack) {
      window.addEventListener('mousemove', onMouse);
    } else {
      target.current = { x: 0, y: 0 };
    }

    return () => {
      window.removeEventListener('mousemove', onMouse);
      clearInterval(idleTimer);
    };
  }, [expression]);

  /* ── Expression → body CSS animation ── */
  const animClass = useMemo(() => {
    switch (expression) {
      case 'playerBlackjack': return 'bj-m-shock';
      case 'playerBust': return 'bj-m-smug';
      case 'playerWin': return 'bj-m-annoyed';
      case 'dealerWin': return 'bj-m-proud';
      case 'dealerBust': return 'bj-m-embarrass';
      case 'push': return 'bj-m-shrug';
      case 'hotStreak': return 'bj-m-nervous';
      case 'generationComplete': return 'bj-m-excited';
      case 'dealing': return 'bj-m-dealing';
      default: return '';
    }
  }, [expression]);

  /* ── Expression → eye-group CSS animation ── */
  const eyeGroupClass = useMemo(() => {
    switch (expression) {
      case 'dealing': return 'bj-eye-sweep';
      case 'hotStreak': return 'bj-eye-dart';
      default: return '';
    }
  }, [expression]);

  const usePhysicsEyes = expression === 'idle' || expression === 'push';

  /* ── Render eyes ── */
  const renderEyes = () => {
    switch (expression) {
      case 'idle':
        return <><EyeIdle blink={blink} /><EyeIdle blink={blink} /></>;
      case 'dealing':
        return <><EyeDealing /><EyeDealing /></>;
      case 'playerBlackjack':
        return <><EyeShocked /><EyeShocked /></>;
      case 'playerBust':
        return <><EyeSmug /><EyeSmug /></>;
      case 'playerWin':
        return <><EyeAnnoyed /><EyeAnnoyed /></>;
      case 'dealerWin':
        return <><EyeProud isLeft={true} /><EyeProud isLeft={false} /></>;
      case 'dealerBust':
        return <><EyeEmbarrassed /><EyeEmbarrassed /></>;
      case 'push':
        return <><EyeIdle blink={blink} /><EyeIdle blink={blink} /></>;
      case 'hotStreak':
        return <><EyeNervous level={streak} /><EyeNervous level={streak} /></>;
      case 'generationComplete':
        return <><EyeExcited /><EyeExcited /></>;
      default:
        return <><EyeIdle blink={false} /><EyeIdle blink={false} /></>;
    }
  };

  /* ── Render accessories ── */
  const renderAccessories = () => {
    switch (expression) {
      case 'playerBlackjack':
        return <><SweatDrops count={2} /><ExclamationMark /></>;
      case 'playerBust':
        return <Sparkles />;
      case 'dealerWin':
        return <Sparkles />;
      case 'dealerBust':
        return <SweatDrops count={2} />;
      case 'push':
        return <ShruggingArms />;
      case 'hotStreak':
        return <SweatDrops count={Math.min(streak - 2, 3)} />;
      case 'dealing':
        return <ThinkingDots />;
      case 'generationComplete':
        return <Earpiece />;
      default:
        return null;
    }
  };

  return (
    <div className="relative flex flex-col items-center" ref={containerRef}>
      {/* Physics layer (tilt + squash/stretch) */}
      <div
        style={{
          transform: `rotate(${tilt}deg) scale(${squash.sx}, ${squash.sy})`,
          transition: 'transform 75ms ease-out',
        }}
      >
        {/* Animation layer (CSS expression animations) */}
        <div className={animClass}>
          {/* Mascot body */}
          <div className="relative rounded-2xl shadow-neu-icon flex items-center justify-center overflow-visible w-20 h-[52px]" style={{ backgroundColor: 'var(--mascot-body)' }}>
            {/* Glare highlight */}
            <div className="absolute top-1.5 right-3 w-5 h-2 rounded-full rotate-12 z-10" style={{ backgroundColor: 'var(--mascot-glare)' }} />

            {/* Eyes — shifted by physics in idle, by CSS animation in dealing/nervous */}
            <div
              className={`relative flex items-center justify-center gap-3 ${eyeGroupClass}`}
              style={usePhysicsEyes ? {
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                transition: 'transform 75ms ease-out',
              } : undefined}
            >
              {renderEyes()}
            </div>

            {/* Accessories */}
            {renderAccessories()}
          </div>
        </div>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        /* === Body animations === */

        .bj-m-shock {
          animation: bj-shock 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes bj-shock {
          0%   { transform: scale(1) translateY(0); }
          15%  { transform: scale(1.15) translateY(-10px); }
          35%  { transform: scale(0.9) translateY(3px); }
          55%  { transform: scale(1.05) translateY(-3px); }
          75%  { transform: scale(0.97) translateY(1px); }
          100% { transform: scale(1) translateY(0); }
        }

        .bj-m-smug {
          animation: bj-smug 0.6s ease-out;
        }
        @keyframes bj-smug {
          0%   { transform: translateY(0) rotate(0) scale(1); }
          25%  { transform: translateY(-4px) rotate(3deg) scale(1.04); }
          50%  { transform: translateY(-2px) rotate(1deg) scale(1.02); }
          100% { transform: translateY(0) rotate(0) scale(1); }
        }

        .bj-m-annoyed {
          animation: bj-annoyed 0.6s ease-in-out;
        }
        @keyframes bj-annoyed {
          0%   { transform: translateX(0) rotate(0); }
          12%  { transform: translateX(-5px) rotate(-3deg); }
          25%  { transform: translateX(5px) rotate(3deg); }
          37%  { transform: translateX(-4px) rotate(-2deg); }
          50%  { transform: translateX(3px) rotate(2deg); }
          65%  { transform: translateX(-2px) rotate(-1deg); }
          80%  { transform: translateX(0) translateY(2px); }
          100% { transform: translateX(0) translateY(0); }
        }

        .bj-m-proud {
          animation: bj-proud 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes bj-proud {
          0%   { transform: translateY(0) scale(1); }
          20%  { transform: translateY(-14px) scale(1.1); }
          40%  { transform: translateY(3px) scale(0.93); }
          55%  { transform: translateY(-6px) scale(1.05); }
          70%  { transform: translateY(1px) scale(0.98); }
          100% { transform: translateY(0) scale(1); }
        }

        .bj-m-embarrass {
          animation: bj-embarrass 0.5s ease-in-out forwards;
        }
        @keyframes bj-embarrass {
          0%   { transform: translateY(0) scale(1); }
          30%  { transform: translateY(6px) scale(0.9, 1.06); }
          60%  { transform: translateY(5px) scale(0.93, 1.03); }
          100% { transform: translateY(4px) scale(0.94); }
        }

        .bj-m-shrug {
          animation: bj-shrug-anim 1.2s ease-in-out;
        }
        @keyframes bj-shrug-anim {
          0%   { transform: translateY(0) rotate(0); }
          20%  { transform: translateY(-5px) rotate(2deg); }
          40%  { transform: translateY(0) rotate(-2deg); }
          60%  { transform: translateY(-3px) rotate(1deg); }
          80%  { transform: translateY(0) rotate(-1deg); }
          100% { transform: translateY(0) rotate(0); }
        }

        .bj-m-nervous {
          animation: bj-nervous 0.12s ease-in-out infinite;
        }
        @keyframes bj-nervous {
          0%   { transform: translateX(0) rotate(0); }
          25%  { transform: translateX(1.5px) rotate(0.5deg); }
          50%  { transform: translateX(-1.5px) rotate(-0.5deg); }
          75%  { transform: translateX(1px) rotate(0.3deg); }
          100% { transform: translateX(0) rotate(0); }
        }

        .bj-m-excited {
          animation: bj-excited 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
        }
        @keyframes bj-excited {
          0%   { transform: translateY(0) scale(1) rotate(0); }
          25%  { transform: translateY(-8px) scale(1.06) rotate(-2deg); }
          50%  { transform: translateY(1px) scale(0.97) rotate(0); }
          75%  { transform: translateY(-5px) scale(1.03) rotate(2deg); }
          100% { transform: translateY(0) scale(1) rotate(0); }
        }

        .bj-m-dealing {
          animation: bj-dealing 1.8s ease-in-out infinite;
        }
        @keyframes bj-dealing {
          0%   { transform: rotate(0) translateY(0); }
          15%  { transform: rotate(-4deg) translateY(-2px); }
          30%  { transform: rotate(0) translateY(0); }
          45%  { transform: rotate(3deg) translateY(-1px); }
          60%  { transform: rotate(0) translateY(0); }
          75%  { transform: rotate(-2deg) translateY(-1px); }
          100% { transform: rotate(0) translateY(0); }
        }

        /* === Eye-group animations === */

        .bj-eye-sweep {
          animation: bj-eye-sweep 2s ease-in-out infinite;
        }
        @keyframes bj-eye-sweep {
          0%   { transform: translateX(2px); }
          50%  { transform: translateX(-3px); }
          100% { transform: translateX(2px); }
        }

        .bj-eye-dart {
          animation: bj-eye-dart 0.4s ease-in-out infinite;
        }
        @keyframes bj-eye-dart {
          0%   { transform: translate(0, 0); }
          20%  { transform: translate(-2px, -1px); }
          40%  { transform: translate(3px, 0); }
          60%  { transform: translate(-1px, 1px); }
          80%  { transform: translate(2px, -1px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
    </div>
  );
};
