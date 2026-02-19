import { PlanId } from '../types';

/**
 * Credit costs by duration.
 * 5 seconds = 10 credits, 10 seconds = 20 credits.
 */
export const CREDIT_COST: Record<number, number> = {
  5: 10,
  10: 20,
};

/**
 * Credits included per billing cycle for each plan.
 */
export const PLAN_CREDITS: Record<PlanId, number> = {
  free: 0,
  starter: 250,
  pro: 750,
  studio: 2000,
  enterprise: 8000,
};

/**
 * Monthly price in USD for each paid plan.
 */
export const PLAN_PRICES: Record<Exclude<PlanId, 'free'>, number> = {
  starter: 59,
  pro: 99,
  studio: 249,
  enterprise: 999,
};

export type PlanFeature =
  | 'prompt_bible'
  | 'masterclass'
  | 'discord'
  | 'workflow_setup'
  | 'inner_circle';

export interface PlanConfig {
  credits: number;
  priceUsd: number;
  features: PlanFeature[];
  label: string;
  description: string;
  scarcity?: { maxPerMonth: number; spotsLeft: number };
  recommended?: boolean;
}

export const PLAN_CONFIG: Record<PlanId, PlanConfig> = {
  free: {
    credits: 0,
    priceUsd: 0,
    features: [],
    label: 'Free',
    description: '',
  },
  starter: {
    credits: 250,
    priceUsd: 59,
    features: [],
    label: 'Starter',
    description: '250 credits/month',
  },
  pro: {
    credits: 750,
    priceUsd: 99,
    features: ['prompt_bible', 'masterclass', 'discord'],
    label: 'Pro',
    description: '750 credits/month',
    recommended: true,
  },
  studio: {
    credits: 2000,
    priceUsd: 249,
    features: ['prompt_bible', 'masterclass', 'discord', 'workflow_setup', 'inner_circle'],
    label: 'Studio',
    description: '2,000 credits/month',
    scarcity: { maxPerMonth: 10, spotsLeft: 4 },
  },
  enterprise: {
    credits: 8000,
    priceUsd: 999,
    features: ['prompt_bible', 'masterclass', 'discord', 'workflow_setup', 'inner_circle'],
    label: 'Enterprise',
    description: '8,000 credits/month',
    scarcity: { maxPerMonth: 10, spotsLeft: 4 },
  },
};

/**
 * Extra credit packs for on-demand purchase.
 */
export const TOPUP_PACKS = {
  small: { credits: 50, priceUsd: 12 },
  medium: { credits: 150, priceUsd: 30 },
  large: { credits: 300, priceUsd: 50 },
} as const;

export type TopUpPackSize = keyof typeof TOPUP_PACKS;

/**
 * Feature labels for display.
 */
export const FEATURE_LABELS: Record<PlanFeature, string> = {
  prompt_bible: 'Music Video Prompt Bible (100+ tested prompts)',
  masterclass: 'AI Compositing Masterclass (video course)',
  discord: 'Exclusive FXbuddy Pro Discord community',
  workflow_setup: '1-on-1 Workflow Setup with Jakob',
  inner_circle: 'The Inner Circle — private groupchat with top industry editors',
};

export function getCreditCost(durationSeconds: number): number {
  return CREDIT_COST[durationSeconds] ?? 10;
}

export function getNextPlanUp(currentPlan: PlanId): PlanId | null {
  const order: PlanId[] = ['free', 'starter', 'pro', 'studio', 'enterprise'];
  const idx = order.indexOf(currentPlan);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1];
}
