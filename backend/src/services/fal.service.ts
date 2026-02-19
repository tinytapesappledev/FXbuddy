import { fal } from '@fal-ai/client';
import fs from 'fs';
import { AIModel } from '../types';
import { getModelConfig, ModelConfig, snapToAllowedDuration } from '../models/config';

fal.config({
  credentials: process.env.FAL_KEY,
});

export interface FalGenerationOptions {
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
}

function buildFalInput(
  config: ModelConfig,
  imageUrl: string,
  prompt: string,
  options: FalGenerationOptions,
): Record<string, unknown> {
  const rawDuration = options.duration ?? 5;
  const duration = snapToAllowedDuration(config.id, rawDuration);

  // Kling 2.5 Turbo Pro (the only fal.ai model we use)
  return {
    prompt,
    image_url: imageUrl,
    duration: String(duration),
    aspect_ratio: options.aspectRatio || '16:9',
  };
}

function extractVideoUrl(result: any, modelId: string): string {
  const videoUrl =
    result?.video?.url ||
    result?.video_url ||
    result?.output?.video?.url ||
    result?.output?.video;

  if (!videoUrl) {
    throw new Error(
      `[fal] No video URL in response for model ${modelId}. ` +
      `Keys: ${Object.keys(result || {}).join(', ')}`,
    );
  }

  return videoUrl;
}

async function uploadToFalStorage(localPath: string): Promise<string> {
  const buffer = fs.readFileSync(localPath);
  const ext = localPath.endsWith('.png') ? 'png' : 'jpeg';
  const contentType = `image/${ext}`;

  console.log(`[fal] Uploading image to fal.ai storage (${(buffer.length / 1024).toFixed(0)}KB)...`);
  const url = await fal.storage.upload(new Blob([buffer], { type: contentType }));
  console.log(`[fal] Upload complete: ${url}`);
  return url;
}

export async function startFalImageToVideo(
  imagePath: string,
  prompt: string,
  model: AIModel,
  options: FalGenerationOptions = {},
  onProgress?: (progress: number) => void,
): Promise<string> {
  const config = getModelConfig(model);
  if (!config) throw new Error(`[fal] Unknown model: ${model}`);
  if (!config.falModelId) throw new Error(`[fal] Model ${model} has no falModelId`);

  const sizeKB = (fs.statSync(imagePath).size / 1024).toFixed(0);
  console.log(`[fal] Starting ${config.name} image-to-video generation...`);
  console.log(`[fal] Prompt: "${prompt.slice(0, 120)}..."`);
  console.log(`[fal] Input image: ${imagePath} (${sizeKB}KB)`);
  console.log(`[fal] Model endpoint: ${config.falModelId}`);
  console.log(`[fal] Options: duration=${options.duration ?? 5}s, resolution=${options.resolution || config.defaultResolution}`);

  const imageUrl = await uploadToFalStorage(imagePath);
  const input = buildFalInput(config, imageUrl, prompt, options);

  console.log(`[fal] Submitting generation to ${config.falModelId}...`);

  let progressEstimate = 0;

  const result = await fal.subscribe(config.falModelId, {
    input,
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_QUEUE') {
        console.log(`[fal] ${config.name}: queued (position: ${(update as any).position ?? '?'})`);
        onProgress?.(5);
      } else if (update.status === 'IN_PROGRESS') {
        progressEstimate = Math.min(progressEstimate + 8, 90);
        const logs = (update as any).logs;
        if (logs && Array.isArray(logs)) {
          logs.map((log: any) => log.message).forEach((msg: string) => {
            console.log(`[fal] ${config.name}: ${msg}`);
          });
        }
        onProgress?.(progressEstimate);
      } else if (update.status === 'COMPLETED') {
        onProgress?.(100);
      }
    },
  });

  const videoUrl = extractVideoUrl(result.data, model);
  console.log(`[fal] ${config.name} generation complete. Video URL: ${videoUrl}`);
  onProgress?.(100);

  return videoUrl;
}
