import { Router, Request, Response } from 'express';
import { getBalance, purchaseTopUp, changePlan, refreshSubscriptionCredits, setAutoBuy } from '../credits/creditManager';
import { getUsageStats, getRecentActivity } from '../credits/transactionLog';
import { PLAN_CONFIG, TOPUP_PACKS, CREDIT_COST, FEATURE_LABELS } from '../credits/planConfig';
import { authMiddleware } from '../auth/middleware';

const router = Router();

router.use(authMiddleware);

router.get('/balance', async (req: Request, res: Response): Promise<void> => {
  const balance = await getBalance(req.userId!);
  res.json(balance);
});

router.get('/usage', async (req: Request, res: Response): Promise<void> => {
  const usage = await getUsageStats(req.userId!);
  res.json(usage);
});

router.get('/activity', async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const activity = await getRecentActivity(req.userId!, limit, offset);
  res.json(activity);
});

router.post('/topup', async (req: Request, res: Response): Promise<void> => {
  const { packSize } = req.body;
  if (!packSize || !TOPUP_PACKS[packSize as keyof typeof TOPUP_PACKS]) {
    res.status(400).json({ error: 'Invalid pack size. Use: small, medium, or large.' });
    return;
  }
  try {
    const result = await purchaseTopUp(req.userId!, packSize);
    const balance = await getBalance(req.userId!);
    res.json({ success: true, creditsAdded: result.credits, pricePaid: result.priceUsd, newBalance: balance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/change-plan', async (req: Request, res: Response): Promise<void> => {
  const { plan } = req.body;
  if (!plan || !['starter', 'pro', 'studio', 'enterprise'].includes(plan)) {
    res.status(400).json({ error: 'Invalid plan.' });
    return;
  }
  try {
    await changePlan(req.userId!, plan);
    const balance = await getBalance(req.userId!);
    res.json({ success: true, newPlan: plan, newBalance: balance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auto-buy', async (req: Request, res: Response): Promise<void> => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled must be a boolean' });
    return;
  }
  try {
    await setAutoBuy(req.userId!, enabled);
    const balance = await getBalance(req.userId!);
    res.json({ success: true, autoBuyEnabled: enabled, newBalance: balance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    await refreshSubscriptionCredits(req.userId!);
    const balance = await getBalance(req.userId!);
    res.json({ success: true, newBalance: balance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/config', (_req: Request, res: Response): void => {
  res.json({ plans: PLAN_CONFIG, creditCost: CREDIT_COST, topupPacks: TOPUP_PACKS, featureLabels: FEATURE_LABELS });
});

export default router;
