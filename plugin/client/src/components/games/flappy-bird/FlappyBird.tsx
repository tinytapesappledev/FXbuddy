import React, { useRef, useEffect, useCallback } from 'react';
import { MiniGameProps } from '../types';
import { useFlappyGame } from './useFlappyGame';
import { ArrowLeft } from 'lucide-react';

function readCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export const FlappyBird: React.FC<MiniGameProps> = ({ onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const colorsRef = useRef<Record<string, string>>({});
  const { gameRef, reset, flap, tick, constants } = useFlappyGame();
  const { BIRD_X, BIRD_W, BIRD_H, PIPE_WIDTH, GAP_HEIGHT } = constants;

  const loadColors = useCallback(() => {
    colorsRef.current = {
      bg: readCSSVar('--bg-base'),
      body: readCSSVar('--mascot-body'),
      face: readCSSVar('--mascot-face'),
      text: readCSSVar('--text-primary'),
      textDim: readCSSVar('--text-secondary'),
      pipe: readCSSVar('--glass-3'),
      pipeBorder: readCSSVar('--glass-4'),
    };
  }, []);

  const drawMascot = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, vel: number, dead: boolean) => {
    const c = colorsRef.current;
    const r = 8;

    // Body
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = c.body;
    ctx.fill();

    // Glare
    ctx.beginPath();
    ctx.ellipse(x + w - 8, y + 5, 5, 2, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = c.face;
    ctx.globalAlpha = 0.2;
    ctx.fill();
    ctx.globalAlpha = 1;

    const eyeCenterY = y + h / 2;
    const eyeOffsetY = dead ? 0 : Math.max(-3, Math.min(3, vel * 0.4));

    if (dead) {
      // X eyes
      const drawX = (cx: number, cy: number) => {
        const s = 3;
        ctx.beginPath();
        ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s);
        ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s);
        ctx.strokeStyle = c.face;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
      };
      drawX(x + w * 0.33, eyeCenterY);
      drawX(x + w * 0.67, eyeCenterY);
    } else {
      // Oval eyes
      ctx.fillStyle = c.face;
      ctx.beginPath();
      ctx.ellipse(x + w * 0.33, eyeCenterY + eyeOffsetY, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + w * 0.67, eyeCenterY + eyeOffsetY, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const g = gameRef.current;
    const c = colorsRef.current;

    tick(W, H);

    // Background
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);

    // Pipes
    for (const pipe of g.pipes) {
      const gapTop = pipe.gapY - GAP_HEIGHT / 2;
      const gapBottom = pipe.gapY + GAP_HEIGHT / 2;

      ctx.fillStyle = c.pipe;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, gapTop);
      ctx.fillRect(pipe.x, gapBottom, PIPE_WIDTH, H - gapBottom);

      ctx.strokeStyle = c.pipeBorder;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, gapTop);
      ctx.strokeRect(pipe.x, gapBottom, PIPE_WIDTH, H - gapBottom);

      // Pipe caps
      ctx.fillStyle = c.pipeBorder;
      ctx.fillRect(pipe.x - 3, gapTop - 8, PIPE_WIDTH + 6, 8);
      ctx.fillRect(pipe.x - 3, gapBottom, PIPE_WIDTH + 6, 8);
    }

    // Bird (mascot)
    const tilt = g.state === 'playing' ? Math.max(-25, Math.min(25, g.birdVelocity * 3)) : 0;
    ctx.save();
    ctx.translate(BIRD_X + BIRD_W / 2, g.birdY + BIRD_H / 2);
    ctx.rotate((tilt * Math.PI) / 180);
    drawMascot(ctx, -BIRD_W / 2, -BIRD_H / 2, BIRD_W, BIRD_H, g.birdVelocity, g.state === 'dead');
    ctx.restore();

    // Score
    ctx.fillStyle = c.text;
    ctx.font = 'bold 28px Syne, Inter, sans-serif';
    ctx.textAlign = 'center';
    if (g.state === 'playing') {
      ctx.fillText(String(g.score), W / 2, 40);
    }

    // Idle screen
    if (g.state === 'idle') {
      ctx.fillStyle = c.text;
      ctx.font = 'bold 18px Syne, Inter, sans-serif';
      ctx.fillText('Flappy Buddy', W / 2, H / 2 - 50);
      ctx.font = '13px Inter, sans-serif';
      ctx.fillStyle = c.textDim;
      ctx.fillText('Tap or press Space to start', W / 2, H / 2 + 45);
    }

    // Death screen
    if (g.state === 'dead') {
      ctx.fillStyle = c.bg;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      ctx.fillStyle = c.text;
      ctx.font = 'bold 20px Syne, Inter, sans-serif';
      ctx.fillText('Game Over', W / 2, H / 2 - 30);

      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText(`Score: ${g.score}`, W / 2, H / 2 + 5);

      ctx.font = '13px Inter, sans-serif';
      ctx.fillStyle = c.textDim;
      ctx.fillText(`Best: ${g.best}`, W / 2, H / 2 + 28);

      ctx.fillText('Tap to retry', W / 2, H / 2 + 58);
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [tick, drawMascot, gameRef, GAP_HEIGHT, PIPE_WIDTH, BIRD_X, BIRD_W, BIRD_H]);

  const handleInteraction = useCallback(() => {
    const g = gameRef.current;
    if (g.state === 'dead') {
      const canvas = canvasRef.current;
      if (canvas) reset(canvas.height);
      return;
    }
    flap();
  }, [gameRef, reset, flap]);

  useEffect(() => {
    loadColors();

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      loadColors();
      if (gameRef.current.state === 'idle') {
        reset(canvas.height);
      }
    };
    resize();

    const observer = new MutationObserver(() => loadColors());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleInteraction();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', resize);

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', resize);
      observer.disconnect();
    };
  }, [draw, handleInteraction, loadColors, reset, gameRef]);

  return (
    <div className="w-full h-full bg-base flex flex-col">
      <div className="px-4 pt-3 pb-1">
        <button
          onClick={onExit}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-base shadow-neu-button hover:shadow-neu-button-active active:scale-95 transition-all"
          title="Back"
        >
          <ArrowLeft size={14} className="text-neu-text" />
        </button>
      </div>
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-pointer"
          onClick={handleInteraction}
          onTouchStart={(e) => { e.preventDefault(); handleInteraction(); }}
        />
      </div>
    </div>
  );
};
