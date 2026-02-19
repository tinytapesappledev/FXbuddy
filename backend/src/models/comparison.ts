import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { startFalImageToVideo } from '../services/fal.service';
import { startImageToVideo, pollTaskUntilDone } from '../services/runway.service';
import { calculateCost, MODEL_REGISTRY } from './config';
import { AIModel } from '../types';

const LOGS_DIR = path.join(__dirname, '../../logs');
const COMPARISON_LOG_PATH = path.join(LOGS_DIR, 'model-comparisons.json');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

export interface ComparisonModelResult {
  modelId: string;
  modelName: string;
  provider: string;
  videoUrl: string;
  generationTimeMs: number;
  costUsd: number;
  success: boolean;
  error?: string;
}

export interface ComparisonResult {
  timestamp: string;
  prompt: string;
  inputImageHash: string;
  duration: number;
  aspectRatio: string;
  results: ComparisonModelResult[];
}

/**
 * Hash an input image file for comparison logging.
 */
function hashFile(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Run a single model generation for comparison purposes.
 */
async function runSingleModel(
  imagePath: string,
  prompt: string,
  modelId: AIModel,
  duration: number,
  aspectRatio: string,
): Promise<ComparisonModelResult> {
  const config = MODEL_REGISTRY[modelId];
  if (!config) {
    return {
      modelId,
      modelName: modelId,
      provider: 'unknown',
      videoUrl: '',
      generationTimeMs: 0,
      costUsd: 0,
      success: false,
      error: `Unknown model: ${modelId}`,
    };
  }

  const startTime = Date.now();

  try {
    let videoUrl: string;

    if (config.provider === 'fal') {
      videoUrl = await startFalImageToVideo(imagePath, prompt, modelId, {
        duration,
        aspectRatio,
      });
    } else if (config.provider === 'runway' && modelId === 'gen4_turbo') {
      const taskId = await startImageToVideo(imagePath, prompt, '1280:720', duration);
      videoUrl = await pollTaskUntilDone(taskId);
    } else {
      return {
        modelId,
        modelName: config.name,
        provider: config.provider,
        videoUrl: '',
        generationTimeMs: 0,
        costUsd: 0,
        success: false,
        error: `Model ${modelId} does not support image-to-video comparison`,
      };
    }

    const generationTimeMs = Date.now() - startTime;
    const costUsd = calculateCost(modelId, duration);

    return {
      modelId,
      modelName: config.name,
      provider: config.provider,
      videoUrl,
      generationTimeMs,
      costUsd,
      success: true,
    };
  } catch (err: any) {
    return {
      modelId,
      modelName: config.name,
      provider: config.provider,
      videoUrl: '',
      generationTimeMs: Date.now() - startTime,
      costUsd: 0,
      success: false,
      error: err.message || 'Unknown error',
    };
  }
}

/**
 * Run the same generation across multiple models in parallel for A/B comparison.
 * Fires all models simultaneously and collects results.
 */
export async function runComparison(
  inputImagePath: string,
  prompt: string,
  duration: number = 5,
  aspectRatio: string = '16:9',
  modelsToTest?: AIModel[],
): Promise<ComparisonResult> {
  const models = modelsToTest || [
    'gen4_turbo' as AIModel,
    'kling-25-turbo-pro' as AIModel,
  ];

  console.log(`[Comparison] Starting comparison across ${models.length} models...`);
  console.log(`[Comparison] Prompt: "${prompt.slice(0, 100)}..."`);
  console.log(`[Comparison] Models: ${models.join(', ')}`);

  const results = await Promise.allSettled(
    models.map((modelId) => runSingleModel(inputImagePath, prompt, modelId, duration, aspectRatio)),
  );

  const comparison: ComparisonResult = {
    timestamp: new Date().toISOString(),
    prompt,
    inputImageHash: hashFile(inputImagePath),
    duration,
    aspectRatio,
    results: results.map((r, i) => {
      if (r.status === 'fulfilled') {
        return r.value;
      }
      return {
        modelId: models[i],
        modelName: MODEL_REGISTRY[models[i]]?.name || models[i],
        provider: MODEL_REGISTRY[models[i]]?.provider || 'unknown',
        videoUrl: '',
        generationTimeMs: 0,
        costUsd: 0,
        success: false,
        error: r.reason?.message || 'Promise rejected',
      };
    }),
  };

  await saveComparisonLog(comparison);

  console.log(`[Comparison] Complete. Results:`);
  for (const r of comparison.results) {
    console.log(`  ${r.modelName}: ${r.success ? 'OK' : 'FAILED'} (${(r.generationTimeMs / 1000).toFixed(1)}s, $${r.costUsd.toFixed(3)})${r.error ? ` — ${r.error}` : ''}`);
  }

  return comparison;
}

/**
 * Save a comparison result to the log file.
 */
async function saveComparisonLog(comparison: ComparisonResult): Promise<void> {
  let existing: ComparisonResult[] = [];
  try {
    if (fs.existsSync(COMPARISON_LOG_PATH)) {
      const raw = fs.readFileSync(COMPARISON_LOG_PATH, 'utf-8');
      existing = JSON.parse(raw);
    }
  } catch {
    existing = [];
  }

  existing.push(comparison);
  fs.writeFileSync(COMPARISON_LOG_PATH, JSON.stringify(existing, null, 2));
}

/**
 * Get all comparison results (for dev dashboard).
 */
export function getAllComparisons(): ComparisonResult[] {
  try {
    if (fs.existsSync(COMPARISON_LOG_PATH)) {
      const raw = fs.readFileSync(COMPARISON_LOG_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [];
}
