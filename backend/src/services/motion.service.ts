import path from 'path';
import fs from 'fs';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { Server as SocketServer } from 'socket.io';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { GenerationJob } from '../types';
import { refundCredits } from '../credits/creditManager';

const OUTPUTS_DIR = path.join(__dirname, '../../outputs');
const REMOTION_ENTRY = path.join(__dirname, '../../remotion/src/index.ts');

if (!fs.existsSync(OUTPUTS_DIR)) {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
}

// ─── Bundle Cache ────────────────────────────────────────────────────────────

let cachedBundleUrl: string | null = null;
let bundleInProgress: Promise<string> | null = null;

async function ensureBundle(): Promise<string> {
  if (cachedBundleUrl) return cachedBundleUrl;

  if (bundleInProgress) return bundleInProgress;

  console.log('[Motion] Bundling Remotion project (first time)...');
  bundleInProgress = bundle({
    entryPoint: REMOTION_ENTRY,
    onProgress: (progress) => {
      if (Math.round(progress * 100) % 25 === 0) {
        console.log(`[Motion] Bundle progress: ${Math.round(progress * 100)}%`);
      }
    },
  });

  try {
    cachedBundleUrl = await bundleInProgress;
    console.log('[Motion] Bundle complete and cached.');
    return cachedBundleUrl;
  } catch (err) {
    bundleInProgress = null;
    throw err;
  }
}

/**
 * Invalidate the cached bundle (call if templates are modified at runtime).
 */
export function invalidateBundle(): void {
  cachedBundleUrl = null;
  bundleInProgress = null;
  console.log('[Motion] Bundle cache invalidated.');
}

// ─── Concurrency Limiter ─────────────────────────────────────────────────────

let renderInProgress = false;
const renderQueue: Array<{
  resolve: (value: void) => void;
  reject: (err: Error) => void;
}> = [];

async function acquireRenderSlot(): Promise<void> {
  if (!renderInProgress) {
    renderInProgress = true;
    return;
  }

  return new Promise((resolve, reject) => {
    renderQueue.push({ resolve, reject });
  });
}

function releaseRenderSlot(): void {
  const next = renderQueue.shift();
  if (next) {
    next.resolve();
  } else {
    renderInProgress = false;
  }
}

// ─── Job State ───────────────────────────────────────────────────────────────

const motionJobs = new Map<string, GenerationJob>();

export function getMotionJobState(jobId: string): GenerationJob | undefined {
  return motionJobs.get(jobId);
}

// ─── Socket.io Reference ────────────────────────────────────────────────────

let ioRef: SocketServer | null = null;

export function setMotionIo(io: SocketServer): void {
  ioRef = io;
}

// ─── Render Pipeline ─────────────────────────────────────────────────────────

export async function renderMotionGraphic(
  templateId: string,
  props: Record<string, unknown>,
  creditCost: number,
  userId: string = 'default-user',
): Promise<{ jobId: string }> {
  const jobId = uuidv4();

  const jobState: GenerationJob = {
    id: jobId,
    userId,
    fileId: '',
    prompt: (props.text as string) || templateId,
    provider: 'remotion',
    model: 'remotion-local',
    generationType: 'motion',
    templateId,
    templateProps: props,
    status: 'queued',
    progress: 0,
    createdAt: Date.now(),
  };
  motionJobs.set(jobId, jobState);

  const io = ioRef;
  io?.emit('generation:progress', {
    jobId,
    status: 'queued',
    progress: 0,
  });

  // Process asynchronously
  processMotionJob(jobId, templateId, props, creditCost, userId).catch((err) => {
    console.error(`[Motion] Job ${jobId} failed:`, err.message);
  });

  return { jobId };
}

async function processMotionJob(
  jobId: string,
  templateId: string,
  props: Record<string, unknown>,
  creditCost: number,
  userId: string,
): Promise<void> {
  const state = motionJobs.get(jobId);
  if (!state) throw new Error(`Motion job state not found for ${jobId}`);
  const io = ioRef;

  try {
    // Step 1: Bundle (cached after first call)
    state.status = 'uploading'; // Reuse status for "bundling"
    state.progress = 5;
    io?.emit('generation:progress', {
      jobId,
      status: state.status,
      progress: state.progress,
    });

    const serveUrl = await ensureBundle();

    // Step 2: Select composition
    state.status = 'generating';
    state.progress = 20;
    io?.emit('generation:progress', {
      jobId,
      status: state.status,
      progress: state.progress,
    });

    const composition = await selectComposition({
      serveUrl,
      id: templateId,
      inputProps: props,
    });

    // Step 3: Wait for render slot
    await acquireRenderSlot();

    const outputPath = path.join(OUTPUTS_DIR, `${jobId}.mp4`);

    try {
      console.log(
        `[Motion] Job ${jobId}: rendering ${templateId} (${composition.durationInFrames} frames @ ${composition.fps}fps)...`,
      );

      state.progress = 30;
      io?.emit('generation:progress', {
        jobId,
        status: state.status,
        progress: state.progress,
      });

      // Step 4: Render
      await renderMedia({
        composition,
        serveUrl,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps: props,
        onProgress: ({ progress }) => {
          const pct = 30 + Math.round(progress * 65);
          state.progress = pct;
          io?.emit('generation:progress', {
            jobId,
            status: state.status,
            progress: pct,
          });
        },
      });
    } finally {
      releaseRenderSlot();
    }

    // Step 5: Complete
    state.status = 'completed';
    state.progress = 100;
    state.resultUrl = `/api/motion/download/${jobId}`;
    state.costUsd = 0; // Local render, no API cost

    io?.emit('generation:progress', {
      jobId,
      status: state.status,
      progress: 100,
      resultUrl: state.resultUrl,
    });
    io?.emit('generation:completed', {
      jobId,
      resultUrl: state.resultUrl,
    });

    console.log(
      `[Motion] Job ${jobId}: COMPLETED! Template=${templateId} Output=${outputPath}`,
    );
  } catch (err: any) {
    state.status = 'failed';
    state.error = err.message || 'Unknown error';

    // Refund credits on failure
    if (creditCost > 0) {
      refundCredits(userId, creditCost, 'subscription', jobId);
      console.log(
        `[Motion] Job ${jobId}: Refunded ${creditCost} credits due to failure`,
      );
    }

    io?.emit('generation:progress', {
      jobId,
      status: state.status,
      progress: 0,
      error: state.error,
    });
    io?.emit('generation:failed', { jobId, error: state.error });
    console.error(
      `[Motion] Job ${jobId}: FAILED - ${state.error}`,
    );
  }
}

// ─── LLM Prompt-to-Template Mapper ──────────────────────────────────────────

const TEMPLATE_SYSTEM_PROMPT = `You are a motion graphics template selector for FXbuddy. Given a user's natural language description of a motion graphic they want to create, you must select the best template and fill in its props.

Available templates:

1. **TitleSlam** — Bold title text that slams/fades/slides into frame
   Props:
   - text (string): The title text to display
   - color (string): Text color as hex (e.g. "#FFFFFF")
   - fontSize (number): Font size 20-300, default 120
   - fontFamily (enum): "Inter" | "Roboto" | "Oswald" | "Bebas Neue" | "Montserrat"
   - animationStyle (enum): "slam" | "fade" | "slide"
   - backgroundColor (string): Background color hex or "transparent"
   - durationInSeconds (number): Duration 1-10, default 3

2. **LowerThird** — Name + title bar that slides in from the side
   Props:
   - name (string): Person's name or main text
   - title (string): Subtitle or role
   - barColor (string): Accent bar color hex
   - textColor (string): Subtitle text color hex
   - nameColor (string): Name text color hex
   - position (enum): "bottom-left" | "bottom-right"
   - backgroundColor (string): Background color hex or "transparent"
   - durationInSeconds (number): Duration 1-10, default 4

3. **LogoReveal** — Logo image reveals with an effect
   Props:
   - logoUrl (string): URL to the logo image
   - revealStyle (enum): "fade" | "zoom" | "glitch"
   - backgroundColor (string): Background color hex
   - durationInSeconds (number): Duration 1-10, default 3

4. **KineticType** — Animated text (word-by-word, letter-by-letter, or line-by-line)
   Props:
   - text (string): The text to animate
   - speed (number): Animation speed 0.5-3, default 1
   - color (string): Text color hex
   - fontFamily (enum): "Inter" | "Roboto" | "Oswald" | "Bebas Neue" | "Montserrat"
   - animationType (enum): "word" | "letter" | "line"
   - backgroundColor (string): Background color hex or "transparent"
   - durationInSeconds (number): Duration 1-15, default 4

5. **SimpleTransition** — Clean transition between two colors
   Props:
   - transitionType (enum): "wipe" | "fade" | "zoom" | "slide"
   - color1 (string): Starting color hex
   - color2 (string): Ending color hex
   - durationInSeconds (number): Duration 0.5-5, default 1.5

Rules:
- Return ONLY valid JSON with "templateId" and "props" keys
- templateId must be exactly one of: "TitleSlam", "LowerThird", "LogoReveal", "KineticType", "SimpleTransition"
- Only include props that differ from defaults — omit props where the default is fine
- For LogoReveal: if the user mentions a logo/image and a logoUrl is provided in the props, use LogoReveal with that URL. If no URL is provided, use the default placeholder
- IMPORTANT: If the input props already contain a "logoUrl", ALWAYS preserve it in your output props — the user uploaded an image
- Use "transparent" for backgroundColor when the user wants to overlay on video
- Match the user's intent: "title card" → TitleSlam, "name tag" or "lower third" → LowerThird, "logo" → LogoReveal, "animated text" or "kinetic" → KineticType, "transition" or "wipe" → SimpleTransition
- Be creative with colors when the user describes a mood (e.g. "fiery" → reds/oranges, "cool" → blues, "elegant" → gold/white)`;

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export interface TemplateMapping {
  templateId: string;
  props: Record<string, unknown>;
}

export async function mapPromptToTemplate(
  prompt: string,
): Promise<TemplateMapping> {
  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: TEMPLATE_SYSTEM_PROMPT },
      { role: 'user', content: prompt.trim() },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 500,
    temperature: 0.3,
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('No response from AI when mapping prompt to template');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`AI returned invalid JSON: ${content}`);
  }

  if (!parsed.templateId || typeof parsed.templateId !== 'string') {
    throw new Error('AI response missing templateId');
  }

  const validTemplates = [
    'TitleSlam',
    'LowerThird',
    'LogoReveal',
    'KineticType',
    'SimpleTransition',
  ];
  if (!validTemplates.includes(parsed.templateId)) {
    throw new Error(
      `AI returned unknown template: ${parsed.templateId}. Valid: ${validTemplates.join(', ')}`,
    );
  }

  console.log(
    `[Motion] Prompt mapped: "${prompt}" → ${parsed.templateId}`,
    JSON.stringify(parsed.props),
  );

  return {
    templateId: parsed.templateId,
    props: parsed.props || {},
  };
}
