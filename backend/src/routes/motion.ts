import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  renderMotionGraphic,
  getMotionJobState,
  mapPromptToTemplate,
} from '../services/motion.service';
import { getBalance, deductCredits } from '../credits/creditManager';
import { logTransaction } from '../credits/transactionLog';
import {
  TEMPLATE_IDS,
  templateSchemas,
  templateDefaults,
  templateDescriptions,
} from '../motion/schemas';
import { authMiddleware } from '../auth/middleware';

const OUTPUTS_DIR = path.join(__dirname, '../../outputs');
const router = Router();

router.use(authMiddleware);

/** Fixed credit cost for motion graphics renders (local, no API cost). */
const MOTION_CREDIT_COST = 5;

/**
 * POST /api/motion/generate
 *
 * Start a motion graphics render.
 * Body options:
 *   A) { prompt } — LLM maps prompt to template + props, then renders
 *   B) { templateId, props } — renders directly (skip LLM)
 *   C) { prompt, templateId, props } — uses provided template but may enhance props
 */
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  const { prompt, templateId, props, duration } = req.body;

  if (!prompt && !templateId) {
    res.status(400).json({
      error: 'Either "prompt" or "templateId" is required',
    });
    return;
  }

  // ── Credit check ──
  const balance = await getBalance(req.userId!);
  if (balance.total < MOTION_CREDIT_COST && !balance.autoBuyEnabled) {
    res.status(402).json({
      error: 'insufficient_credits',
      creditsNeeded: MOTION_CREDIT_COST,
      creditsAvailable: balance.total,
    });
    return;
  }

  try {
    let resolvedTemplateId: string;
    let resolvedProps: Record<string, unknown>;

    if (templateId && TEMPLATE_IDS.includes(templateId)) {
      // Direct template + props (skip LLM)
      resolvedTemplateId = templateId;
      resolvedProps = props || {};
    } else if (prompt) {
      // LLM maps prompt to template
      const mapping = await mapPromptToTemplate(prompt);
      resolvedTemplateId = mapping.templateId;
      resolvedProps = mapping.props;

      // Merge user-provided props (e.g. logoUrl from image upload) over LLM props
      if (props && typeof props === 'object') {
        resolvedProps = { ...resolvedProps, ...props };
        // If user uploaded an image and LLM didn't pick LogoReveal, switch to it
        if (props.logoUrl && resolvedTemplateId !== 'LogoReveal') {
          resolvedTemplateId = 'LogoReveal';
        }
      }
    } else {
      res.status(400).json({
        error: `Unknown templateId: ${templateId}. Valid: ${TEMPLATE_IDS.join(', ')}`,
      });
      return;
    }

    // Override duration if provided
    if (duration && typeof duration === 'number') {
      resolvedProps.durationInSeconds = Math.max(0.5, Math.min(15, duration));
    }

    // Validate props against schema
    const schema = templateSchemas[resolvedTemplateId];
    if (schema) {
      try {
        resolvedProps = schema.parse({
          ...schema.parse({}), // defaults
          ...resolvedProps,    // user overrides
        });
      } catch (validationErr: any) {
        res.status(400).json({
          error: 'Invalid template props',
          details: validationErr.errors || validationErr.message,
        });
        return;
      }
    }

    // ── Deduct credits ──
    const deduction = await deductCredits(req.userId!, MOTION_CREDIT_COST);
    if (!deduction.success) {
      res.status(402).json({
        error: 'insufficient_credits',
        creditsNeeded: MOTION_CREDIT_COST,
        creditsAvailable: balance.total,
      });
      return;
    }

    const updatedBalance = await getBalance(req.userId!);
    await logTransaction({
      userId: req.userId!,
      type: 'generation',
      creditsAmount: -MOTION_CREDIT_COST,
      creditSource: deduction.source,
      modelUsed: 'lite',
      modelId: 'remotion-local',
      generationId: '', // Will be filled by the service
      balanceAfter: updatedBalance.total,
    });

    // ── Start render ──
    const { jobId } = await renderMotionGraphic(
      resolvedTemplateId,
      resolvedProps,
      MOTION_CREDIT_COST,
      req.userId,
    );

    console.log(
      `[Motion Route] Job ${jobId} created: template=${resolvedTemplateId} cost=${MOTION_CREDIT_COST}cr` +
        (prompt ? ` prompt="${prompt}"` : ''),
    );

    res.json({
      jobId,
      templateId: resolvedTemplateId,
      props: resolvedProps,
      creditsCharged: MOTION_CREDIT_COST,
      balanceRemaining: updatedBalance.total,
      autoBought: deduction.autoBought,
    });
  } catch (err: any) {
    console.error('[Motion Route] Error:', err.message);

    if (err.message?.includes('OPENAI_API_KEY')) {
      res.status(500).json({
        error:
          'OpenAI API key not configured. Add OPENAI_API_KEY to your .env file.',
      });
      return;
    }

    res.status(500).json({
      error: err.message || 'Failed to start motion render',
    });
  }
});

/**
 * GET /api/motion/status/:jobId
 */
router.get('/status/:jobId', (req: Request, res: Response): void => {
  const jobId = req.params.jobId as string;
  const state = getMotionJobState(jobId);

  if (!state) {
    res.status(404).json({ error: `Motion job not found: ${jobId}` });
    return;
  }

  res.json({
    jobId: state.id,
    status: state.status,
    progress: state.progress,
    resultUrl: state.resultUrl,
    error: state.error,
  });
});

/**
 * GET /api/motion/download/:jobId
 */
router.get('/download/:jobId', (req: Request, res: Response): void => {
  const jobId = req.params.jobId as string;
  const outputPath = path.join(OUTPUTS_DIR, `${jobId}.mp4`);

  if (!fs.existsSync(outputPath)) {
    res
      .status(404)
      .json({ error: `Output not found for motion job: ${jobId}` });
    return;
  }

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="fxbuddy_motion_${jobId}.mp4"`,
  );
  fs.createReadStream(outputPath).pipe(res);
});

/**
 * GET /api/motion/templates
 * Returns available templates and their schemas (for client UI).
 */
router.get('/templates', (_req: Request, res: Response): void => {
  const templates = TEMPLATE_IDS.map((id: string) => ({
    id,
    description: templateDescriptions[id],
    defaults: templateDefaults[id],
  }));

  res.json({ templates });
});

export default router;
