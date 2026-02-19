import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { PLAN_CREDITS } from '../credits/planConfig';
import {
  signAccessToken,
  createRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from '../auth/jwt';
import { authMiddleware } from '../auth/middleware';

const router = Router();

const BCRYPT_ROUNDS = 12;

/**
 * POST /api/auth/register
 * Body: { email, password }
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const emailLower = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const db = getDb();

  const existing = await db.getOne('SELECT id FROM users WHERE email = $1', [emailLower]);
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();
  const cycleEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultPlan = 'free';

  await db.run(`
    INSERT INTO users (id, email, password_hash, plan, subscription_credits, topup_credits, auto_buy_enabled, billing_cycle_start, billing_cycle_end, total_credits_used_this_cycle, total_credits_used_all_time, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `, [userId, emailLower, passwordHash, defaultPlan, PLAN_CREDITS[defaultPlan], 0, false, now, cycleEnd, 0, 0, now]);

  const accessToken = signAccessToken({ userId, email: emailLower });
  const refreshToken = await createRefreshToken(userId);

  console.log(`[Auth] New user registered: ${emailLower} (${userId})`);

  res.status(201).json({
    user: { id: userId, email: emailLower, plan: defaultPlan },
    accessToken,
    refreshToken,
  });
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const db = getDb();
  const emailLower = email.toLowerCase().trim();

  const user = await db.getOne('SELECT id, email, password_hash, plan FROM users WHERE email = $1', [emailLower]);
  if (!user || !user.password_hash) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = await createRefreshToken(user.id);

  console.log(`[Auth] Login: ${user.email}`);

  res.json({
    user: { id: user.id, email: user.email, plan: user.plan },
    accessToken,
    refreshToken,
  });
});

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }

  const userId = await validateRefreshToken(refreshToken);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  const db = getDb();
  const user = await db.getOne('SELECT id, email, plan FROM users WHERE id = $1', [userId]);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  // Rotate: revoke old, issue new
  await revokeRefreshToken(refreshToken);
  const newAccessToken = signAccessToken({ userId: user.id, email: user.email });
  const newRefreshToken = await createRefreshToken(user.id);

  res.json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

/**
 * POST /api/auth/logout
 * Body: { refreshToken }
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  res.json({ success: true });
});

/**
 * GET /api/auth/me — get current user info
 */
router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  const user = await db.getOne('SELECT id, email, plan, created_at FROM users WHERE id = $1', [req.userId]);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ id: user.id, email: user.email, plan: user.plan, createdAt: user.created_at });
});

/**
 * POST /api/auth/logout-all — revoke all sessions
 */
router.post('/logout-all', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await revokeAllUserTokens(req.userId!);
  res.json({ success: true });
});

export default router;
