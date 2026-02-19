import { useRef, useCallback } from 'react';

const STORAGE_KEY = 'fxbuddy-flappy-best';

export type FlappyState = 'idle' | 'playing' | 'dead';

export interface Pipe {
  x: number;
  gapY: number;
  scored: boolean;
}

export interface FlappyGameState {
  birdY: number;
  birdVelocity: number;
  pipes: Pipe[];
  score: number;
  best: number;
  state: FlappyState;
  frameCount: number;
}

const GRAVITY = 0.45;
const FLAP_FORCE = -7;
const PIPE_SPEED = 2.5;
const PIPE_SPAWN_INTERVAL = 55;
const PIPE_WIDTH = 44;
const GAP_HEIGHT = 120;
const BIRD_W = 36;
const BIRD_H = 24;
const BIRD_X = 60;

export function useFlappyGame() {
  const gameRef = useRef<FlappyGameState>({
    birdY: 0,
    birdVelocity: 0,
    pipes: [],
    score: 0,
    best: parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10),
    state: 'idle',
    frameCount: 0,
  });

  const reset = useCallback((canvasHeight: number) => {
    const g = gameRef.current;
    g.birdY = canvasHeight / 2 - BIRD_H / 2;
    g.birdVelocity = 0;
    g.pipes = [];
    g.score = 0;
    g.state = 'idle';
    g.frameCount = 0;
  }, []);

  const flap = useCallback(() => {
    const g = gameRef.current;
    if (g.state === 'dead') return;
    if (g.state === 'idle') g.state = 'playing';
    g.birdVelocity = FLAP_FORCE;
  }, []);

  const tick = useCallback((canvasWidth: number, canvasHeight: number) => {
    const g = gameRef.current;
    if (g.state !== 'playing') return;

    g.frameCount++;

    // Bird physics
    g.birdVelocity += GRAVITY;
    g.birdY += g.birdVelocity;

    // Spawn pipes
    if (g.frameCount % PIPE_SPAWN_INTERVAL === 0) {
      const minGapY = GAP_HEIGHT / 2 + 30;
      const maxGapY = canvasHeight - GAP_HEIGHT / 2 - 30;
      const gapY = minGapY + Math.random() * (maxGapY - minGapY);
      g.pipes.push({ x: canvasWidth, gapY, scored: false });
    }

    // Move pipes + score
    for (const pipe of g.pipes) {
      pipe.x -= PIPE_SPEED;
      if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
        pipe.scored = true;
        g.score++;
      }
    }

    // Remove off-screen pipes
    g.pipes = g.pipes.filter((p) => p.x + PIPE_WIDTH > -10);

    // Collision: floor/ceiling
    if (g.birdY < 0 || g.birdY + BIRD_H > canvasHeight) {
      die(g);
      return;
    }

    // Collision: pipes
    const birdLeft = BIRD_X;
    const birdRight = BIRD_X + BIRD_W;
    const birdTop = g.birdY;
    const birdBottom = g.birdY + BIRD_H;

    for (const pipe of g.pipes) {
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + PIPE_WIDTH;
      if (birdRight > pipeLeft && birdLeft < pipeRight) {
        const gapTop = pipe.gapY - GAP_HEIGHT / 2;
        const gapBottom = pipe.gapY + GAP_HEIGHT / 2;
        if (birdTop < gapTop || birdBottom > gapBottom) {
          die(g);
          return;
        }
      }
    }
  }, []);

  function die(g: FlappyGameState) {
    g.state = 'dead';
    if (g.score > g.best) {
      g.best = g.score;
      localStorage.setItem(STORAGE_KEY, String(g.best));
    }
  }

  return {
    gameRef,
    reset,
    flap,
    tick,
    constants: { BIRD_X, BIRD_W, BIRD_H, PIPE_WIDTH, GAP_HEIGHT },
  };
}
