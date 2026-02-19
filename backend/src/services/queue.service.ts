import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Server as SocketServer } from 'socket.io';
import { startVideoToVideo, startImageToVideo, pollTaskUntilDone } from './runway.service';
import { startFalImageToVideo } from './fal.service';
import { extractFirstFrame } from './video-prep';
import { calculateCost, MODEL_TO_TIER } from '../models/config';
import { logGeneration } from '../utils/costTracker';
import { refundCredits } from '../credits/creditManager';
import { getCreditCost } from '../credits/planConfig';
import { GenerationJob, GenerationType, AIProvider, AIModel } from '../types';

const OUTPUTS_DIR = path.join(__dirname, '../../outputs');

// Ensure outputs directory exists
if (!fs.existsSync(OUTPUTS_DIR)) {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
}

/**
 * Server-side preset prompt map.
 * Prompts are stored on the backend so the client cannot tamper with them.
 */
export const PRESET_PROMPTS: Record<string, string> = {
  'earth-zoomout': 'Google Earth style vertical zoom out. The camera pulls straight up from the scene, rising rapidly. Rooftops and the tops of skyscrapers become visible as the altitude increases. The city grid and streets reveal themselves from a birds eye aerial view. The camera continues climbing higher, punching through a layer of soft white clouds. Above the clouds the landscape below shrinks into a patchwork of city blocks, highways, and terrain, resembling satellite imagery. Smooth continuous upward camera movement, no cuts, photorealistic, cinematic aerial footage.',
};

// In-memory job state (for the prototype - would be DB in production)
const jobStates = new Map<string, GenerationJob>();

export function getJobState(jobId: string): GenerationJob | undefined {
  return jobStates.get(jobId);
}

// Reference to Socket.io server (set during init)
let ioRef: SocketServer | null = null;

/**
 * Initialize the worker with a Socket.io reference.
 */
export function startWorker(io: SocketServer): void {
  ioRef = io;
  console.log('[Worker] In-memory worker ready, waiting for jobs...');
}

/**
 * Add a generation job and process it immediately (in-memory queue).
 * Runs asynchronously so the API returns immediately.
 */
export async function addGenerationJob(
  jobId: string,
  fileId: string,
  filePath: string,
  prompt: string,
  provider: AIProvider,
  model: AIModel,
  generationType: GenerationType = 'video-to-video',
  presetId?: string,
  duration?: number,
  resolution?: string,
  aspectRatio?: string,
  inPoint?: number,
  outPoint?: number,
  userId?: string,
): Promise<void> {
  const jobState: GenerationJob = {
    id: jobId,
    userId: userId || 'default-user',
    fileId,
    prompt,
    provider,
    model,
    generationType,
    presetId,
    duration,
    resolution,
    aspectRatio,
    inPoint,
    outPoint,
    status: 'queued',
    progress: 0,
    createdAt: Date.now(),
  };
  jobStates.set(jobId, jobState);

  console.log(`[Worker] Job ${jobId} queued [${generationType} / ${provider}/${model}]${presetId ? ` preset=${presetId}` : ''}, starting processing...`);

  // Process asynchronously (fire and forget)
  processJob(jobId, filePath, prompt, provider, model, generationType, presetId, resolution, aspectRatio, inPoint, outPoint).catch((err) => {
    console.error(`[Worker] Job ${jobId} failed:`, err.message);
  });
}

/**
 * Process a single generation job.
 * Routes to the appropriate pipeline:
 *   - fal.ai (Pro/Kling 2.5): extract first frame → fal.ai image-to-video
 *   - image-to-video (Basic/Runway Turbo): extract first frame → Runway Gen-4 Turbo
 *   - video-to-video (Studio/Runway Aleph): trim/downscale → Runway Gen-4 Aleph
 */
async function processJob(
  jobId: string,
  filePath: string,
  prompt: string,
  provider: AIProvider,
  model: AIModel,
  generationType: GenerationType = 'video-to-video',
  presetId?: string,
  resolution?: string,
  aspectRatio?: string,
  inPoint?: number,
  outPoint?: number,
): Promise<void> {
  const state = jobStates.get(jobId);
  if (!state) throw new Error(`Job state not found for ${jobId}`);
  const io = ioRef;

  try {
    // Step 1: Upload / start generation
    state.status = 'uploading';
    state.progress = 5;
    io?.emit('generation:progress', { jobId, status: state.status, progress: state.progress });

    let outputUrl: string;

    if (provider === 'fal') {
      // ── fal.ai Path (Wan 2.5, Kling 2.5, Seedance 1.0) ──
      const presetPrompt = presetId ? (PRESET_PROMPTS[presetId] || prompt) : prompt;

      console.log(`[Worker] Job ${jobId}: extracting first frame for fal.ai ${model}...`);
      const frameOffset = inPoint ?? 0;
      const framePath = extractFirstFrame(filePath, frameOffset);

      state.status = 'generating';
      state.progress = 10;
      io?.emit('generation:progress', { jobId, status: state.status, progress: state.progress });

      console.log(`[Worker] Job ${jobId}: starting fal.ai ${model} image-to-video...`);
      outputUrl = await startFalImageToVideo(
        framePath,
        presetPrompt,
        model,
        { duration: state.duration ?? 5, resolution, aspectRatio },
        (progress) => {
          state.progress = 10 + Math.round(progress * 0.8);
          state.status = 'generating';
          io?.emit('generation:progress', { jobId, status: state.status, progress: state.progress });
        },
      );
    } else if (generationType === 'image-to-video') {
      // ── Runway Image-to-Video Path (presets like Earth Zoom-Out) ──
      const presetPrompt = presetId ? (PRESET_PROMPTS[presetId] || prompt) : prompt;

      console.log(`[Worker] Job ${jobId}: extracting first frame for image-to-video...`);
      const frameOffset = inPoint ?? 0;
      const framePath = extractFirstFrame(filePath, frameOffset);

      state.status = 'generating';
      state.progress = 10;
      io?.emit('generation:progress', { jobId, status: state.status, progress: state.progress });

      const i2vDuration = state.duration ?? 5;
      console.log(`[Worker] Job ${jobId}: starting Runway image-to-video (gen4_turbo) duration=${i2vDuration}s...`);
      const taskId = await startImageToVideo(framePath, presetPrompt, '1280:720', i2vDuration);

      outputUrl = await pollTaskUntilDone(taskId, (progress) => {
        state.progress = 10 + Math.round(progress * 0.8);
        state.status = 'generating';
        io?.emit('generation:progress', { jobId, status: state.status, progress: state.progress });
      });
    } else {
      // ── Runway Video-to-Video Path (default) ──
      console.log(`[Worker] Job ${jobId}: starting Runway ${model} generation...`);
      const taskId = await startVideoToVideo(filePath, prompt, inPoint, outPoint);

      state.status = 'generating';
      state.progress = 10;
      io?.emit('generation:progress', { jobId, status: state.status, progress: state.progress });

      outputUrl = await pollTaskUntilDone(taskId, (progress) => {
        state.progress = 10 + Math.round(progress * 0.8);
        state.status = 'generating';
        io?.emit('generation:progress', { jobId, status: state.status, progress: state.progress });
      });
    }

    // Step 2: Download the result
    state.status = 'downloading';
    state.progress = 92;
    io?.emit('generation:progress', { jobId, status: state.status, progress: state.progress });
    console.log(`[Worker] Job ${jobId}: downloading result from ${provider}...`);

    const outputPath = path.join(OUTPUTS_DIR, `${jobId}.mp4`);
    const response = await axios.get(outputUrl, { responseType: 'stream' });
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Step 3: Log cost and mark complete
    const durationSec = state.duration ?? 5;
    const costUsd = calculateCost(model, durationSec, resolution);
    state.costUsd = costUsd;

    logGeneration(jobId, model, provider, durationSec, costUsd, resolution).catch((err) => {
      console.warn(`[Worker] Cost logging failed for job ${jobId}:`, err.message);
    });

    state.status = 'completed';
    state.progress = 100;
    state.resultUrl = `/api/generate/download/${jobId}`;
    io?.emit('generation:progress', { jobId, status: state.status, progress: state.progress, resultUrl: state.resultUrl });
    io?.emit('generation:completed', { jobId, resultUrl: state.resultUrl });

    console.log(`[Worker] Job ${jobId}: COMPLETED! [${generationType} / ${provider}/${model}] Cost: $${costUsd.toFixed(3)} Output saved to ${outputPath}`);
  } catch (err: any) {
    state.status = 'failed';
    state.error = err.message || 'Unknown error';

    // Refund credits on failure
    const genCost = getCreditCost(state.duration ?? 5);
    if (genCost > 0) {
      refundCredits(state.userId || 'default-user', genCost, 'subscription', jobId);
      console.log(`[Worker] Job ${jobId}: Refunded ${genCost} credits due to failure`);
    }

    io?.emit('generation:progress', { jobId, status: state.status, progress: 0, error: state.error });
    io?.emit('generation:failed', { jobId, error: state.error });
    console.error(`[Worker] Job ${jobId}: FAILED [${generationType} / ${provider}/${model}] - ${state.error}`);
  }
}
