import RunwayML from '@runwayml/sdk';
import fs from 'fs';
import { prepareVideo, getCachedUpload, setCachedUpload, clearCachedUpload } from './video-prep';

const client = new RunwayML({
  apiKey: process.env.RUNWAY_API_KEY,
});

/**
 * Upload a video file to Runway's ephemeral storage.
 * Uses upload cache to skip re-upload for the same prepared file.
 * Set forceUpload=true to bypass the cache (e.g. after an expired URI error).
 */
async function uploadToRunway(preparedPath: string, forceUpload = false): Promise<string> {
  if (!forceUpload) {
    const cached = getCachedUpload('runway', preparedPath);
    if (cached) return cached;
  }

  const stream = fs.createReadStream(preparedPath);
  console.log(`[Runway] Uploading file to Runway ephemeral storage...${forceUpload ? ' (forced re-upload)' : ''}`);
  const upload = await client.uploads.createEphemeral({ file: stream });
  console.log(`[Runway] Upload complete. URI: ${upload.uri}`);

  setCachedUpload('runway', preparedPath, upload.uri);
  return upload.uri;
}

/**
 * Check if an error is caused by a stale/expired ephemeral upload URI.
 * Runway returns 400 "Asset duration must be at least 1 seconds" when
 * the videoUri points to an expired or empty asset.
 */
function isStaleUploadError(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  return msg.includes('asset duration') || msg.includes('too_small');
}

/**
 * Start a video-to-video generation using Runway Gen-4 Aleph.
 * Prepares the video (trim + downscale to 720p) then uploads.
 * If the first attempt fails due to a stale upload URI, clears the
 * cache and retries with a fresh upload.
 * Returns the task ID for polling.
 */
export async function startVideoToVideo(
  inputVideoPath: string,
  prompt: string,
  inPoint?: number,
  outPoint?: number,
): Promise<string> {
  const sizeMB = (fs.statSync(inputVideoPath).size / 1024 / 1024).toFixed(1);
  console.log(`[Runway] Starting video-to-video generation...`);
  console.log(`[Runway] Prompt: "${prompt}"`);
  console.log(`[Runway] Input file: ${inputVideoPath} (${sizeMB}MB)`);

  const preparedPath = prepareVideo(inputVideoPath, inPoint, outPoint);

  // First attempt: use cached upload URI if available
  let videoUri = await uploadToRunway(preparedPath);

  try {
    const task = await client.videoToVideo.create({
      model: 'gen4_aleph',
      videoUri,
      promptText: prompt,
      ratio: '1280:720',
    });

    console.log(`[Runway] Task created: ${task.id}`);
    return task.id;
  } catch (err: any) {
    if (!isStaleUploadError(err)) throw err;

    // Stale URI — clear cache, re-upload, and retry once
    console.warn(`[Runway] Stale upload URI detected ("${err.message}"). Re-uploading...`);
    clearCachedUpload('runway', preparedPath);
    videoUri = await uploadToRunway(preparedPath, true);

    try {
      const task = await client.videoToVideo.create({
        model: 'gen4_aleph',
        videoUri,
        promptText: prompt,
        ratio: '1280:720',
      });

      console.log(`[Runway] Task created on retry: ${task.id}`);
      return task.id;
    } catch (retryErr: any) {
      if (isStaleUploadError(retryErr)) {
        // Fresh upload also rejected — the clip itself is genuinely too short
        throw new Error('Asset duration must be at least 1 second. Select a longer clip and try again.');
      }
      throw retryErr;
    }
  }
}

/**
 * Start an image-to-video generation using Runway Gen-4 Turbo.
 * Uploads a still image (JPEG/PNG) to Runway ephemeral storage, then
 * creates an image-to-video task with the provided prompt.
 * Returns the task ID for polling via pollTaskUntilDone().
 */
export async function startImageToVideo(
  imagePath: string,
  prompt: string,
  ratio: '1280:720' | '720:1280' | '960:960' = '1280:720',
  duration: number = 5,
): Promise<string> {
  const sizeKB = (fs.statSync(imagePath).size / 1024).toFixed(0);
  console.log(`[Runway] Starting image-to-video generation...`);
  console.log(`[Runway] Prompt: "${prompt.slice(0, 120)}..."`);
  console.log(`[Runway] Input image: ${imagePath} (${sizeKB}KB)`);
  console.log(`[Runway] Ratio: ${ratio}, Duration: ${duration}s`);

  // Upload the image to ephemeral storage (reuse cache/upload logic)
  let imageUri = await uploadToRunway(imagePath);

  try {
    const task = await client.imageToVideo.create({
      model: 'gen4_turbo',
      promptImage: imageUri,
      promptText: prompt,
      ratio,
      duration,
    });

    console.log(`[Runway] Image-to-video task created: ${task.id}`);
    return task.id;
  } catch (err: any) {
    // If the URI expired, clear cache and retry once
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('expired') || msg.includes('not found') || msg.includes('invalid')) {
      console.warn(`[Runway] Image upload URI may be stale ("${err.message}"). Re-uploading...`);
      clearCachedUpload('runway', imagePath);
      imageUri = await uploadToRunway(imagePath, true);

      const task = await client.imageToVideo.create({
        model: 'gen4_turbo',
        promptImage: imageUri,
        promptText: prompt,
        ratio,
        duration,
      });

      console.log(`[Runway] Image-to-video task created on retry: ${task.id}`);
      return task.id;
    }
    throw err;
  }
}

/**
 * Poll a Runway task until completion.
 * Calls onProgress with 0-100 progress percentage.
 * Returns the output video URL on success.
 */
export async function pollTaskUntilDone(
  taskId: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const POLL_INTERVAL = 5000; // 5 seconds
  const MAX_POLLS = 120; // 10 minutes max

  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL);

    const task = await client.tasks.retrieve(taskId);
    console.log(`[Runway] Task ${taskId} status: ${task.status}`);

    // Estimate progress based on status and poll count
    const estimatedProgress = Math.min(
      Math.round(((i + 1) / 20) * 90), // roughly 20 polls to complete (~100s)
      95,
    );

    if (task.status === 'RUNNING') {
      onProgress?.(estimatedProgress);
    } else if (task.status === 'SUCCEEDED') {
      onProgress?.(100);

      // Log the full task object so we can see the actual response shape
      console.log(`[Runway] Task SUCCEEDED. Full task object:`, JSON.stringify(task, null, 2));

      // Extract output URL from task output
      const output = task.output as any;
      console.log(`[Runway] task.output type: ${typeof output}, isArray: ${Array.isArray(output)}, value:`, output);

      if (typeof output === 'string') {
        // Some Runway SDK versions return a direct URL string
        console.log(`[Runway] Generation complete. Output URL (string): ${output}`);
        return output;
      }
      if (Array.isArray(output) && output.length > 0) {
        const videoUrl = output[0].url || output[0];
        console.log(`[Runway] Generation complete. Output URL (array): ${videoUrl}`);
        return typeof videoUrl === 'string' ? videoUrl : String(videoUrl);
      }
      // Last resort: check for common alternative shapes
      if (output && typeof output === 'object' && output.url) {
        console.log(`[Runway] Generation complete. Output URL (object.url): ${output.url}`);
        return output.url;
      }
      throw new Error('Task succeeded but no output URL found. Raw output: ' + JSON.stringify(output));
    } else if (task.status === 'FAILED') {
      console.log(`[Runway] Task FAILED. Full task object:`, JSON.stringify(task, null, 2));
      const failure = (task as any).failure || (task as any).error || 'Unknown error';
      throw new Error(`Generation failed: ${JSON.stringify(failure)}`);
    } else if (task.status === 'CANCELLED') {
      throw new Error('Generation was cancelled');
    }
    // PENDING status - keep polling
  }

  throw new Error('Runway generation timed out after 10 minutes');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
