export type AIProvider = 'runway' | 'fal' | 'remotion';
export type AIModel = 'gen4_aleph' | 'gen4_turbo' | 'kling-25-turbo-pro' | 'remotion-local';
export type ModelTier = 'lite' | 'basic' | 'pro';
export type GenerationType = 'video-to-video' | 'image-to-video' | 'motion';
export type PlanId = 'free' | 'starter' | 'pro' | 'studio' | 'enterprise';
export type CreditTransactionType = 'generation' | 'preview' | 'upscale' | 'subscription_refresh' | 'topup_purchase' | 'refund' | 'auto_buy';
export type CreditSource = 'subscription' | 'topup';

export interface UserAccount {
  id: string;
  email: string;
  plan: PlanId;
  subscriptionCredits: number;
  topUpCredits: number;
  autoBuyEnabled: boolean;
  billingCycleStart: string;
  billingCycleEnd: string;
  totalCreditsUsedThisCycle: number;
  totalCreditsUsedAllTime: number;
  createdAt: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: CreditTransactionType;
  creditsAmount: number;
  creditSource: CreditSource;
  modelUsed?: ModelTier;
  modelId?: string;
  presetUsed?: string;
  generationId?: string;
  timestamp: string;
  balanceAfter: number;
}

export interface GenerationRecord {
  id: string;
  userId: string;
  modelTier: ModelTier;
  modelId: string;
  prompt: string;
  inputType: GenerationType;
  inputUrl: string;
  outputUrl?: string;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  creditsCharged: number;
  apiCostUsd: number;
  generationTimeMs?: number;
  createdAt: string;
  completedAt?: string;
}

export interface GenerationJob {
  id: string;
  userId: string;
  fileId: string;
  prompt: string;
  provider: AIProvider;
  model: AIModel;
  generationType: GenerationType;
  presetId?: string;
  templateId?: string;
  templateProps?: Record<string, unknown>;
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  inPoint?: number;
  outPoint?: number;
  status: 'queued' | 'uploading' | 'generating' | 'downloading' | 'completed' | 'failed';
  progress: number;
  resultUrl?: string;
  error?: string;
  costUsd?: number;
  createdAt: number;
}

export interface UploadResult {
  fileId: string;
  filename: string;
  path: string;
  size: number;
}

export interface GenerationRequest {
  fileId: string;
  prompt: string;
  provider?: AIProvider;
  model?: AIModel;
  generationType?: GenerationType;
  presetId?: string;
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  inPoint?: number;
  outPoint?: number;
}

export interface GenerationStatus {
  jobId: string;
  status: GenerationJob['status'];
  progress: number;
  resultUrl?: string;
  error?: string;
}
