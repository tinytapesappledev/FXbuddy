# FXbuddy — Developer Handoff

Read this before touching any code. It explains what FXbuddy is, how the pieces connect, and
exactly what you need to do to get it deployed to production.

---

## What Is FXbuddy

FXbuddy is an **Adobe CEP plugin** — a panel that lives inside Premiere Pro and After Effects.
It lets video editors add AI-generated visual effects to timeline clips using text prompts.

**Core workflow:**
1. Editor selects a clip on their timeline.
2. Types a prompt like "add fire and sparks flying off the car".
3. FXbuddy extracts the clip, sends it to an AI video model, and generates a new video.
4. The generated video is automatically imported back onto the timeline.

**Other features:**
- **Motion Graphics** — Type a prompt, get a rendered lower third / title slam / logo reveal
  (powered by Remotion, a React-based video renderer running on the server).
- **Prompt Enhancement** — GPT-4o-mini rewrites prompts. Optionally analyzes the current frame
  with GPT-4o Vision for context-aware suggestions.
- **Credit-based billing** — Monthly subscription plans via Stripe. Each generation costs credits.
  Users can also buy one-time top-up packs.
- **Dark/Light theme** — Neumorphic UI with CSS variables. Dark mode matches Adobe's panel color.
- **Mini-games** — Blackjack, Flappy Bird, Memory Match, Wordle (themed around the mascot)
  appear during generation to keep users entertained.

---

## How It's Set Up

There are three main pieces:

### 1. Plugin Frontend (`plugin/client/`)

React 18 + TypeScript + Tailwind CSS. Bundled with Webpack. Runs inside Adobe's embedded
Chromium (CEP panel). Talks to the backend over HTTP (Axios) and WebSocket (Socket.io).

State management via Zustand. Auth tokens stored in localStorage with automatic refresh on 401.

**The backend URL** defaults to `http://localhost:4000` but is overridden by setting
`window.__FXBUDDY_API_BASE__` in `plugin/client/public/index.html`.

### 2. Host Script (`plugin/host/index.jsx`)

ExtendScript (Adobe's scripting engine) that bridges the React panel and the Adobe app.
Handles: reading the selected clip, exporting media to a temp file, importing generated
video back onto the timeline. Called via `CSInterface.evalScript()`.

### 3. Backend Server (`backend/`)

Node.js + Express + Socket.io + TypeScript. This is the only piece that gets deployed to the
cloud. It handles everything: auth, billing, credit management, file uploads, AI provider
calls, and real-time progress updates.

**Key areas:**

| Area | Files | What it does |
|---|---|---|
| Auth | `src/auth/` | JWT access tokens (15min) + refresh tokens (30 days). bcrypt passwords. |
| Billing | `src/routes/billing.ts` | Stripe Checkout Sessions, Customer Portal, webhook handling |
| Credits | `src/credits/` | Plan config, balance checks, deductions, refunds, auto-buy |
| Generation | `src/routes/generate.ts`, `src/services/queue.service.ts` | Upload → queue → AI call → download. Refunds credits on failure. |
| AI Providers | `src/services/runway.service.ts`, `src/services/fal.service.ts` | Runway ML (Gen-4 Turbo, Gen-4 Aleph) and fal.ai (Kling 2.5) |
| Motion | `src/services/motion.service.ts` | Remotion rendering with GPT-powered prompt-to-template mapping |
| Database | `src/db/database.ts` | SQLite for local dev, PostgreSQL for production. Auto-creates tables on startup. |
| Storage | `src/services/s3.service.ts` | Local filesystem for dev, S3/Cloudflare R2 for production |

**AI Models:**

| Tier | Model | Provider | Type |
|---|---|---|---|
| Lite | Runway Gen-4 Turbo | Runway ML | Image-to-video |
| Basic | Kling 2.5 Turbo Pro | fal.ai | Image-to-video |
| Pro | Runway Gen-4 Aleph | Runway ML | Video-to-video |

---

## Billing & Credits

**Plans:**

| Plan | Price/mo | Credits/mo |
|---|---|---|
| Free | $0 | 0 |
| Starter | $59 | 250 |
| Pro | $99 | 750 |
| Studio | $249 | 2,000 |
| Enterprise | $999 | 8,000 |

**Credit costs:** 5-second generation = 10 credits. 10-second = 20 credits.

**Top-up packs:** 50 credits/$12, 150 credits/$30, 300 credits/$50.

**How it works with Stripe:**
- User picks a plan in Settings → backend creates a Stripe Checkout Session → user pays on
  Stripe's hosted page → Stripe fires a webhook → backend activates the plan and adds credits.
- Monthly renewals: Stripe fires `invoice.paid` → backend resets subscription credits.
- Upgrades/downgrades: User clicks "Manage Subscription" → Stripe Customer Portal → Stripe
  fires `customer.subscription.updated` webhook → backend updates the plan.
- Cancellation: Stripe fires `customer.subscription.deleted` → backend downgrades to free.
- Credits deduct subscription credits first, then top-up credits. Auto-buy purchases a top-up
  pack automatically if the user is short and has it enabled.

---

## What You Need To Do

The code is feature-complete. Your job is to provision the external services, set the environment
variables, deploy, and test.

### Step 1: Push to GitHub

The code isn't in a repo yet. Create one and push:

```bash
cd /path/to/FXbuddy
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/FXbuddy.git
git push -u origin main
```

### Step 2: Set up Railway (hosting + database)

A Railway account already exists with a PostgreSQL database provisioned. You need to:

1. Go to the Railway project dashboard.
2. Create a new service → connect the GitHub repo.
3. Set the **root directory** to `backend` (so Railway builds from the backend folder).
4. In the backend service's **Variables** tab, add:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (this auto-wires the private database URL)
   - All the other env vars listed below.
5. Railway will build using the `Dockerfile` in `backend/` and deploy.

The database tables are created automatically when the server starts — don't create them manually.

### Step 3: Set up Stripe

1. Create a Stripe account: https://dashboard.stripe.com/register
2. Go to **Products** and create 4 products with monthly recurring prices:
   - FXbuddy Starter — $59/month
   - FXbuddy Pro — $99/month
   - FXbuddy Studio — $249/month
   - FXbuddy Enterprise — $999/month
3. Copy each product's **Price ID** (`price_...`) — you'll need all 4.
4. Go to **Developers → API Keys** → copy the **Secret key** (`sk_test_...`).
5. Go to **Developers → Webhooks** → add endpoint:
   - URL: `https://<your-railway-url>/api/billing/webhook`
   - Events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`,
     `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Signing secret** (`whsec_...`).

### Step 4: Set up Cloudflare R2 (file storage)

1. Create a Cloudflare account: https://dash.cloudflare.com/sign-up
2. Go to **R2 Object Storage** → create a bucket (e.g. `fxbuddy-files`).
3. Go to **Manage R2 API Tokens** → create a token with read + write access.
4. Note: the bucket endpoint is `https://<account-id>.r2.cloudflarestorage.com`.

### Step 5: Set all environment variables

On the Railway backend service, set every variable below:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `*` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | Generate with `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Generate a different one with `openssl rand -hex 32` |
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` from Stripe |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from Stripe |
| `STRIPE_STARTER_PRICE_ID` | `price_...` for Starter |
| `STRIPE_PRO_PRICE_ID` | `price_...` for Pro |
| `STRIPE_STUDIO_PRICE_ID` | `price_...` for Studio |
| `STRIPE_ENTERPRISE_PRICE_ID` | `price_...` for Enterprise |
| `RUNWAY_API_KEY` | From https://app.runwayml.com |
| `OPENAI_API_KEY` | From https://platform.openai.com/api-keys |
| `FAL_KEY` | From https://fal.ai/dashboard |
| `S3_BUCKET` | Your R2 bucket name |
| `S3_REGION` | `auto` |
| `S3_ACCESS_KEY_ID` | R2 API token access key |
| `S3_SECRET_ACCESS_KEY` | R2 API token secret key |
| `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `SENTRY_DSN` | (optional) From https://sentry.io |

### Step 6: Deploy and verify

1. Railway will auto-deploy after you set the variables and push to GitHub.
2. Check the Railway **deploy logs** for:
   - `[DB] PostgreSQL connected` — database is working
   - `FXbuddy Backend Server` banner — server started
3. Test the health endpoint: `curl https://<your-railway-url>/api/health`
4. Test auth: `POST /api/auth/register` with an email and password.

### Step 7: Build the plugin client for production

1. Edit `plugin/client/public/index.html` and add this inside `<head>` before other scripts:
   ```html
   <script>
     window.__FXBUDDY_API_BASE__ = 'https://<your-railway-url>';
   </script>
   ```
2. Build: `cd plugin/client && npm run build`
3. The output goes to `plugin/client/dist/` — this is what the CEP panel loads.
4. Install the CEP extension in Adobe and test end-to-end.

### Step 8: Test the full flow

- [ ] Register a new user account
- [ ] Subscribe to a plan (use Stripe test mode)
- [ ] Verify credits appear after webhook fires
- [ ] Run a VFX generation (select clip → prompt → generate → auto-import)
- [ ] Run a motion graphics generation
- [ ] Buy a top-up pack
- [ ] Upgrade/downgrade plan via Manage Subscription
- [ ] Test in both Premiere Pro and After Effects

---

## Known Issues To Clean Up

These are not blockers for deployment, but should be fixed:

1. **Billing redirect URLs** — `backend/src/routes/billing.ts` lines 71-72 and 92-93 use
   `https://fxbuddy.app` as the fallback success/cancel URL after Stripe checkout. Since the
   plugin runs inside Adobe (not a browser), these should point to a simple "you can close this
   tab" page, or a real domain if you buy one.

2. **No email verification** — Users can register without verifying their email. The
   `email_verified` column exists in the database but no email sending is implemented.

3. **No password reset** — No "forgot password" flow exists. Would need an email service
   (Resend, SendGrid, etc.).

4. **In-memory job queue** — The generation queue lives in a JavaScript `Map`. If the server
   restarts mid-generation, those jobs are lost. Fine for v1, but a persistent queue (Redis or
   database-backed) would be better long-term.

5. **Hardcoded scarcity** — `backend/src/credits/planConfig.ts` has `spotsLeft: 4` hardcoded
   for Studio and Enterprise plans. This shows "4 spots left" in the UI but never changes.

---

## Local Development

If you need to run it locally to debug:

```bash
# Backend (terminal 1)
cd backend
npm install
cp .env.example .env
# Edit .env: add RUNWAY_API_KEY, OPENAI_API_KEY, FAL_KEY
# Leave everything else empty
npm run dev
# → runs at http://localhost:4000, uses SQLite, skips auth

# Frontend (terminal 2)
cd plugin/client
npm install
npm run dev
# → runs at http://localhost:3000
```

In local mode: SQLite is used, a default user is auto-created with Pro plan + 750 credits,
auth is skipped, Stripe is disabled, files are stored on disk.

---

## Reference

- `changes.md` — Full chronological changelog of every feature and fix
- `PR.md` — Premiere Pro ExtendScript API reference
- `AE.md` — After Effects ExtendScript API reference
- `backend/.env.example` — All environment variables with comments
