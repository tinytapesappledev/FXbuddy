import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';
import { extractFirstFrame } from '../services/video-prep';
import { analyzeSceneForVFX, analyzeImageForMotion } from '../services/vision.service';
import { authMiddleware } from '../auth/middleware';

const router = Router();

router.use(authMiddleware);

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// ─── System Prompts ─────────────────────────────────────────────────────────

const VFX_SYSTEM_PROMPT_WITH_SCENE = `You enhance short VFX prompts for AI video-to-video generation. The user provides a brief effect description, and you are given a detailed analysis of the image the effect will be applied to.

Here is the scene description:
{sceneDescription}

Rules:
- Use "make it look as if" or "overlay" language so the AI treats this as an effect on top of the existing video, NOT a new scene
- Reference SPECIFIC elements from the scene description by name (e.g. "fire spreads across the wooden deck planks" rather than "fire spreads across the scene")
- Include 1-2 physical details about how the effect interacts with actual materials in the scene (e.g. "flames reflect in the glass window" or "rain pools on the stone floor")
- ALWAYS include a preservation clause that explicitly names key elements from the scene to keep unchanged (e.g. "while preserving the afternoon sunlight, the framed mirror, and all existing objects")
- Output ONLY the enhanced prompt — no quotes, no explanation
- 2-3 sentences max — dense and specific, not flowery
- Do not add effects the user did not ask for
- Only introduce new objects or elements if the user explicitly asks for them`;

const VFX_SYSTEM_PROMPT_TEXT_ONLY = `You enhance short VFX prompts for AI video-to-video generation. The user provides a brief effect description. You rewrite it as a clear instruction that tells the video AI to OVERLAY a visual effect onto the existing footage without replacing or regenerating the scene.

Rules:
- Use "make it look as if" or "overlay" language so the AI treats this as an effect on top of the existing video, NOT a new scene
- Always refer to "the scene" — never say "the object" or "an object"
- Keep the effect description simple but include 1-2 relevant physical details (e.g. "with smoke rising" or "with a visible shockwave") to guide quality
- ALWAYS include a preservation clause that explicitly mentions: the camera angle, framing, composition, and all existing elements
- Output ONLY the enhanced prompt — no quotes, no explanation
- One sentence only
- Do not add effects the user did not ask for
- Only introduce new objects or elements if the user explicitly asks for them. Never invent or add assets that the user did not request

Examples:
User: set it on fire
Output: Make it look as if the scene is engulfed in fire with flames and smoke rising, while keeping the exact camera angle, framing, and all existing elements unchanged.

User: add fireworks
Output: Add a fireworks display to the sky in the scene, while preserving the exact camera angle, composition, and all characters, objects, and background elements unchanged.

User: explode the truck
Output: Make it look as if the truck in the scene is exploding with a visible shockwave and debris, while keeping the camera angle, framing, and all other elements exactly as they appear.`;

const MOTION_SYSTEM_PROMPT_WITH_IMAGE = `You enhance short motion graphics descriptions for the FXbuddy template system. The user provides a brief description of the motion graphic they want, and you are given an analysis of an image they uploaded (likely a logo, icon, or brand asset).

Here is the image analysis:
{imageAnalysis}

Available templates:
- TitleSlam: Bold title text with slam/fade/slide animation. Fonts: Inter (clean), Roboto (geometric), Oswald (condensed bold), Bebas Neue (tall uppercase), Montserrat (elegant).
- LowerThird: Name + title bar with staggered slide-in. Positions: bottom-left, bottom-right.
- LogoReveal: Logo/image reveal with fade/zoom/glitch effect.
- KineticType: Animated text — word-by-word, letter-by-letter, or line-by-line.
- SimpleTransition: Wipe/fade/zoom/slide transition between two colors.

Rules:
- Expand the description with specific visual details: colors that complement the uploaded image, font style, animation style
- If the user uploaded a logo/icon, lean toward LogoReveal unless they clearly want something else
- Suggest colors that complement or match the image's palette (use descriptive color names, not hex codes)
- Keep the output as natural language, NOT JSON — it will be parsed by another AI
- 1-2 sentences, dense and specific
- Use "transparent" background when the user wants to overlay on video
- Don't add elements the user didn't request`;

const MOTION_SYSTEM_PROMPT_TEXT_ONLY = `You enhance short motion graphics descriptions for the FXbuddy template system. The user provides a brief description of the motion graphic they want. You expand it into a detailed, template-friendly description.

Available templates:
- TitleSlam: Bold title text with slam/fade/slide animation. Fonts: Inter (clean), Roboto (geometric), Oswald (condensed bold), Bebas Neue (tall uppercase), Montserrat (elegant).
- LowerThird: Name + title bar with staggered slide-in. Positions: bottom-left, bottom-right.
- LogoReveal: Logo/image reveal with fade/zoom/glitch effect.
- KineticType: Animated text — word-by-word, letter-by-letter, or line-by-line.
- SimpleTransition: Wipe/fade/zoom/slide transition between two colors.

Rules:
- Expand vague descriptions with specific visual details: colors, font style, animation style
- If the user mentions a title/heading → lean toward TitleSlam details
- If the user mentions a name/role/credit → lean toward LowerThird details
- If the user mentions a logo/brand → lean toward LogoReveal details
- If the user mentions animated text/words → lean toward KineticType details
- If the user mentions transition/wipe → lean toward SimpleTransition details
- Keep the output as natural language, NOT JSON — it will be parsed by another AI
- 1-2 sentences, dense and specific
- Use "transparent" background when the user wants to overlay on video
- Be creative with colors when the user describes a mood (e.g. "fiery" → reds/oranges, "cool" → blues)
- Don't add elements the user didn't request`;

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

// ─── Route Handler ──────────────────────────────────────────────────────────

/**
 * POST /api/enhance-prompt
 * Enhance a short prompt using OpenAI, optionally with image-aware context.
 *
 * Body: {
 *   prompt: string,
 *   mode?: 'vfx' | 'motion',        // default: 'vfx'
 *   mediaPath?: string,              // local file path to video (VFX mode — extracts frame)
 *   inPoint?: number,                // time offset for frame extraction
 *   imageFileId?: string,            // uploaded image file ID (Motion mode)
 *   cachedDescription?: string,      // pre-cached scene description (skips vision call)
 * }
 *
 * Returns: { enhanced: string, sceneDescription?: string }
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { prompt, mode, mediaPath, inPoint, imageFileId, cachedDescription } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }

  if (prompt.length > 500) {
    res.status(400).json({ error: 'Prompt must be under 500 characters' });
    return;
  }

  const enhanceMode = mode === 'motion' ? 'motion' : 'vfx';

  try {
    const client = getClient();
    let sceneDescription: string | null = null;

    // ── Step 1: Vision Analysis (if image context is available) ──

    if (cachedDescription && typeof cachedDescription === 'string') {
      sceneDescription = cachedDescription;
      console.log(`[Enhance] Using cached scene description (${sceneDescription.length} chars)`);
    } else if (enhanceMode === 'vfx' && mediaPath && typeof mediaPath === 'string') {
      // VFX mode: extract frame from video at inPoint, then analyze
      if (!fs.existsSync(mediaPath)) {
        console.warn(`[Enhance] Media file not found: ${mediaPath} — falling back to text-only`);
      } else {
        try {
          const frameOffset = typeof inPoint === 'number' ? inPoint : 0;
          const framePath = extractFirstFrame(mediaPath, frameOffset);
          sceneDescription = await analyzeSceneForVFX(framePath);
          console.log(`[Enhance] VFX scene analysis complete for ${mediaPath}`);
        } catch (visionErr: any) {
          console.warn(`[Enhance] Vision analysis failed, falling back to text-only:`, visionErr.message);
        }
      }
    } else if (enhanceMode === 'motion' && imageFileId && typeof imageFileId === 'string') {
      // Motion mode: find uploaded image by fileId
      try {
        const uploadsFiles = fs.readdirSync(UPLOADS_DIR);
        const imageFile = uploadsFiles.find((f) => f.startsWith(imageFileId));
        if (imageFile) {
          const imagePath = path.join(UPLOADS_DIR, imageFile);
          sceneDescription = await analyzeImageForMotion(imagePath);
          console.log(`[Enhance] Motion image analysis complete for ${imageFileId}`);
        } else {
          console.warn(`[Enhance] Uploaded image not found for fileId: ${imageFileId}`);
        }
      } catch (visionErr: any) {
        console.warn(`[Enhance] Motion image analysis failed:`, visionErr.message);
      }
    }

    // ── Step 2: Select and Build System Prompt ──

    let systemPrompt: string;

    if (enhanceMode === 'motion') {
      if (sceneDescription) {
        systemPrompt = MOTION_SYSTEM_PROMPT_WITH_IMAGE.replace('{imageAnalysis}', sceneDescription);
      } else {
        systemPrompt = MOTION_SYSTEM_PROMPT_TEXT_ONLY;
      }
    } else {
      if (sceneDescription) {
        systemPrompt = VFX_SYSTEM_PROMPT_WITH_SCENE.replace('{sceneDescription}', sceneDescription);
      } else {
        systemPrompt = VFX_SYSTEM_PROMPT_TEXT_ONLY;
      }
    }

    // ── Step 3: Generate Enhanced Prompt ──

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.trim() },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const enhanced = completion.choices[0]?.message?.content?.trim();

    if (!enhanced) {
      res.status(500).json({ error: 'No response from AI' });
      return;
    }

    console.log(`[Enhance] [${enhanceMode}${sceneDescription ? '+vision' : ''}] "${prompt.trim()}" -> "${enhanced}"`);

    const response: { enhanced: string; sceneDescription?: string } = { enhanced };
    if (sceneDescription) {
      response.sceneDescription = sceneDescription;
    }

    res.json(response);
  } catch (err: any) {
    console.error('[Enhance] Error:', err.message);

    if (err.message?.includes('OPENAI_API_KEY')) {
      res.status(500).json({ error: 'OpenAI API key not configured. Add OPENAI_API_KEY to your .env file.' });
      return;
    }

    res.status(500).json({ error: 'Failed to enhance prompt' });
  }
});

export default router;
