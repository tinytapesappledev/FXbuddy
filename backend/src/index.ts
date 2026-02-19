import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server as SocketServer } from 'socket.io';
import * as Sentry from '@sentry/node';

import { initDatabase, ensureDefaultUser } from './db/database';
import { cleanExpiredTokens } from './auth/jwt';

import uploadRouter from './routes/upload';
import generateRouter from './routes/generate';
import enhancePromptRouter from './routes/enhance-prompt';
import devRouter from './routes/dev';
import creditsRouter from './routes/credits';
import motionRouter from './routes/motion';
import authRouter from './routes/auth';
import billingRouter from './routes/billing';

import { startWorker } from './services/queue.service';
import { setMotionIo } from './services/motion.service';

const PORT = parseInt(process.env.PORT || '4000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ─── Sentry (optional) ──────────────────────────────────────────────────────

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: IS_PRODUCTION ? 'production' : 'development',
    tracesSampleRate: 0.1,
  });
  console.log('[Sentry] Initialized');
}

// ─── Express + Socket.io ─────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map(s => s.trim()),
    methods: ['GET', 'POST'],
  },
});

// ─── Security Middleware ─────────────────────────────────────────────────────

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map(s => s.trim()),
  credentials: true,
}));

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const generationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Generation rate limit exceeded. Please wait a minute.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later' },
});

app.use('/api/', generalLimiter);
app.use('/api/generate', generationLimiter);
app.use('/api/motion/generate', generationLimiter);
app.use('/api/auth', authLimiter);

// Stripe webhook needs raw body for signature verification — register BEFORE json parser
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

// JSON parser for everything else
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/billing', billingRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/generate', generateRouter);
app.use('/api/enhance-prompt', enhancePromptRouter);
app.use('/api/credits', creditsRouter);
app.use('/api/motion', motionRouter);

if (!IS_PRODUCTION) {
  app.use('/api/dev', devRouter);
}

// Serve uploaded files
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    name: 'FXbuddy Backend',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: IS_PRODUCTION ? 'production' : 'development',
  });
});

// ─── Socket.io ───────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────

async function start() {
  // Initialize database (SQLite or PostgreSQL)
  await initDatabase();

  // Create default user for local dev
  if (!IS_PRODUCTION) {
    await ensureDefaultUser();
  }

  // Start the generation worker
  startWorker(io);
  setMotionIo(io);

  // Periodic cleanup of expired refresh tokens
  setInterval(() => { cleanExpiredTokens().catch(() => {}); }, 60 * 60 * 1000);

  server.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════╗');
    console.log('  ║       FXbuddy Backend Server         ║');
    console.log('  ╠══════════════════════════════════════╣');
    console.log(`  ║  REST API:   http://localhost:${PORT}    ║`);
    console.log(`  ║  WebSocket:  ws://localhost:${PORT}      ║`);
    console.log(`  ║  Mode:       ${IS_PRODUCTION ? 'PRODUCTION' : 'development'}${IS_PRODUCTION ? '         ' : '          '}║`);
    console.log(`  ║  DB:         ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}${process.env.DATABASE_URL ? '            ' : '              '}║`);
    console.log('  ╚══════════════════════════════════════╝');
    console.log('');
  });
}

start().catch((err) => {
  console.error('[FATAL] Failed to start server:', err);
  process.exit(1);
});
