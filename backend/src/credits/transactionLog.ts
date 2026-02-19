import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { CreditTransaction, CreditTransactionType, CreditSource, ModelTier } from '../types';

export interface LogTransactionParams {
  userId: string;
  type: CreditTransactionType;
  creditsAmount: number;
  creditSource: CreditSource;
  modelUsed?: ModelTier;
  modelId?: string;
  presetUsed?: string;
  generationId?: string;
  balanceAfter: number;
}

export async function logTransaction(params: LogTransactionParams): Promise<CreditTransaction> {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO credit_transactions (id, user_id, type, credits_amount, credit_source, model_used, model_id, preset_used, generation_id, timestamp, balance_after)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [id, params.userId, params.type, params.creditsAmount, params.creditSource, params.modelUsed || null, params.modelId || null, params.presetUsed || null, params.generationId || null, now, params.balanceAfter]);

  return {
    id,
    userId: params.userId,
    type: params.type,
    creditsAmount: params.creditsAmount,
    creditSource: params.creditSource,
    modelUsed: params.modelUsed,
    modelId: params.modelId,
    presetUsed: params.presetUsed,
    generationId: params.generationId,
    timestamp: now,
    balanceAfter: params.balanceAfter,
  };
}

export interface UsageRow {
  modelUsed: string;
  generationCount: number;
  creditsUsed: number;
}

export async function getUsageStats(userId: string): Promise<{
  rows: UsageRow[];
  totalGenerations: number;
  totalCreditsUsed: number;
  avgCreditsPerGeneration: number;
}> {
  const db = getDb();
  const user = await db.getOne('SELECT billing_cycle_start FROM users WHERE id = $1', [userId]);
  if (!user) return { rows: [], totalGenerations: 0, totalCreditsUsed: 0, avgCreditsPerGeneration: 0 };

  const cycleStart = user.billing_cycle_start;

  const result = await db.query(`
    SELECT
      COALESCE(model_used, type) as model_used,
      COUNT(*) as generation_count,
      SUM(ABS(credits_amount)) as credits_used
    FROM credit_transactions
    WHERE user_id = $1 AND timestamp >= $2 AND credits_amount < 0
    GROUP BY COALESCE(model_used, type)
    ORDER BY credits_used DESC
  `, [userId, cycleStart]);

  const mapped: UsageRow[] = result.rows.map((r: any) => ({
    modelUsed: r.model_used,
    generationCount: Number(r.generation_count),
    creditsUsed: Number(r.credits_used),
  }));

  const totalGenerations = mapped.reduce((sum, r) => sum + r.generationCount, 0);
  const totalCreditsUsed = mapped.reduce((sum, r) => sum + r.creditsUsed, 0);
  const avgCreditsPerGeneration = totalGenerations > 0 ? totalCreditsUsed / totalGenerations : 0;

  return { rows: mapped, totalGenerations, totalCreditsUsed, avgCreditsPerGeneration };
}

export async function getRecentActivity(userId: string, limit: number = 20, offset: number = 0): Promise<CreditTransaction[]> {
  const db = getDb();
  const result = await db.query(`
    SELECT * FROM credit_transactions
    WHERE user_id = $1
    ORDER BY timestamp DESC
    LIMIT $2 OFFSET $3
  `, [userId, limit, offset]);

  return result.rows.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    type: r.type as CreditTransactionType,
    creditsAmount: r.credits_amount,
    creditSource: r.credit_source as CreditSource,
    modelUsed: r.model_used as ModelTier | undefined,
    modelId: r.model_id || undefined,
    presetUsed: r.preset_used || undefined,
    generationId: r.generation_id || undefined,
    timestamp: r.timestamp,
    balanceAfter: r.balance_after,
  }));
}
