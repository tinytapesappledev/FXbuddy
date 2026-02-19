import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { UserAccount, CreditSource, PlanId } from '../types';
import { PLAN_CREDITS, TOPUP_PACKS, TopUpPackSize } from './planConfig';
import { logTransaction } from './transactionLog';

export interface DeductionResult {
  success: boolean;
  source: CreditSource;
  subscriptionPart: number;
  topupPart: number;
  autoBought: boolean;
}

export async function getUser(userId: string): Promise<UserAccount | null> {
  const db = getDb();
  const row = await db.getOne('SELECT * FROM users WHERE id = $1', [userId]);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    plan: row.plan as PlanId,
    subscriptionCredits: row.subscription_credits,
    topUpCredits: row.topup_credits,
    autoBuyEnabled: !!row.auto_buy_enabled,
    billingCycleStart: row.billing_cycle_start,
    billingCycleEnd: row.billing_cycle_end,
    totalCreditsUsedThisCycle: row.total_credits_used_this_cycle,
    totalCreditsUsedAllTime: row.total_credits_used_all_time,
    createdAt: row.created_at,
  };
}

export async function getBalance(userId: string): Promise<{
  total: number;
  subscription: number;
  topup: number;
  plan: PlanId;
  autoBuyEnabled: boolean;
  billingCycleStart: string;
  billingCycleEnd: string;
  totalUsedThisCycle: number;
  planCreditsTotal: number;
}> {
  const user = await getUser(userId);
  if (!user) {
    return { total: 0, subscription: 0, topup: 0, plan: 'free', autoBuyEnabled: false, billingCycleStart: '', billingCycleEnd: '', totalUsedThisCycle: 0, planCreditsTotal: 0 };
  }
  return {
    total: user.subscriptionCredits + user.topUpCredits,
    subscription: user.subscriptionCredits,
    topup: user.topUpCredits,
    plan: user.plan,
    autoBuyEnabled: user.autoBuyEnabled,
    billingCycleStart: user.billingCycleStart,
    billingCycleEnd: user.billingCycleEnd,
    totalUsedThisCycle: user.totalCreditsUsedThisCycle,
    planCreditsTotal: PLAN_CREDITS[user.plan],
  };
}

export async function deductCredits(userId: string, amount: number): Promise<DeductionResult> {
  const db = getDb();
  let user = await getUser(userId);
  if (!user) return { success: false, source: 'subscription', subscriptionPart: 0, topupPart: 0, autoBought: false };

  let totalCredits = user.subscriptionCredits + user.topUpCredits;
  let autoBought = false;

  if (totalCredits < amount && user.autoBuyEnabled) {
    const shortfall = amount - totalCredits;
    const packOrder: TopUpPackSize[] = ['small', 'medium', 'large'];
    const pack = packOrder.find(p => TOPUP_PACKS[p].credits >= shortfall) || 'large';

    await db.run('UPDATE users SET topup_credits = topup_credits + $1 WHERE id = $2', [TOPUP_PACKS[pack].credits, userId]);

    user = (await getUser(userId))!;
    totalCredits = user.subscriptionCredits + user.topUpCredits;

    await logTransaction({
      userId,
      type: 'auto_buy',
      creditsAmount: TOPUP_PACKS[pack].credits,
      creditSource: 'topup',
      balanceAfter: totalCredits,
    });

    autoBought = true;
    console.log(`[AutoBuy] Purchased ${TOPUP_PACKS[pack].credits} credits for user ${userId}`);
  }

  if (totalCredits < amount) {
    return { success: false, source: 'subscription', subscriptionPart: 0, topupPart: 0, autoBought };
  }

  let remaining = amount;
  let subscriptionPart = 0;
  let topupPart = 0;

  if (user.subscriptionCredits >= remaining) {
    subscriptionPart = remaining;
  } else {
    subscriptionPart = user.subscriptionCredits;
    topupPart = remaining - user.subscriptionCredits;
  }

  const newSubCredits = user.subscriptionCredits - subscriptionPart;
  const newTopupCredits = user.topUpCredits - topupPart;

  await db.run(`
    UPDATE users
    SET subscription_credits = $1, topup_credits = $2,
        total_credits_used_this_cycle = total_credits_used_this_cycle + $3,
        total_credits_used_all_time = total_credits_used_all_time + $4
    WHERE id = $5
  `, [newSubCredits, newTopupCredits, amount, amount, userId]);

  const primarySource: CreditSource = subscriptionPart > 0 ? 'subscription' : 'topup';
  return { success: true, source: primarySource, subscriptionPart, topupPart, autoBought };
}

export async function refundCredits(userId: string, amount: number, source: CreditSource, generationId?: string): Promise<void> {
  const db = getDb();
  const user = await getUser(userId);
  if (!user) return;

  if (source === 'subscription') {
    await db.run('UPDATE users SET subscription_credits = subscription_credits + $1, total_credits_used_this_cycle = CASE WHEN total_credits_used_this_cycle >= $2 THEN total_credits_used_this_cycle - $3 ELSE 0 END WHERE id = $4', [amount, amount, amount, userId]);
  } else {
    await db.run('UPDATE users SET topup_credits = topup_credits + $1, total_credits_used_this_cycle = CASE WHEN total_credits_used_this_cycle >= $2 THEN total_credits_used_this_cycle - $3 ELSE 0 END WHERE id = $4', [amount, amount, amount, userId]);
  }

  const updatedUser = (await getUser(userId))!;
  const balanceAfter = updatedUser.subscriptionCredits + updatedUser.topUpCredits;

  await logTransaction({ userId, type: 'refund', creditsAmount: amount, creditSource: source, generationId, balanceAfter });
}

export async function refreshSubscriptionCredits(userId: string): Promise<void> {
  const user = await getUser(userId);
  if (!user) return;

  const newCredits = PLAN_CREDITS[user.plan];
  const now = new Date().toISOString();
  const cycleEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const db = getDb();
  await db.run(`
    UPDATE users SET subscription_credits = $1, total_credits_used_this_cycle = 0,
    billing_cycle_start = $2, billing_cycle_end = $3 WHERE id = $4
  `, [newCredits, now, cycleEnd, userId]);

  const balanceAfter = newCredits + user.topUpCredits;
  await logTransaction({ userId, type: 'subscription_refresh', creditsAmount: newCredits, creditSource: 'subscription', balanceAfter });
}

export async function purchaseTopUp(userId: string, packSize: TopUpPackSize): Promise<{ credits: number; priceUsd: number }> {
  const pack = TOPUP_PACKS[packSize];
  if (!pack) throw new Error(`Unknown pack size: ${packSize}`);

  const db = getDb();
  await db.run('UPDATE users SET topup_credits = topup_credits + $1 WHERE id = $2', [pack.credits, userId]);

  const updatedUser = (await getUser(userId))!;
  const balanceAfter = updatedUser.subscriptionCredits + updatedUser.topUpCredits;

  await logTransaction({ userId, type: 'topup_purchase', creditsAmount: pack.credits, creditSource: 'topup', balanceAfter });
  return { credits: pack.credits, priceUsd: pack.priceUsd };
}

export async function setAutoBuy(userId: string, enabled: boolean): Promise<void> {
  const db = getDb();
  await db.run('UPDATE users SET auto_buy_enabled = $1 WHERE id = $2', [enabled, userId]);
}

export async function changePlan(userId: string, newPlan: Exclude<PlanId, 'free'>): Promise<void> {
  const db = getDb();
  const user = await getUser(userId);
  if (!user) return;

  const oldPlanCredits = PLAN_CREDITS[user.plan] || 0;
  const newPlanCredits = PLAN_CREDITS[newPlan];

  if (newPlanCredits > oldPlanCredits) {
    const bonusCredits = newPlanCredits - oldPlanCredits;
    await db.run('UPDATE users SET plan = $1, subscription_credits = subscription_credits + $2 WHERE id = $3', [newPlan, bonusCredits, userId]);
  } else {
    await db.run('UPDATE users SET plan = $1 WHERE id = $2', [newPlan, userId]);
  }
}
