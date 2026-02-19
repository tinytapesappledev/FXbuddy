import React, { useEffect, useState, useRef } from 'react';
import '../../styles/animations.css';

export type MascotStatus = 'idle' | 'typing' | 'waiting' | 'success' | 'error' | 'surprised' | 'sleeping' | 'clicked';

interface MascotProps {
  status: MascotStatus;
  className?: string;
  onClick?: () => void;
}

const FACE_COLOR = 'var(--mascot-face)';

/* ── Eye components ── */

const EyeDefault: React.FC<{ blink: boolean }> = ({ blink }) => (
  <svg width="18" height="24" viewBox="0 0 18 24" className="transition-all duration-75">
    {blink ? (
       <path d="M 2 12 Q 9 12 16 12" stroke={FACE_COLOR} strokeWidth="3" fill="none" strokeLinecap="round" />
    ) : (
       <ellipse cx="9" cy="12" rx="7" ry="9" fill={FACE_COLOR} />
    )}
  </svg>
);

const EyeTyping: React.FC = () => (
  <svg width="18" height="14" viewBox="0 0 18 14">
    <path d="M3 12 Q9 0, 15 12" stroke={FACE_COLOR} strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

const EyeSuccess: React.FC = () => (
  <svg width="18" height="14" viewBox="0 0 18 14">
    <path d="M3 12 Q9 0, 15 12" stroke={FACE_COLOR} strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

const EyeError: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <line x1="3" y1="3" x2="13" y2="13" stroke={FACE_COLOR} strokeWidth="3" strokeLinecap="round" />
    <line x1="13" y1="3" x2="3" y2="13" stroke={FACE_COLOR} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const EyeSurprised: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 22 22">
    <polygon points="11,1 13.5,7.5 20.5,8 15.2,12.5 16.8,19.5 11,15.5 5.2,19.5 6.8,12.5 1.5,8 8.5,7.5" fill={FACE_COLOR} />
  </svg>
);

const EyeSleeping: React.FC = () => (
  <svg width="18" height="10" viewBox="0 0 18 10">
    <path d="M3 7 Q9 2, 15 7" stroke={FACE_COLOR} strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);

const EyeWaiting: React.FC<{ isLeft: boolean }> = ({ isLeft }) => (
  <svg width="18" height="22" viewBox="0 0 18 22" className={isLeft ? 'mascot-waiting-eye-left' : 'mascot-waiting-eye-right'}>
    <circle cx="9" cy="11" r="8" fill={FACE_COLOR} />
    <path
      d="M9 3 A8 8 0 0 1 17 11 A5.5 5.5 0 0 1 9 16.5 A3 3 0 0 1 6 11 A1.5 1.5 0 0 1 9 9.5"
      stroke="var(--mascot-body)" strokeWidth="2" fill="none"
    />
  </svg>
);

/* ── Sleeping Z's ── */
const SleepingZs: React.FC = () => (
  <div className="absolute -top-4 -right-2 mascot-zzz" style={{ pointerEvents: 'none' }}>
    <svg width="28" height="32" viewBox="0 0 28 32" className="mascot-z1">
      <text x="10" y="18" fill={FACE_COLOR} fontSize="14" fontWeight="bold" textAnchor="middle" opacity="0.9">z</text>
    </svg>
    <svg width="24" height="28" viewBox="0 0 24 28" className="mascot-z2" style={{ position: 'absolute', top: -8, right: -6 }}>
      <text x="10" y="16" fill={FACE_COLOR} fontSize="10" fontWeight="bold" textAnchor="middle" opacity="0.6">z</text>
    </svg>
  </div>
);

/* ── Main Mascot Component ── */

export const Mascot: React.FC<MascotProps> = ({ status, className = '', onClick }) => {
  const [blink, setBlink] = useState(false);
  
  // Physics state
  const targetPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const statusRef = useRef(status);
  statusRef.current = status;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const lastMouseMoveTime = useRef<number>(Date.now());

  const SPRING_STIFFNESS = 0.08;
  const DAMPING = 0.82;
  const MAX_MOVE = 10; 
  const IDLE_LOOK_INTERVAL = 2500;

  // Blink logic — pauses when panel is backgrounded to prevent burst-fire on refocus
  useEffect(() => {
    if (status !== 'idle') {
      setBlink(false);
      return;
    }

    let cancelled = false;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    const clearPending = () => {
      if (pendingTimer !== null) { clearTimeout(pendingTimer); pendingTimer = null; }
    };

    const schedule = (delay: number) => {
      clearPending();
      pendingTimer = setTimeout(triggerBlink, delay);
    };

    const triggerBlink = () => {
      if (cancelled || document.hidden) return;

      setBlink(true);
      setTimeout(() => { if (!cancelled) setBlink(false); }, 150);

      if (Math.random() > 0.95) {
        setTimeout(() => {
          if (!cancelled && !document.hidden) {
            setBlink(true);
            setTimeout(() => { if (!cancelled) setBlink(false); }, 150);
          }
        }, 250);
      }

      schedule(Math.random() * 8000 + 6000);
    };

    const onHidden = () => { clearPending(); setBlink(false); };
    const onVisible = () => { if (!cancelled) schedule(2000 + Math.random() * 2000); };

    const handleVisibility = () => { document.hidden ? onHidden() : onVisible(); };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', onHidden);
    window.addEventListener('focus', onVisible);

    schedule(3000);

    return () => {
      cancelled = true;
      clearPending();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', onHidden);
      window.removeEventListener('focus', onVisible);
    };
  }, [status]);

  // Physics Loop — writes directly to DOM to avoid per-frame React re-renders
  useEffect(() => {
    const animate = () => {
      const dx = targetPos.current.x - currentPos.current.x;
      const dy = targetPos.current.y - currentPos.current.y;

      velocity.current.x = (velocity.current.x + dx * SPRING_STIFFNESS) * DAMPING;
      velocity.current.y = (velocity.current.y + dy * SPRING_STIFFNESS) * DAMPING;

      currentPos.current.x += velocity.current.x;
      currentPos.current.y += velocity.current.y;

      const rot = currentPos.current.x * 0.5;
      const speed = Math.sqrt(velocity.current.x ** 2 + velocity.current.y ** 2);
      const stretch = Math.min(speed * 0.02, 0.1);

      if (containerRef.current) {
        containerRef.current.style.transform =
          `rotate(${rot}deg) scale(${1 - stretch}, ${1 + stretch})`;
      }
      if (faceRef.current) {
        const s = statusRef.current;
        if (s === 'idle' || s === 'surprised' || s === 'typing' || s === 'waiting') {
          faceRef.current.style.transform =
            `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`;
        } else {
          faceRef.current.style.transform = '';
        }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Mouse tracking & Idle behavior logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      lastMouseMoveTime.current = Date.now();
      
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      
      const moveX = (dx / window.innerWidth) * MAX_MOVE * 3; 
      const moveY = (dy / window.innerHeight) * MAX_MOVE * 3;

      const clampedX = Math.max(-MAX_MOVE, Math.min(MAX_MOVE, moveX));
      const clampedY = Math.max(-MAX_MOVE, Math.min(MAX_MOVE, moveY));

      targetPos.current = { x: clampedX, y: clampedY };
    };

    const idleInterval = setInterval(() => {
        const timeSinceMove = Date.now() - lastMouseMoveTime.current;
        
        if (timeSinceMove > 1000 && (status === 'idle' || status === 'waiting')) {
            const randomX = (Math.random() - 0.5) * MAX_MOVE * 1.8;
            const randomY = (Math.random() - 0.5) * MAX_MOVE * 1.8;
            
            targetPos.current = { x: randomX, y: randomY };
        }
    }, IDLE_LOOK_INTERVAL);

    if (status === 'idle' || status === 'surprised' || status === 'typing') {
        window.addEventListener('mousemove', handleMouseMove);
    } else {
        targetPos.current = { x: 0, y: 0 };
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        clearInterval(idleInterval);
    };
  }, [status]);

  const getContainerClass = () => {
    switch (status) {
      case 'idle': return '';
      case 'typing': return 'mascot-typing';
      case 'waiting': return 'mascot-waiting';
      case 'error': return 'mascot-head-shake';
      case 'surprised': return 'mascot-surprised';
      case 'success': return 'mascot-victory-jump';
      case 'sleeping': return 'mascot-sleeping';
      case 'clicked': return 'mascot-double-bounce';
      default: return '';
    }
  };

  const renderEyes = () => {
    switch (status) {
      case 'idle':
        return (
          <>
            <EyeDefault blink={blink} />
            <EyeDefault blink={blink} />
          </>
        );
      case 'typing':
        return (
          <>
            <EyeTyping />
            <EyeTyping />
          </>
        );
      case 'waiting':
        return (
          <>
            <EyeWaiting isLeft={true} />
            <EyeWaiting isLeft={false} />
          </>
        );
      case 'success':
        return (
          <>
            <EyeSuccess />
            <EyeSuccess />
          </>
        );
      case 'error':
        return (
          <>
            <EyeError />
            <EyeError />
          </>
        );
      case 'surprised':
        return (
          <>
            <div className="mascot-star-eye"><EyeSurprised /></div>
            <div className="mascot-star-eye"><EyeSurprised /></div>
          </>
        );
      case 'sleeping':
        return (
          <>
            <EyeSleeping />
            <EyeSleeping />
          </>
        );
      case 'clicked':
        return (
          <>
            <EyeSuccess />
            <EyeSuccess />
          </>
        );
      default:
        return (
          <>
            <EyeDefault blink={false} />
            <EyeDefault blink={false} />
          </>
        );
    }
  };

  return (
    <div className={status === 'clicked' ? 'mascot-jump' : ''}>
      <div 
          ref={containerRef} 
          className={`relative rounded-2xl shadow-neu-icon flex items-center justify-center overflow-visible cursor-pointer will-change-transform ${className || 'w-24 h-16'}`}
          style={{ backgroundColor: 'var(--mascot-body)' }}
          onClick={onClick}
      >
        {/* Glare */}
        <div className="absolute top-1.5 right-3 w-5 h-2 rounded-full rotate-12 z-10" style={{ backgroundColor: 'var(--mascot-glare)' }} />

        {/* Sleeping Z's */}
        {status === 'sleeping' && <SleepingZs />}
        
        {/* Face Content - Moves with physics (transform set by rAF loop) */}
        <div 
          ref={faceRef}
          className={`relative flex items-center justify-center will-change-transform ${getContainerClass()}`}
        >
            {/* Eyes */}
            <div className="flex items-center justify-center gap-3">
              {renderEyes()}
            </div>
        </div>
      </div>
    </div>
  );
};
