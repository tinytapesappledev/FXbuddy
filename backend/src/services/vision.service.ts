import fs from 'fs';
import crypto from 'crypto';
import OpenAI from 'openai';

// ─── Scene Description Cache ────────────────────────────────────────────────
// Key: MD5 hash of image file contents → Value: scene description string
const sceneCache = new Map<string, string>();

function hashImageFile(imagePath: string): string {
  const stats = fs.statSync(imagePath);
  const raw = `${imagePath}|${stats.size}|${stats.mtimeMs}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

// ─── OpenAI Client ──────────────────────────────────────────────────────────

let openai: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

// ─── Vision Prompts ─────────────────────────────────────────────────────────

const VFX_VISION_PROMPT = `Analyze this image in detail for VFX prompt generation. Describe:
- Main subjects/objects: what they are, their materials, colors, and position in frame
- Environment/setting: indoor/outdoor, surfaces, background elements
- Lighting: direction, warmth/coolness, shadows, apparent time of day
- Notable textures or materials (wood, metal, glass, fabric, etc.)
- Composition: framing, depth, perspective

Be specific and concise (3-5 sentences). Focus on physical details that a visual effect would interact with — surfaces that would catch fire, reflect light, get wet, shatter, etc. Do NOT describe mood or artistic intent.`;

const MOTION_VISION_PROMPT = `Analyze this image for motion graphics design. Describe:
- Dominant colors (list 2-4 specific colors, e.g. "navy blue", "warm gold")
- Visual style: minimal, detailed, flat, 3D, hand-drawn, corporate, playful, etc.
- Shape characteristics: rounded, angular, symmetric, organic
- Any text visible in the image and its style
- Overall aesthetic: modern, retro, elegant, bold, etc.

Be concise (2-3 sentences). This analysis will inform color choices, font selection, and animation style for a motion graphic that complements this image.`;

// ─── Analysis Functions ─────────────────────────────────────────────────────

/**
 * Analyze an image for VFX prompt generation.
 * Returns a detailed scene description focused on physical elements.
 * Results are cached by image file hash.
 */
export async function analyzeSceneForVFX(imagePath: string): Promise<string> {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  const hash = hashImageFile(imagePath);
  const cacheKey = `vfx:${hash}`;

  const cached = sceneCache.get(cacheKey);
  if (cached) {
    console.log(`[Vision] VFX cache hit for ${imagePath}`);
    return cached;
  }

  console.log(`[Vision] Analyzing scene for VFX: ${imagePath}`);

  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const ext = imagePath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
  const dataUrl = `data:image/${ext};base64,${base64}`;

  const client = getClient();
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: VFX_VISION_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'auto' } },
        ],
      },
    ],
    max_tokens: 300,
    temperature: 0.2,
  });

  const description = completion.choices[0]?.message?.content?.trim();
  if (!description) {
    throw new Error('Vision model returned no description');
  }

  sceneCache.set(cacheKey, description);
  console.log(`[Vision] VFX scene analysis complete (${description.length} chars)`);

  return description;
}

/**
 * Analyze an image for motion graphics design.
 * Returns color palette, style, and visual characteristics.
 * Results are cached by image file hash.
 */
export async function analyzeImageForMotion(imagePath: string): Promise<string> {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  const hash = hashImageFile(imagePath);
  const cacheKey = `motion:${hash}`;

  const cached = sceneCache.get(cacheKey);
  if (cached) {
    console.log(`[Vision] Motion cache hit for ${imagePath}`);
    return cached;
  }

  console.log(`[Vision] Analyzing image for motion graphics: ${imagePath}`);

  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const ext = imagePath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
  const dataUrl = `data:image/${ext};base64,${base64}`;

  const client = getClient();
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: MOTION_VISION_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'auto' } },
        ],
      },
    ],
    max_tokens: 200,
    temperature: 0.2,
  });

  const description = completion.choices[0]?.message?.content?.trim();
  if (!description) {
    throw new Error('Vision model returned no description');
  }

  sceneCache.set(cacheKey, description);
  console.log(`[Vision] Motion image analysis complete (${description.length} chars)`);

  return description;
}

/**
 * Clear the entire vision cache (e.g. for testing or memory pressure).
 */
export function clearVisionCache(): void {
  sceneCache.clear();
  console.log('[Vision] Cache cleared');
}
