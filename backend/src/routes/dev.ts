import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { runComparison, getAllComparisons } from '../models/comparison';
import { getAllCostEntries, getDailyMetrics } from '../utils/costTracker';
import { MODEL_REGISTRY } from '../models/config';
import { getAllPresetAssignments } from '../models/presetAssignments';
import { extractFirstFrame } from '../services/video-prep';
import { AIModel } from '../types';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const router = Router();

/**
 * POST /api/dev/compare
 * Run an A/B comparison across multiple models.
 * Dev/internal use only — not exposed to end users.
 *
 * Body: {
 *   fileId: string,        — uploaded video file to extract first frame from
 *   prompt: string,        — generation prompt
 *   duration?: number,     — 5 or 10 (default: 5)
 *   aspectRatio?: string,  — "16:9" | "9:16" | "1:1" (default: "16:9")
 *   models?: string[],     — specific models to test (default: all image-to-video models)
 *   inPoint?: number,      — frame extraction time offset
 * }
 */
router.post('/compare', async (req: Request, res: Response): Promise<void> => {
  const { fileId, prompt, duration, aspectRatio, models, inPoint } = req.body;

  if (!fileId || !prompt) {
    res.status(400).json({ error: 'fileId and prompt are required' });
    return;
  }

  const uploadsFiles = fs.readdirSync(UPLOADS_DIR);
  const uploadedFile = uploadsFiles.find((f) => f.startsWith(fileId));

  if (!uploadedFile) {
    res.status(404).json({ error: `Upload not found: ${fileId}` });
    return;
  }

  const filePath = path.join(UPLOADS_DIR, uploadedFile);

  try {
    const frameOffset = inPoint ?? 0;
    const framePath = extractFirstFrame(filePath, frameOffset);

    const result = await runComparison(
      framePath,
      prompt,
      duration || 5,
      aspectRatio || '16:9',
      models as AIModel[] | undefined,
    );

    res.json(result);
  } catch (err: any) {
    console.error(`[Dev] Comparison failed:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dev/comparisons
 * Get all comparison results.
 */
router.get('/comparisons', (_req: Request, res: Response): void => {
  res.json(getAllComparisons());
});

/**
 * GET /api/dev/costs
 * Get all cost tracking entries.
 */
router.get('/costs', (_req: Request, res: Response): void => {
  res.json(getAllCostEntries());
});

/**
 * GET /api/dev/costs/daily/:date
 * Get aggregated daily cost metrics.
 * Date format: YYYY-MM-DD
 */
router.get('/costs/daily/:date', (req: Request, res: Response): void => {
  res.json(getDailyMetrics(req.params.date as string));
});

/**
 * GET /api/dev/models
 * Get the full model registry.
 */
router.get('/models', (_req: Request, res: Response): void => {
  res.json(MODEL_REGISTRY);
});

/**
 * GET /api/dev/preset-assignments
 * Get preset-to-model assignments.
 */
router.get('/preset-assignments', (_req: Request, res: Response): void => {
  res.json(getAllPresetAssignments());
});

export default router;
