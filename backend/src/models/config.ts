import { AIProvider, AIModel, ModelTier } from '../types';

export interface ModelConfig {
  id: AIModel;
  tier: ModelTier;
  name: string;
  subtitle: string;
  description: string;
  provider: AIProvider;
  falModelId?: string;
  apiModelId: string;
  creditCost: number;
  apiCostUsd: number;
  costPerSecond: Record<string, number>;
  defaultResolution: string;
  maxDuration: number;
  allowedDurations?: number[];
  supportsImageToVideo: boolean;
  supportsVideoToVideo: boolean;
  supportedResolutions: string[];
  supportedRatios: string[];
  avgGenerationTimeSec: number;
  qualityTier: 'standard' | 'high' | 'premium';
  notes: string;
}

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  'gen4_turbo': {
    id: 'gen4_turbo',
    tier: 'lite',
    name: 'Lite',
    subtitle: 'Runway Gen-4 Turbo',
    description: 'Generates a new clip with effects (won\'t match your original movement)',
    provider: 'runway',
    apiModelId: 'gen4_turbo',
    creditCost: 5,
    apiCostUsd: 0.25,
    costPerSecond: { default: 0.05 },
    defaultResolution: '720p',
    maxDuration: 10,
    allowedDurations: [5, 10],
    supportsImageToVideo: true,
    supportsVideoToVideo: false,
    supportedResolutions: ['720p'],
    supportedRatios: ['16:9', '9:16', '1:1'],
    avgGenerationTimeSec: 60,
    qualityTier: 'high',
    notes: 'Fast renders, previews, simple effects.',
  },
  'kling-25-turbo-pro': {
    id: 'kling-25-turbo-pro',
    tier: 'basic',
    name: 'Basic',
    subtitle: 'Kling 2.5 Turbo Pro',
    description: 'Generates a higher quality clip with effects (won\'t match your original movement)',
    provider: 'fal',
    falModelId: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
    apiModelId: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
    creditCost: 7,
    apiCostUsd: 0.35,
    costPerSecond: { default: 0.07 },
    defaultResolution: '1080p',
    maxDuration: 10,
    allowedDurations: [5, 10],
    supportsImageToVideo: true,
    supportsVideoToVideo: false,
    supportedResolutions: ['1080p'],
    supportedRatios: ['16:9', '9:16', '1:1'],
    avgGenerationTimeSec: 120,
    qualityTier: 'high',
    notes: 'Best camera motion and zoom effects.',
  },
  'gen4_aleph': {
    id: 'gen4_aleph',
    tier: 'pro',
    name: 'Pro',
    subtitle: 'Runway Gen-4 Aleph',
    description: 'Adds effects directly onto your clip (keeps your original movement)',
    provider: 'runway',
    apiModelId: 'gen4_aleph',
    creditCost: 15,
    apiCostUsd: 0.75,
    costPerSecond: { default: 0.15 },
    defaultResolution: '720p',
    maxDuration: 10,
    allowedDurations: [5, 10],
    supportsImageToVideo: false,
    supportsVideoToVideo: true,
    supportedResolutions: ['720p'],
    supportedRatios: ['16:9', '9:16', '1:1'],
    avgGenerationTimeSec: 100,
    qualityTier: 'premium',
    notes: 'Premium V2V editing, best quality, style transfer.',
  },
};

export const TIER_TO_MODEL: Record<ModelTier, AIModel> = {
  lite: 'gen4_turbo',
  basic: 'kling-25-turbo-pro',
  pro: 'gen4_aleph',
};

export const MODEL_TO_TIER: Record<AIModel, ModelTier> = {
  'gen4_turbo': 'lite',
  'kling-25-turbo-pro': 'basic',
  'gen4_aleph': 'pro',
  'remotion-local': 'lite',
};

export function getModelConfig(modelId: AIModel): ModelConfig | undefined {
  return MODEL_REGISTRY[modelId];
}

export function getModelByTier(tier: ModelTier): ModelConfig {
  return MODEL_REGISTRY[TIER_TO_MODEL[tier]];
}

export function calculateCost(modelId: AIModel, durationSec: number, resolution?: string): number {
  const config = MODEL_REGISTRY[modelId];
  if (!config) return 0;
  const res = resolution || config.defaultResolution;
  const rate = config.costPerSecond[res] ?? config.costPerSecond['default'] ?? 0;
  return rate * durationSec;
}

export function snapToAllowedDuration(modelId: AIModel, duration: number): number {
  const config = MODEL_REGISTRY[modelId];
  if (!config) return duration;
  const allowed = config.allowedDurations;
  if (!allowed || allowed.length === 0) {
    return Math.max(1, Math.min(Math.round(duration), config.maxDuration));
  }
  let best = allowed[0];
  let bestDiff = Math.abs(duration - best);
  for (const v of allowed) {
    const diff = Math.abs(duration - v);
    if (diff < bestDiff) {
      best = v;
      bestDiff = diff;
    }
  }
  return best;
}

export function getFalModels(): ModelConfig[] {
  return Object.values(MODEL_REGISTRY).filter((m) => m.provider === 'fal');
}
