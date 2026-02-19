import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

const PREPARED_DIR = path.join(__dirname, '../../uploads/prepared');
if (!fs.existsSync(PREPARED_DIR)) {
  fs.mkdirSync(PREPARED_DIR, { recursive: true });
}

/**
 * In-memory cache for prepared (trimmed + downscaled) files.
 * Key: hash of source path + file size + inPoint + outPoint
 * Value: path to the prepared file on disk
 */
const preparedFileCache = new Map<string, string>();

/**
 * Build a cache key from the source file and clip range.
 * Uses file path + size + modification time + in/out points for uniqueness.
 */
function buildCacheKey(sourcePath: string, inPoint?: number, outPoint?: number): string {
  const stats = fs.statSync(sourcePath);
  const raw = `${sourcePath}|${stats.size}|${stats.mtimeMs}|${inPoint ?? 'full'}|${outPoint ?? 'full'}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

/**
 * Prepare a video for upload to an AI provider:
 * 1. Trim to in/out range (if provided)
 * 2. Downscale to 720p (if source is larger)
 * 3. Cache the result so re-generates on the same clip skip processing
 *
 * Returns the path to the prepared file.
 */
export function prepareVideo(
  inputPath: string,
  inPoint?: number,
  outPoint?: number,
): string {
  const cacheKey = buildCacheKey(inputPath, inPoint, outPoint);

  // Check cache
  const cached = preparedFileCache.get(cacheKey);
  if (cached && fs.existsSync(cached)) {
    const cachedSize = (fs.statSync(cached).size / 1024 / 1024).toFixed(1);
    console.log(`[VideoPrep] Cache hit! Using prepared file: ${cached} (${cachedSize}MB)`);
    return cached;
  }

  const preparedPath = path.join(PREPARED_DIR, `prep_${cacheKey}.mp4`);

  const needsTrim = inPoint !== undefined && outPoint !== undefined && inPoint < outPoint;
  const duration = needsTrim ? (outPoint! - inPoint!) : undefined;

  const inputSize = (fs.statSync(inputPath).size / 1024 / 1024).toFixed(1);
  console.log(`[VideoPrep] Preparing ${inputPath} (${inputSize}MB)`);
  if (needsTrim) {
    console.log(`[VideoPrep] Trim: ${inPoint!.toFixed(2)}s - ${outPoint!.toFixed(2)}s (${duration!.toFixed(2)}s)`);
  }
  console.log(`[VideoPrep] Downscaling to 720p max + trimming in one pass`);

  // Build ffmpeg args:
  // - Seek to inPoint (-ss before -i for fast seek)
  // - Limit duration
  // - Scale to 720p if wider, keeping aspect ratio (scale=-2:720 ensures even dimensions)
  // - Use ultrafast preset for speed
  const ssArg = needsTrim ? `-ss ${inPoint}` : '';
  const tArg = duration ? `-t ${duration}` : '';
  const scaleFilter = `scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2`;

  const cmd = [
    `"${ffmpegPath}"`,
    '-y',
    ssArg,
    tArg,
    `-i "${inputPath}"`,
    `-vf "${scaleFilter}"`,
    '-c:v libx264 -preset ultrafast -crf 23',
    '-c:a aac -b:a 128k',
    '-movflags +faststart',
    `"${preparedPath}"`,
  ].filter(Boolean).join(' ');

  console.log(`[VideoPrep] Running: ${cmd}`);

  try {
    execSync(cmd, { stdio: 'pipe', timeout: 120000 });
  } catch (err: any) {
    // If the fancy scale filter fails, try a simpler approach
    console.warn(`[VideoPrep] First attempt failed, trying simpler scale...`);
    const simpleCmd = [
      `"${ffmpegPath}"`,
      '-y',
      ssArg,
      tArg,
      `-i "${inputPath}"`,
      `-vf "scale=-2:720"`,
      '-c:v libx264 -preset ultrafast -crf 23',
      '-c:a aac -b:a 128k',
      `"${preparedPath}"`,
    ].filter(Boolean).join(' ');
    execSync(simpleCmd, { stdio: 'pipe', timeout: 120000 });
  }

  const outputSize = (fs.statSync(preparedPath).size / 1024 / 1024).toFixed(1);
  console.log(`[VideoPrep] Prepared file: ${preparedPath} (${outputSize}MB) — saved from ${inputSize}MB`);

  // Cache the result
  preparedFileCache.set(cacheKey, preparedPath);

  return preparedPath;
}

/**
 * Extract the first frame from a video file as a JPEG image.
 * Uses FFmpeg to seek to the given time offset and grab one frame.
 * Results are cached by source path + offset.
 *
 * @param inputPath  Path to the source video file
 * @param timeOffset Timestamp in seconds to extract (default: 0 = very first frame)
 * @returns Path to the extracted JPEG file
 */
export function extractFirstFrame(inputPath: string, timeOffset: number = 0): string {
  const stats = fs.statSync(inputPath);
  const raw = `${inputPath}|${stats.size}|${stats.mtimeMs}|frame|${timeOffset}`;
  const hash = crypto.createHash('md5').update(raw).digest('hex');
  const framePath = path.join(PREPARED_DIR, `frame_${hash}.jpg`);

  // Return cached frame if it exists
  if (fs.existsSync(framePath) && fs.statSync(framePath).size > 0) {
    console.log(`[VideoPrep] Frame cache hit: ${framePath}`);
    return framePath;
  }

  console.log(`[VideoPrep] Extracting frame at ${timeOffset.toFixed(2)}s from ${inputPath}`);

  const ssArg = timeOffset > 0 ? `-ss ${timeOffset}` : '';
  const cmd = [
    `"${ffmpegPath}"`,
    '-y',
    ssArg,
    `-i "${inputPath}"`,
    '-frames:v 1',
    '-q:v 2',
    `"${framePath}"`,
  ].filter(Boolean).join(' ');

  try {
    execSync(cmd, { stdio: 'pipe', timeout: 30000 });
  } catch (err: any) {
    // If seeking to the offset fails (e.g. offset beyond duration), try frame 0
    if (timeOffset > 0) {
      console.warn(`[VideoPrep] Frame extraction at ${timeOffset}s failed, trying frame 0...`);
      const fallbackCmd = [
        `"${ffmpegPath}"`,
        '-y',
        `-i "${inputPath}"`,
        '-frames:v 1',
        '-q:v 2',
        `"${framePath}"`,
      ].join(' ');
      execSync(fallbackCmd, { stdio: 'pipe', timeout: 30000 });
    } else {
      throw new Error(`Frame extraction failed: ${err.message}`);
    }
  }

  if (!fs.existsSync(framePath) || fs.statSync(framePath).size === 0) {
    throw new Error('Frame extraction produced no output');
  }

  const sizeKB = (fs.statSync(framePath).size / 1024).toFixed(0);
  console.log(`[VideoPrep] Frame extracted: ${framePath} (${sizeKB}KB)`);

  return framePath;
}

/**
 * In-memory cache for provider-specific upload URIs.
 * Key: `${provider}:${preparedFilePath}`
 * Value: the upload URI/URL
 */
const uploadCache = new Map<string, { uri: string; timestamp: number }>();
const UPLOAD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes (Runway ephemeral URIs can expire quickly)

/**
 * Get a cached upload URI for a provider, or null if expired/missing.
 */
export function getCachedUpload(provider: string, preparedPath: string): string | null {
  const key = `${provider}:${preparedPath}`;
  const entry = uploadCache.get(key);
  if (entry && (Date.now() - entry.timestamp) < UPLOAD_CACHE_TTL) {
    console.log(`[UploadCache] Cache hit for ${provider} — reusing upload URI`);
    return entry.uri;
  }
  return null;
}

/**
 * Store an upload URI in the cache.
 */
export function setCachedUpload(provider: string, preparedPath: string, uri: string): void {
  const key = `${provider}:${preparedPath}`;
  uploadCache.set(key, { uri, timestamp: Date.now() });
  console.log(`[UploadCache] Cached upload URI for ${provider}`);
}

/**
 * Remove a cached upload URI (e.g. when it's detected as expired/stale).
 */
export function clearCachedUpload(provider: string, preparedPath: string): void {
  const key = `${provider}:${preparedPath}`;
  if (uploadCache.delete(key)) {
    console.log(`[UploadCache] Cleared stale upload URI for ${provider}`);
  }
}

/**
 * Clean up old prepared files (call periodically or on shutdown).
 */
export function cleanupPreparedFiles(): void {
  const now = Date.now();
  const MAX_AGE = 30 * 60 * 1000; // 30 minutes
  try {
    const files = fs.readdirSync(PREPARED_DIR);
    for (const file of files) {
      const filePath = path.join(PREPARED_DIR, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > MAX_AGE) {
        fs.unlinkSync(filePath);
        // Remove from cache too
        for (const [key, val] of preparedFileCache.entries()) {
          if (val === filePath) preparedFileCache.delete(key);
        }
      }
    }
  } catch (_) {}
}
