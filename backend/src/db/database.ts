import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PLAN_CREDITS } from '../credits/planConfig';

const DATABASE_URL = process.env.DATABASE_URL;
const USE_PG = !!DATABASE_URL;

// ─── Unified Query Interface ─────────────────────────────────────────────────

export interface QueryResult {
  rows: any[];
  rowCount: number;
}

export interface DB {
  query(sql: string, params?: any[]): QueryResult;
  run(sql: string, params?: any[]): { changes: number };
  getOne(sql: string, params?: any[]): any | null;
  exec(sql: string): void;
}

// ─── SQLite Implementation ───────────────────────────────────────────────────

let sqliteDb: any = null;

function initSQLite(): DB {
  const Database = require('better-sqlite3');
  const DB_DIR = path.join(__dirname, '../../data');
  const DB_PATH = path.join(DB_DIR, 'fxbuddy.db');

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  sqliteDb = new Database(DB_PATH);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');

  // schema.sql lives in src; at runtime __dirname is dist/db, so use project root
  const schemaPath = path.join(__dirname, '../../src/db/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  sqliteDb.exec(schema);

  // Migration: add new columns if missing
  const addColumnIfMissing = (table: string, col: string, def: string) => {
    try { sqliteDb.prepare(`SELECT ${col} FROM ${table} LIMIT 1`).get(); }
    catch { sqliteDb.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`); console.log(`[DB] Migration: added ${col} to ${table}`); }
  };
  addColumnIfMissing('users', 'auto_buy_enabled', 'INTEGER DEFAULT 0');
  addColumnIfMissing('users', 'password_hash', 'TEXT');
  addColumnIfMissing('users', 'stripe_customer_id', 'TEXT');
  addColumnIfMissing('users', 'stripe_subscription_id', 'TEXT');
  addColumnIfMissing('users', 'email_verified', 'INTEGER DEFAULT 0');

  // Create refresh_tokens table if not exists
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Plan name migration
  const migrations: Record<string, string> = { flow: 'starter', heat: 'pro', inferno: 'studio' };
  for (const [oldP, newP] of Object.entries(migrations)) {
    const r = sqliteDb.prepare('UPDATE users SET plan = ? WHERE plan = ?').run(newP, oldP);
    if (r.changes > 0) console.log(`[DB] Migration: renamed plan '${oldP}' -> '${newP}'`);
  }

  console.log('[DB] SQLite initialized (local development mode)');

  return {
    query(sql, params = []) {
      const pgSql = convertPgToSqlite(sql);
      const stmt = sqliteDb.prepare(pgSql);
      try {
        const rows = stmt.all(...params);
        return { rows, rowCount: rows.length };
      } catch {
        return { rows: [], rowCount: 0 };
      }
    },
    run(sql, params = []) {
      const pgSql = convertPgToSqlite(sql);
      const result = sqliteDb.prepare(pgSql).run(...params);
      return { changes: result.changes };
    },
    getOne(sql, params = []) {
      const pgSql = convertPgToSqlite(sql);
      return sqliteDb.prepare(pgSql).get(...params) || null;
    },
    exec(sql) {
      sqliteDb.exec(sql);
    },
  };
}

function convertPgToSqlite(sql: string): string {
  let s = sql;
  // Convert $1, $2, etc. to ? placeholders
  s = s.replace(/\$\d+/g, '?');
  // Convert BOOLEAN TRUE/FALSE to 1/0
  s = s.replace(/\bTRUE\b/gi, '1').replace(/\bFALSE\b/gi, '0');
  // Convert NOW() to datetime('now')
  s = s.replace(/\bNOW\(\)/gi, "datetime('now')");
  // Convert TIMESTAMPTZ to TEXT
  s = s.replace(/\bTIMESTAMPTZ\b/gi, 'TEXT');
  return s;
}

// ─── PostgreSQL Implementation ───────────────────────────────────────────────

let pgPool: any = null;

async function initPostgres(): Promise<DB> {
  const { Pool } = require('pg');
  pgPool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  // Run schema
  const schemaPath = path.join(__dirname, 'pg-schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await pgPool.query(schema);

  console.log('[DB] PostgreSQL initialized (production mode)');

  return {
    query(sql, params = []) {
      // Synchronous wrapper — in production use async where possible
      throw new Error('Use db.queryAsync() for PG');
    },
    run(sql, params = []) {
      throw new Error('Use db.runAsync() for PG');
    },
    getOne(sql, params = []) {
      throw new Error('Use db.getOneAsync() for PG');
    },
    exec(sql) {
      throw new Error('Use db.execAsync() for PG');
    },
  };
}

// ─── Async DB Interface (works for both) ─────────────────────────────────────

export interface AsyncDB {
  query(sql: string, params?: any[]): Promise<QueryResult>;
  run(sql: string, params?: any[]): Promise<{ changes: number }>;
  getOne(sql: string, params?: any[]): Promise<any | null>;
  exec(sql: string): Promise<void>;
}

let _asyncDb: AsyncDB;

function createSqliteAsyncDb(syncDb: DB): AsyncDB {
  return {
    async query(sql, params) { return syncDb.query(sql, params); },
    async run(sql, params) { return syncDb.run(sql, params); },
    async getOne(sql, params) { return syncDb.getOne(sql, params); },
    async exec(sql) { syncDb.exec(sql); },
  };
}

function createPgAsyncDb(): AsyncDB {
  return {
    async query(sql, params = []) {
      const result = await pgPool.query(sql, params);
      return { rows: result.rows, rowCount: result.rowCount || 0 };
    },
    async run(sql, params = []) {
      const result = await pgPool.query(sql, params);
      return { changes: result.rowCount || 0 };
    },
    async getOne(sql, params = []) {
      const result = await pgPool.query(sql, params);
      return result.rows[0] || null;
    },
    async exec(sql) {
      await pgPool.query(sql);
    },
  };
}

// ─── Initialization ──────────────────────────────────────────────────────────

export async function initDatabase(): Promise<void> {
  if (USE_PG) {
    await initPostgres();
    _asyncDb = createPgAsyncDb();
  } else {
    const syncDb = initSQLite();
    _asyncDb = createSqliteAsyncDb(syncDb);
  }
}

export function getDb(): AsyncDB {
  if (!_asyncDb) throw new Error('Database not initialized. Call initDatabase() first.');
  return _asyncDb;
}

// ─── Default User (for local dev only) ───────────────────────────────────────

export const DEFAULT_USER_ID = 'default-user';

export async function ensureDefaultUser(): Promise<void> {
  const db = getDb();
  const existing = await db.getOne('SELECT id FROM users WHERE id = $1', [DEFAULT_USER_ID]);
  if (existing) return;

  const now = new Date().toISOString();
  const cycleEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.run(`
    INSERT INTO users (id, email, plan, subscription_credits, topup_credits, auto_buy_enabled, billing_cycle_start, billing_cycle_end, total_credits_used_this_cycle, total_credits_used_all_time, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [DEFAULT_USER_ID, 'user@fxbuddy.app', 'pro', PLAN_CREDITS.pro, 0, false, now, cycleEnd, 0, 0, now]);

  await db.run(`
    INSERT INTO credit_transactions (id, user_id, type, credits_amount, credit_source, timestamp, balance_after)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [uuidv4(), DEFAULT_USER_ID, 'subscription_refresh', PLAN_CREDITS.pro, 'subscription', now, PLAN_CREDITS.pro]);

  console.log(`[DB] Created default user with ${PLAN_CREDITS.pro} credits (pro plan)`);
}

export const isPostgres = USE_PG;
