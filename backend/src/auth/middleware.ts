import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from './jwt';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * Authentication middleware.
 * Extracts and validates JWT from Authorization header.
 * In local dev mode (no DATABASE_URL), falls back to the default user.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const isLocalDev = !process.env.DATABASE_URL && process.env.NODE_ENV !== 'production';

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (isLocalDev) {
      req.userId = 'default-user';
      req.userEmail = 'user@fxbuddy.app';
      next();
      return;
    }
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload: TokenPayload = verifyAccessToken(token);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expired', code: 'token_expired' });
      return;
    }
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Optional auth — sets userId if token present, but doesn't reject if missing.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = verifyAccessToken(authHeader.slice(7));
      req.userId = payload.userId;
      req.userEmail = payload.email;
    } catch {
      // Token invalid/expired — continue without auth
    }
  }

  if (!req.userId && !process.env.DATABASE_URL) {
    req.userId = 'default-user';
  }

  next();
}
