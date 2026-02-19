import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { addGenerationJob, getJobState, PRESET_PROMPTS } from '../services/queue.service';
import { snapToAllowedDuration, MODEL_TO_TIER } from '../models/config';
import { getBalance, deductCredits, refundCredits } from '../credits/creditManager';
import { logTransaction } from '../credits/transactionLog';
import { getCreditCost } from '../credits/planConfig';
import { ModelTier, AIModel } from '../types';
import { authMiddleware } from '../auth/middleware';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const OUTPUTS_DIR = path.join(__dirname, '../../outputs');

const router = Router();

router.use(authMiddleware);

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { fileId, prompt, duration, inPoint, outPoint, provider, model, generationType, presetId, resolution, aspectRatio } = req.body;

  const isPreset = generationType === 'image-to-video' && presetId;

  if (!fileId) { res.status(400).json({ error: 'fileId is required' }); return; }
  if (!isPreset && !prompt) { res.status(400).json({ error: 'prompt is required' }); return; }
  if (isPreset && !PRESET_PROMPTS[presetId]) { res.status(400).json({ error: `Unknown preset: ${presetId}` }); return; }

  const uploadsFiles = fs.readdirSync(UPLOADS_DIR);
  const uploadedFile = uploadsFiles.find((f) => f.startsWith(fileId));
  if (!uploadedFile) { res.status(404).json({ error: `Upload not found: ${fileId}` }); return; }

  const filePath = path.join(UPLOADS_DIR, uploadedFile);
  const jobId = uuidv4();

  const resolvedGenerationType = generationType || 'video-to-video';
  const resolvedPrompt = isPreset ? PRESET_PROMPTS[presetId] : prompt;
  const resolvedProvider = isPreset ? 'runway' : (provider || 'runway');

  let resolvedModel: string;
  if (isPreset) resolvedModel = 'gen4_turbo';
  else if (model) resolvedModel = model;
  else if (resolvedProvider === 'fal') resolvedModel = 'kling-25-turbo-pro';
  else resolvedModel = 'gen4_aleph';

  const isImageToVideoModel = resolvedProvider === 'fal' || resolvedModel === 'gen4_turbo';
  const finalGenerationType = isImageToVideoModel ? 'image-to-video' : resolvedGenerationType;

  let resolvedDuration = duration;
  if (resolvedDuration == null && inPoint != null && outPoint != null && outPoint > inPoint) {
    const clipDuration = outPoint - inPoint;
    resolvedDuration = snapToAllowedDuration(resolvedModel as any, clipDuration);
  }
  if (resolvedDuration == null) resolvedDuration = 5;

  const genCost = getCreditCost(resolvedDuration);
  const balance = await getBalance(userId);

  if (balance.total < genCost && !balance.autoBuyEnabled) {
    res.status(402).json({ error: 'insufficient_credits', creditsNeeded: genCost, creditsAvailable: balance.total });
    return;
  }

  const deduction = await deductCredits(userId, genCost);
  if (!deduction.success) {
    res.status(402).json({ error: 'insufficient_credits', creditsNeeded: genCost, creditsAvailable: balance.total });
    return;
  }

  const modelTier = MODEL_TO_TIER[resolvedModel as AIModel] || 'pro';
  const updatedBalance = await getBalance(userId);

  await logTransaction({
    userId,
    type: 'generation',
    creditsAmount: -genCost,
    creditSource: deduction.source,
    modelUsed: modelTier as ModelTier,
    modelId: resolvedModel,
    presetUsed: presetId || undefined,
    generationId: jobId,
    balanceAfter: updatedBalance.total,
  });

  try {
    await addGenerationJob(jobId, fileId, filePath, resolvedPrompt, resolvedProvider, resolvedModel as any, finalGenerationType, isPreset ? presetId : undefined, resolvedDuration, resolution, aspectRatio, inPoint, outPoint, userId);
    res.json({ jobId, creditsCharged: genCost, balanceRemaining: updatedBalance.total, autoBought: deduction.autoBought });
  } catch (err: any) {
    await refundCredits(userId, genCost, deduction.source, jobId);
    res.status(500).json({ error: 'Failed to create generation job', creditsRefunded: genCost });
  }
});

router.get('/status/:jobId', (req: Request, res: Response): void => {
  const jobId = req.params.jobId as string;
  const state = getJobState(jobId);
  if (!state) { res.status(404).json({ error: 'Job not found' }); return; }
  res.json({ jobId: state.id, status: state.status, progress: state.progress, resultUrl: state.resultUrl, error: state.error });
});

router.get('/download/:jobId', (req: Request, res: Response): void => {
  const jobId = req.params.jobId as string;
  const outputPath = path.join(OUTPUTS_DIR, `${jobId}.mp4`);
  if (!fs.existsSync(outputPath)) { res.status(404).json({ error: 'Output not found' }); return; }
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="fxbuddy_${req.params.jobId}.mp4"`);
  fs.createReadStream(outputPath).pipe(res);
});

export default router;
