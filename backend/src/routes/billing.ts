import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { getDb } from '../db/database';
import { authMiddleware } from '../auth/middleware';
import { refreshSubscriptionCredits, purchaseTopUp, changePlan, getBalance } from '../credits/creditManager';
import { PLAN_CREDITS } from '../credits/planConfig';
import { PlanId } from '../types';

const router = Router();

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

const PLAN_PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID || '',
  pro: process.env.STRIPE_PRO_PRICE_ID || '',
  studio: process.env.STRIPE_STUDIO_PRICE_ID || '',
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
};

const PRICE_ID_TO_PLAN: Record<string, PlanId> = {};
for (const [plan, priceId] of Object.entries(PLAN_PRICE_IDS)) {
  if (priceId) PRICE_ID_TO_PLAN[priceId] = plan as PlanId;
}

const TOPUP_AMOUNTS: Record<string, { credits: number; priceUsd: number }> = {
  small: { credits: 50, priceUsd: 1200 },
  medium: { credits: 150, priceUsd: 3000 },
  large: { credits: 300, priceUsd: 5000 },
};

// ─── Authenticated Routes ───────────────────────────────────────────────────

/**
 * POST /api/billing/create-checkout-session
 * Body: { type: 'subscription' | 'topup', plan?: string, packSize?: string }
 */
router.post('/create-checkout-session', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const stripe = getStripe();
  if (!stripe) { res.status(503).json({ error: 'Stripe not configured' }); return; }

  const { type, plan, packSize } = req.body;
  const userId = req.userId!;
  const db = getDb();

  const user = await db.getOne('SELECT id, email, stripe_customer_id FROM users WHERE id = $1', [userId]);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { fxbuddy_user_id: userId },
    });
    customerId = customer.id;
    await db.run('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, userId]);
  }

  try {
    if (type === 'subscription') {
      const priceId = PLAN_PRICE_IDS[plan];
      if (!priceId) { res.status(400).json({ error: 'Invalid plan' }); return; }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${req.headers.origin || 'https://fxbuddy.app'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin || 'https://fxbuddy.app'}/billing/cancel`,
        metadata: { fxbuddy_user_id: userId, type: 'subscription', plan },
      });

      res.json({ url: session.url });
    } else if (type === 'topup') {
      const pack = TOPUP_AMOUNTS[packSize];
      if (!pack) { res.status(400).json({ error: 'Invalid pack size' }); return; }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: `FXbuddy ${pack.credits} Credits` },
            unit_amount: pack.priceUsd,
          },
          quantity: 1,
        }],
        success_url: `${req.headers.origin || 'https://fxbuddy.app'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin || 'https://fxbuddy.app'}/billing/cancel`,
        metadata: { fxbuddy_user_id: userId, type: 'topup', packSize },
      });

      res.json({ url: session.url });
    } else {
      res.status(400).json({ error: 'type must be "subscription" or "topup"' });
    }
  } catch (err: any) {
    console.error('[Billing] Checkout error:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/billing/create-portal-session
 * Opens Stripe Customer Portal for subscription management.
 */
router.post('/create-portal-session', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const stripe = getStripe();
  if (!stripe) { res.status(503).json({ error: 'Stripe not configured' }); return; }

  const db = getDb();
  const user = await db.getOne('SELECT stripe_customer_id FROM users WHERE id = $1', [req.userId]);
  if (!user?.stripe_customer_id) { res.status(400).json({ error: 'No billing account found' }); return; }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${req.headers.origin || 'https://fxbuddy.app'}`,
  });

  res.json({ url: session.url });
});

// ─── Webhook (No Auth — Stripe Signature Verified) ──────────────────────────

/**
 * POST /api/billing/webhook
 * Must receive raw body for signature verification.
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const stripe = getStripe();
  if (!stripe) { res.status(503).json({ error: 'Stripe not configured' }); return; }

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Billing] STRIPE_WEBHOOK_SECRET not configured');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('[Billing] Webhook signature verification failed:', err.message);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  const db = getDb();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.fxbuddy_user_id;
        if (!userId) break;

        if (session.metadata?.type === 'subscription' && session.subscription) {
          const plan = session.metadata.plan as PlanId;
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;

          await db.run('UPDATE users SET stripe_subscription_id = $1 WHERE id = $2', [subId, userId]);
          await changePlan(userId, plan as Exclude<PlanId, 'free'>);
          await refreshSubscriptionCredits(userId);

          console.log(`[Billing] Subscription activated: user=${userId} plan=${plan} sub=${subId}`);
        } else if (session.metadata?.type === 'topup') {
          const packSize = session.metadata.packSize as 'small' | 'medium' | 'large';
          await purchaseTopUp(userId, packSize);
          console.log(`[Billing] Top-up purchased: user=${userId} pack=${packSize}`);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        if (!invoice.subscription) break;

        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
        const user = await db.getOne('SELECT id FROM users WHERE stripe_subscription_id = $1', [subId]);
        if (!user) break;

        await refreshSubscriptionCredits(user.id);
        console.log(`[Billing] Monthly renewal: user=${user.id} credits refreshed`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        if (!invoice.subscription) break;

        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
        const user = await db.getOne('SELECT id FROM users WHERE stripe_subscription_id = $1', [subId]);
        if (user) {
          console.warn(`[Billing] Payment failed for user ${user.id}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? PRICE_ID_TO_PLAN[priceId] : null;

        const user = await db.getOne('SELECT id FROM users WHERE stripe_subscription_id = $1', [subscription.id]);
        if (user && plan) {
          await changePlan(user.id, plan as Exclude<PlanId, 'free'>);
          console.log(`[Billing] Plan changed: user=${user.id} plan=${plan}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const user = await db.getOne('SELECT id FROM users WHERE stripe_subscription_id = $1', [subscription.id]);
        if (user) {
          await db.run('UPDATE users SET plan = $1, stripe_subscription_id = NULL, subscription_credits = 0 WHERE id = $2', ['free', user.id]);
          console.log(`[Billing] Subscription cancelled: user=${user.id} downgraded to free`);
        }
        break;
      }

      default:
        break;
    }
  } catch (err: any) {
    console.error(`[Billing] Webhook processing error (${event.type}):`, err.message);
  }

  res.json({ received: true });
});

export default router;
