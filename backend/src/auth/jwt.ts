import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb } from '../db/database';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export interface TokenPayload {
  userId: string;
  email: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export async function createRefreshToken(userId: string): Promise<string> {
  const db = getDb();
  const rawToken = uuidv4() + '-' + crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await db.run(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [uuidv4(), userId, tokenHash, expiresAt],
  );

  return rawToken;
}

export async function validateRefreshToken(rawToken: string): Promise<string | null> {
  const db = getDb();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const row = await db.getOne(
    'SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash],
  );

  if (!row) return null;

  const expiresAt = new Date(row.expires_at || row.expires_at);
  if (expiresAt < new Date()) {
    await db.run('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    return null;
  }

  return row.user_id;
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const db = getDb();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await db.run('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  const db = getDb();
  await db.run('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

export async function cleanExpiredTokens(): Promise<void> {
  const db = getDb();
  await db.run('DELETE FROM refresh_tokens WHERE expires_at < $1', [new Date().toISOString()]);
}
