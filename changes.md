# FXbuddy Change Log

## [2026-02-16] Implement prompt enhancer wand (OpenAI GPT-4o-mini)

**Scope**
- Backend / UI / Shared

**Reason**
- The magic wand (prompt enhancer) button was a stub that appended a hardcoded string. Users need an intelligent prompt enhancer that expands short VFX descriptions into detailed, AI-friendly instructions with preservation clauses, matching the quality of competitor plugins.

**Description**
- Created `backend/src/routes/enhance-prompt.ts`: new `POST /api/enhance-prompt` endpoint that accepts `{ prompt }` and returns `{ enhanced }` via OpenAI GPT-4o-mini with a tailored system prompt for VFX prompt enhancement.
- Registered the route in `backend/src/index.ts` and added the `openai` npm dependency.
- Added `OPENAI_API_KEY` to `.env.example` and `.env`.
- Added `enhancePrompt()` function to `plugin/client/src/services/api.ts`.
- Rewired `handleEnhancePrompt` in `VFXBuddyPanel.tsx` to be async: calls the backend, replaces the textarea content with the enhanced prompt, shows a spinner (`Loader2`) on the wand button while loading, and handles errors gracefully.
- Both wand buttons (Home tab and Motion tab) now disable when the prompt is empty or an enhancement is in progress.

**Risk Level**
- Low

**Rollback Plan**
- Revert `handleEnhancePrompt` in `VFXBuddyPanel.tsx` to the original hardcoded stub.
- Remove `enhance-prompt.ts` route and its registration in `index.ts`.
- Remove `enhancePrompt()` from `api.ts`.
- Uninstall the `openai` npm package.

## [2026-02-16] Enable copy/paste in CEP panel text inputs

**Scope**
- Shared / UI

**Reason**
- Adobe host applications (Premiere Pro, After Effects) intercept Cmd/Ctrl keyboard shortcuts (C, V, X, A, Z) before they reach the CEP panel's embedded Chromium browser. This prevents users from copying and pasting text into the prompt textarea and other input fields.

**Description**
- Call `CSInterface.registerKeyEventsInterest()` during panel initialization to tell the host app to pass clipboard-related key events through to the panel instead of consuming them.
- Add a fallback `document.keydown` handler that uses `document.execCommand()` to ensure clipboard operations execute even if native browser handling doesn't kick in.
- Affected key combos: Cmd/Ctrl + A (Select All), C (Copy), V (Paste), X (Cut), Z (Undo), Shift+Z (Redo).

**Risk Level**
- Low

**Rollback Plan**
- Remove the `registerKeyboardShortcuts()` function and its call in `initAdobe()` from `services/adobe.ts`.

## [2026-02-16] Add VFXbuddy Blackjack mini-game for generation wait times

**Scope**
- UI / Shared

**Reason**
- VFX generations take 2-5 minutes. Rather than staring at a progress bar, users get an engaging branded mini-game that turns wait time into fun, builds mascot attachment, and rewards play with small credit bonuses.

**Description**
- New `vfxbuddy-blackjack/` component tree under `plugin/client/src/components/` implementing a full blackjack game.
- VFXbuddy mascot acts as the dealer with 10+ animated SVG expressions reacting to every game state change.
- Dark theme (navy/charcoal) matching AE panel aesthetic with cyan and amber accents.
- Fake chip system (500 per session, 25/50/100/200 denominations) with auto-refill.
- Real credit rewards: 5-win streak = +1 credit, daily first blackjack = +1 credit, max 3/day via `onCreditEarned` callback.
- Card flip animations (CSS 3D transform), dealing animations, chip stacking, and mascot expression transitions.
- Auto-pauses when VFX generation completes (finishes current hand, then shows overlay).
- Standard blackjack rules: hit, stand, double down, split (one split), no insurance/surrender.
- Component API via `VFXBuddyBlackjackProps` for embedding in the existing plugin panel.
- Fully self-contained: no external game libraries, no sounds, no heavy assets.

**Risk Level**
- Low

**Rollback Plan**
- Delete the `plugin/client/src/components/vfxbuddy-blackjack/` directory.
- Remove any import/render of `VFXBuddyBlackjack` from the parent panel component.

## [2026-02-16] Fix EvalScript error handling and AE host script resilience

**Scope**
- Shared / UI

**Reason**
- Clicking "Generate" in After Effects shows a bare "EvalScript error." when the ExtendScript host file (`host/index.jsx`) fails to load. This gives no actionable information. Additionally, the AE code path silently falls through when no composition is active.

**Description**
- `adobe.ts`: `evalScript()` now auto-detects "EvalScript error." responses, reloads the host script via `$.evalFile()`, and retries the call once before failing.
- `adobe.ts`: New `reloadHostScript()` helper that re-evaluates the host JSX and verifies function availability.
- `VFXBuddyPanel.tsx`: `friendlyError()` now maps "EvalScript error" and "host script not loaded" to a user-friendly message advising panel restart. Also handles "no composition" and "no layer selected" AE-specific errors.
- `host/index.jsx`: `getSelectedClip()` now explicitly checks for `!comp` (no active item) and `!(comp instanceof CompItem)` (wrong item type selected), returning clear error messages instead of falling through to a generic catch-all.

**Risk Level**
- Low

**Rollback Plan**
- Revert the three files to their previous versions.

## [2026-02-16] Fix stale Runway upload URI causing "Asset duration" error

**Scope**
- Backend / UI

**Reason**
- Runway's ephemeral upload URIs expire quickly. When a cached URI expires, Runway reports "Asset duration must be at least 1 seconds" because it can't read the asset. This surfaces as a confusing 400 error to the user.

**Description**
- `runway.service.ts`: `startVideoToVideo()` now catches "asset duration" / "too_small" errors from `videoToVideo.create()`, clears the stale upload URI from cache, re-uploads the prepared video, and retries the generation request once.
- `video-prep.ts`: Added `clearCachedUpload()` export for targeted cache invalidation. Reduced upload cache TTL from 10 minutes to 5 minutes to better match Runway's ephemeral storage lifetime.
- `VFXBuddyPanel.tsx`: `friendlyError()` now maps "asset duration" errors to "Clip is too short — select a clip that is at least 1 second long and try again."

**Risk Level**
- Low

**Rollback Plan**
- Revert `runway.service.ts`, `video-prep.ts`, and `VFXBuddyPanel.tsx` to their previous versions.

## [2026-02-16] Restyle Blackjack mini-game to FXbuddy neumorphic brand

**Scope**
- UI

**Reason**
- The blackjack mini-game used a dark/neon cyberpunk theme (navy background, cyan/orange neon accents, cyberpunk robot mascot) that was completely inconsistent with the FXbuddy brand identity. The brand uses a warm gray neumorphic design system (#EEF0F5 base, soft raised/pressed shadows, black accent, Syne + Inter typography, simple mascot).

**Description**
- `utils/constants.ts`: Replaced entire `COLORS` palette from dark theme (#0D1117, #00E5FF, #FF9800) to neumorphic values (#EEF0F5 base, #000000 primary, #6B7280 secondary, status colors #22C55E/#EF4444).
- `Mascot.tsx`: Complete redesign from cyberpunk robot (visor, bow tie, screen face, ambient particles) to brand-spec mascot: black rounded rectangle (3:2 ratio, rx=16) with white oval eyes and neumorphic SVG shadow filter.
- `MascotExpressions.tsx`: Removed all mouths (brand: "Don't add a mouth or nose"), updated eye pupils from #0D1117 to #000000, replaced cyan sweat drops/sparkles/earpiece with gray/black, mapped expressions to brand eye states (idle ovals, squinted dealing, X-eyes error, arc eyes happy, wide surprised).
- `Card.tsx`: Cards now use neumorphic raised surfaces (dual-shadow pairs) instead of dark matte with neon glow. Card back shows mini FXbuddy mascot face icon instead of cyan V pattern.
- `Deck.tsx`: Neumorphic card stack with mascot icon instead of cyan V logo.
- `ChipSelector.tsx`: Replaced neon-colored chips (green/orange/cyan/purple) with neumorphic orbs using raised/pressed shadow states.
- `ActionButtons.tsx`: Neumorphic pill buttons (rounded-full, shadow-neu-button) with pressed shadow on mousedown, matching Generate button style.
- `Hand.tsx`: Updated result badges to use status-success green / status-error red instead of cyan/orange. Empty card placeholder uses inset neumorphic shadow.
- `GameResult.tsx`: Win/lose banners use neumorphic pressed background. New Hand button is neumorphic pill. Credit notification uses pressed badge.
- `GenerationComplete.tsx`: Light translucent overlay (rgba(238,240,245,0.88)) instead of dark. Modal uses neumorphic raised shadow. Film icon in neumorphic orb with black strokes. Button is neumorphic pill.
- `StatusBar.tsx`: Neumorphic pressed bar (inset shadow, rounded-full) instead of dark bg with border. Render timer dot uses status-success green.
- `VFXBuddyBlackjack.tsx`: Flat bg-base background instead of dark gradient. Title uses font-syne. Table divider is neumorphic pressed line. Deal button is neumorphic pill. Removed all inline font-family and dark-themed color references.

**Risk Level**
- Low (visual-only changes, no game logic affected)

**Rollback Plan**
- Revert all files under `plugin/client/src/components/vfxbuddy-blackjack/` to their previous versions.

## [2026-02-16] Remove credits system from Blackjack mini-game

**Scope**
- UI / Shared

**Reason**
- The bonus credits reward system (win-streak credits, daily blackjack bonus, max 3/day) is no longer desired. The blackjack game should be purely for entertainment during generation waits.

**Description**
- `constants.ts`: Removed `MAX_DAILY_BONUS_CREDITS`, `WIN_STREAK_FOR_CREDIT`, and credit-related quip strings (`hotStreak`, `dailyBlackjack`).
- `game.ts`: Removed `onCreditEarned` and `bonusCreditsEarnedToday` from `VFXBuddyBlackjackProps`.
- `useStreakTracker.ts`: Simplified to only track win streaks (removed all credit awarding, daily blackjack claim, and `onCreditEarned` callback logic).
- `useBlackjack.ts`: Removed `bonusCreditsEarnedToday` and `onCreditEarned` parameters, removed `creditEarnedMessage` state, removed credit awarding on wins/blackjacks, removed `bonusCreditsToday` and `creditEarnedMessage` from returned state.
- `VFXBuddyBlackjack.tsx`: Removed `onCreditEarned` and `bonusCreditsEarnedToday` props, removed `creditMessage` prop from `GameResult`, removed `bonusCreditsToday` prop from `StatusBar`.
- `StatusBar.tsx`: Removed entire "Credits: X/3" section and `bonusCreditsToday` prop.
- `GameResult.tsx`: Removed `creditMessage` prop and credit earned notification badge with its `bj-credit-pop` animation.
- `VFXBuddyPanel.tsx`: Removed `bonusCreditsToday` state, `handleCreditEarned` callback, and localStorage persistence for `vfxbuddy-bj-credits`.
- `App.tsx`: Updated `BlackjackPreview` wrapper to remove credit-related props.

**Risk Level**
- Low (removes a feature cleanly, no logic dependencies remain)

**Rollback Plan**
- Revert all listed files to their previous versions.

## [2026-02-16] Fix mascot rapid-fire blinking after tabbing back into Premiere

**Scope**
- UI / Shared

**Reason**
- When the user tabs away from Premiere Pro and returns, the FXbuddy mascot blinks extremely fast nonstop. The blink animation uses a recursive `setTimeout` chain where only the initial timer was tracked for cleanup. The subsequent recursive timeouts were never stored, so they couldn't be cancelled. When the CEP panel was backgrounded, throttled/paused timers accumulated and fired in rapid succession on refocus.

**Description**
- `vfxbuddy/Mascot.tsx`: Rewrote the blink `useEffect` to track the pending timeout in a mutable variable (`pendingTimer`) that gets updated with each recursive call, ensuring proper cleanup. Added `visibilitychange`, `blur`, and `focus` event listeners that pause the blink chain (clear pending timer + reset blink state) when the panel is hidden/blurred and restart it with a natural delay when visible/focused again. All inner `setTimeout` callbacks now guard against firing when `cancelled` or `document.hidden`.
- `vfxbuddy-blackjack/components/Mascot.tsx`: Applied the same fix to the dealer mascot's blink effect using its existing `blinkTimer` ref. Same visibility/focus pause/resume pattern.

**Risk Level**
- Low (blink timing logic only, no game or panel logic affected)

**Rollback Plan**
- Revert the blink `useEffect` blocks in both `Mascot.tsx` files to their previous recursive `setTimeout` implementations.

## [2026-02-16] Import generated video without audio and scale to sequence size

**Scope**
- PR / Shared

**Reason**
- When FXbuddy imports a generated video back into the Premiere Pro timeline, the audio track from the generated file is also placed, which is unwanted (AI-generated videos have no meaningful audio). Additionally, the generated video's native resolution (e.g. 1280×768 from Runway) is often smaller than the sequence frame size (e.g. 1920×1080), causing the clip to appear centered but not filling the frame.

**Description**
- `host/index.jsx` — `importAndReplaceClip()` PPRO path:
  - After `insertClip()`, iterate all audio tracks to find and remove any auto-placed audio clips matching the imported item's name and start time.
  - After insertion, read the sequence dimensions (`seq.frameSizeHorizontal`, `seq.frameSizeVertical`) and the imported media's source dimensions (via project metadata / XMP metadata).
  - If the source dimensions differ from the sequence, calculate a cover-fill scale factor (`Math.max(scaleX, scaleY)`) and apply it to the clip's Motion > Scale property via the component/property API.

**Risk Level**
- Low

**Rollback Plan**
- Revert the PPRO section of `importAndReplaceClip()` in `host/index.jsx` to the previous version (simple `insertClip` without audio removal or scaling).

## [2026-02-16] Add jump animation to home mascot on click

**Scope**
- UI

**Reason**
- When clicking the mascot on the home page, the eyes change to the excited state but the body doesn't visibly jump. The existing `mascot-double-bounce` CSS animation only applies to the inner face div, not the outer body. Users expect the whole mascot to hop up and down.

**Description**
- `Mascot.tsx`: Wrapped the entire mascot container in a new outer div that receives a `mascot-jump` CSS class when `status === 'clicked'`, causing the whole mascot body to jump up and down.
- `animations.css`: Added `@keyframes mascot-jump` with a decreasing-height multi-bounce (18px → 8px → 3px) over 0.7s for a playful feel.

**Risk Level**
- Low (visual-only, no logic changes)

**Rollback Plan**
- Remove the wrapper div from `Mascot.tsx` and the `mascot-jump` keyframes/class from `animations.css`.

## [2026-02-16] Fix raw "Asset duration" error leaking to UI

**Scope**
- Backend / UI / Shared

**Reason**
- When the Runway API rejects a clip with "Asset duration must be at least 1 seconds" (either due to a stale upload URI or a genuinely short clip), the raw JSON error response was displayed verbatim in the panel. The `sanitizeError()` function in `socket.ts` (WebSocket error path) was missing the "asset duration" check that `friendlyError()` in `VFXBuddyPanel.tsx` (direct error path) already had. Since generation errors flow through the WebSocket path, the friendly message was never shown.

**Description**
- `socket.ts`: Synced `sanitizeError()` with all checks from `friendlyError()` — added "asset duration", "too_small", "cancelled", "no clip selected", "evalscript error", "no composition", "no layer selected", "upload failed", and "file too large" mappings so that errors coming through the WebSocket path get the same friendly treatment.
- `runway.service.ts`: Wrapped the retry `videoToVideo.create()` call in its own try/catch. If the retry also fails with the same "asset duration" / "too_small" error, it now throws a clean `Error('Asset duration must be at least 1 second. Select a longer clip and try again.')` instead of letting the raw SDK error propagate. This distinguishes "genuinely too short" from "stale URI".

**Risk Level**
- Low

**Rollback Plan**
- Revert `sanitizeError()` in `socket.ts` and the retry catch block in `runway.service.ts`.

## [2026-02-16] Enhance Blackjack dealer mascot animations and expressions

**Scope**
- UI

**Reason**
- The dealer mascot was too static — just a gentle sine-wave bob with simple eye swaps. As a blackjack dealer it needs much more personality and reactivity to game events.

**Description**
- `Mascot.tsx`: Complete rewrite of the `DealerMascot` component with the following enhancements:
  - **Spring physics**: Adapted the main UI mascot's spring-based physics system (stiffness 0.065, damping 0.8) for smooth body tilt and squash/stretch based on velocity. Replaces the static sine-wave bob.
  - **Mouse tracking**: Eyes follow the cursor in idle/push states via spring physics, with idle random look-arounds every ~2.8s when the mouse is still.
  - **Tracking pupils**: All idle-state eyes now have dark pupils with a white highlight dot that follow the mouse/physics position. Provides a "looking at you" feel.
  - **Physics + animation separation**: Nested div structure — outer div applies physics transform (tilt, squash/stretch), inner div applies CSS expression animation. Prevents transform conflicts.
  - **Enhanced eye expressions** (10 total, all redesigned):
    - Idle: oval + tracking pupil + highlight + blink (with 8% double-blink chance)
    - Dealing: squinted focus + pupils sweep left-right (2s cycle, tracking cards)
    - Player Blackjack (shocked): huge wide eyes + tiny vibrating pupils
    - Player Bust (smug): happy arc ^_^ eyes (dealer pleased)
    - Player Win (annoyed): narrow squinted eyes + sideways pupils
    - Dealer Win (proud): happy arc left eye + wink right eye
    - Dealer Bust (embarrassed): spiral dizzy eyes (rotating 1.5s)
    - Push: idle eyes with tracking (neutral)
    - Hot Streak (nervous): shrinking eyes + darting pupils (speed increases with streak)
    - Gen Complete (excited): pulsing star-shaped eyes
  - **Richer CSS animations** (9 keyframe sets, all multi-step):
    - Shock: bouncy recoil with overshoot (cubic-bezier spring)
    - Smug: confident lean-back with rotation
    - Annoyed: multi-step head shake then slight droop
    - Proud: big victory bounce with overshoot (cubic-bezier spring)
    - Embarrassed: squash-down shrink (forwards fill)
    - Shrug: gentle up-down with alternating tilts
    - Nervous: rapid micro-trembling (0.12s cycle)
    - Excited: asymmetric bouncing with alternating tilts (infinite)
    - Dealing: rocking side-to-side with varying intensity (1.8s cycle)
  - **New accessories**:
    - `ExclamationMark`: animated "!" that fades in and slides up on player blackjack
    - `ThinkingDots`: three dots with staggered opacity animation during dealing
    - `SweatDrops`: now supports 3 drops (previously 2) for high hot streaks
  - **Improved blink**: 8% chance of double-blink, randomized interval 3.5-8.5s

**Risk Level**
- Low (visual-only changes to a single component, no game logic affected)

**Rollback Plan**
- Revert `Mascot.tsx` to its previous version.

## [2026-02-16] Wire up Earth Zoom-Out preset to Runway image-to-video API

**Scope**
- Backend / UI / Shared

**Reason**
- The Earth Zoom-Out preset in the Effects tab was a stub that only filled a text prompt and routed to the video-to-video pipeline. The effect requires image-to-video generation: capture the first frame of the selected clip, send it to Runway's Gen-4 Turbo image-to-video model with a curated zoom-out prompt, and place the result on the timeline.

**Description**
- `video-prep.ts`: Added `extractFirstFrame(inputPath, timeOffset)` utility that uses FFmpeg to extract a single JPEG frame from a video file at a given timestamp.
- `runway.service.ts`: Added `startImageToVideo(imagePath, prompt, ratio)` that uploads a frame to Runway ephemeral storage and calls `client.imageToVideo.create()` with `gen4_turbo` model.
- `types.ts`: Extended `AIModel` union with `'gen4_turbo'`. Added `generationType` (`'video-to-video' | 'image-to-video'`) and `presetId` fields to `GenerationJob`.
- `queue.service.ts`: Added image-to-video processing branch that extracts the first frame, calls `startImageToVideo()`, then polls/downloads/completes via the existing pipeline. Added server-side `PRESET_PROMPTS` map with the curated Earth Zoom-Out prompt.
- `generate.ts`: Route now accepts `generationType` and `presetId` parameters; validates preset IDs server-side.
- `api.ts` (client): Added `startPresetGeneration(fileId, presetId, inPoint?, outPoint?)` function.
- `VFXBuddyPanel.tsx`: Earth Zoom-Out click now triggers a dedicated preset flow — gets clip, uploads video, starts image-to-video preset generation — instead of just filling the prompt. Other effect presets remain unchanged (fill prompt + video-to-video).

**Risk Level**
- Medium (new API integration path, but reuses existing upload/poll/import infrastructure)

**Rollback Plan**
- Revert all listed files to their previous versions. The existing video-to-video pipeline is unaffected.

## [2026-02-17] Integrate fal.ai multi-model video generation (Wan 2.5, Kling 2.5, Seedance 1.0)

**Scope**
- Backend / UI / Shared

**Reason**
- Enable A/B testing across multiple AI video generation models to find the best quality-per-dollar for each VFX preset. All three new models (Wan 2.5, Kling 2.5 Turbo Pro, Seedance 1.0 Pro) are available through fal.ai's unified API, requiring only one SDK, one API key, and one billing account.

**Description**
- **New dependency**: `@fal-ai/client` added to backend. `FAL_KEY` environment variable added to `.env.example`.
- **`types.ts`**: Extended `AIProvider` with `'fal'`, `AIModel` with `'wan-25' | 'kling-25-turbo-pro' | 'seedance-pro'`. Added `resolution`, `aspectRatio`, and `costUsd` fields to `GenerationJob` and `GenerationRequest`.
- **`backend/src/models/config.ts`** (NEW): Central model registry with verified fal.ai endpoint IDs, resolution-dependent pricing, supported ratios, quality tiers, and capabilities. Single source of truth for model metadata.
- **`backend/src/services/fal.service.ts`** (NEW): fal.ai provider service. `startFalImageToVideo()` uploads images to fal.ai storage, builds model-specific input objects (Wan uses `resolution` string enum + `duration` as string; Kling uses numeric `duration` + `aspect_ratio`; Seedance uses both), calls `fal.subscribe()` which handles queue/polling internally, extracts video URL from `result.data.video.url`.
- **`backend/src/services/queue.service.ts`**: Added `provider === 'fal'` branch in `processJob()` that extracts first frame, calls `startFalImageToVideo()`, maps progress callbacks to Socket.io events. Added cost tracking via `logGeneration()` on completion. Updated `addGenerationJob()` signature with `resolution` and `aspectRatio` parameters.
- **`backend/src/routes/generate.ts`**: Updated to accept `resolution` and `aspectRatio` body params. fal.ai models auto-route to image-to-video pipeline. Default fal model is `wan-25`.
- **`backend/src/models/presetAssignments.ts`** (NEW): Maps preset IDs to optimal model/provider. Defaults all presets to Runway Gen-4 Turbo initially. Updated after running A/B comparisons.
- **`backend/src/utils/costTracker.ts`** (NEW): Per-generation cost logging to `logs/cost-tracking.json` with daily aggregation via `getDailyMetrics()`.
- **`backend/src/models/comparison.ts`** (NEW): A/B testing utility. `runComparison()` fires the same prompt across all image-to-video models in parallel via `Promise.allSettled()`, logs results to `logs/model-comparisons.json`.
- **`backend/src/routes/dev.ts`** (NEW): Dev-only routes registered at `/api/dev/`: `POST /compare` (run A/B test), `GET /comparisons` (view results), `GET /costs` (cost log), `GET /costs/daily/:date` (daily metrics), `GET /models` (model registry), `GET /preset-assignments`.
- **`backend/src/index.ts`**: Registered dev router at `/api/dev`.
- **`VFXBuddyPanel.tsx`**: Added Wan 2.5, Kling 2.5 Pro, and Seedance Pro to `AI_MODELS` selector array for internal/dev testing.

**Verified fal.ai endpoints**:
- Wan 2.5: `fal-ai/wan-25-preview/image-to-video` ($0.05-0.15/sec by resolution)
- Kling 2.5 Turbo Pro: `fal-ai/kling-video/v2.5-turbo/pro/image-to-video` ($0.07/sec)
- Seedance 1.0 Pro: `fal-ai/bytedance/seedance/v1/pro/image-to-video` (~$0.124/sec at 1080p)

**Risk Level**
- Low (additive — all existing Runway and Luma pipelines are untouched; fal.ai models are a new parallel path)

**Rollback Plan**
- Remove `@fal-ai/client` from `package.json` and run `npm install`.
- Delete new files: `fal.service.ts`, `models/config.ts`, `models/comparison.ts`, `models/presetAssignments.ts`, `utils/costTracker.ts`, `routes/dev.ts`.
- Revert `types.ts`, `queue.service.ts`, `generate.ts`, `index.ts`, and `VFXBuddyPanel.tsx` to their previous versions.
- Remove `FAL_KEY` from `.env.example` and `.env`.

## [2026-02-17] Fix non-Runway models ignoring clip duration (always generating 5s)

**Scope**
- Backend / Shared

**Reason**
- All image-to-video models (fal.ai Wan 2.5, Kling 2.5/2.6/3.0, Seedance, Grok, and Runway Gen-4 Turbo) default to generating 5-second clips regardless of the actual selected clip length. The client sends `inPoint` and `outPoint` but never computes `duration` from them, and the backend falls back to `state.duration ?? 5`. This wastes credits when the selected clip is shorter than 5 seconds and produces mismatched lengths on the timeline.

**Description**
- `generate.ts`: When `duration` is not provided but both `inPoint` and `outPoint` are, compute `duration = outPoint - inPoint`. Clamp to a minimum of 1 second and cap to the model's `maxDuration` from the model registry.
- `queue.service.ts`: Replace the hardcoded `duration: 5` in the Runway image-to-video path with `state.duration ?? 5` so it respects the computed duration like all other paths. Ensure all generation paths consistently use `state.duration`.

**Risk Level**
- Low

**Rollback Plan**
- Revert `generate.ts` and `queue.service.ts` to their previous versions.

## [2026-02-17] Fix Kling 2.6 Pro "Unprocessable Entity" error and add per-model duration snapping

**Scope**
- Backend / UI / Shared

**Reason**
- Kling 2.6 Pro image-to-video fails with "Unprocessable Entity" (HTTP 422) because the code sends an `aspect_ratio` parameter that this model's fal.ai endpoint does not accept. Additionally, with duration now computed from clip length, arbitrary values like 3 or 7 would be rejected by models that only accept specific durations (e.g. Kling 2.5/2.6 only accept "5" or "10"). The raw "Unprocessable Entity" error also leaks to the UI without a friendly message.

**Description**
- `fal.service.ts`: Removed `aspect_ratio` from Kling 2.6 Pro input object (the v2.6 i2v endpoint doesn't accept it, unlike v2.5 and v3.0). Added `snapToAllowedDuration()` helper that snaps arbitrary durations to the nearest valid value from the model's allowed set.
- `config.ts`: Added `allowedDurations` array to `ModelConfig` interface and populated it for all models based on fal.ai API schemas (Wan 2.5: [5,10], Kling 2.5/2.6: [5,10], Kling 3.0: [3-15], Seedance: [2-12], Grok: [6-15], Runway: [5,10]).
- `socket.ts`: Added "unprocessable" mapping in `sanitizeError()` to show a friendly message instead of the raw HTTP status text.
- `VFXBuddyPanel.tsx`: Added matching "unprocessable" mapping in `friendlyError()`.

**Risk Level**
- Low

**Rollback Plan**
- Revert `fal.service.ts`, `config.ts`, `socket.ts`, and `VFXBuddyPanel.tsx` to their previous versions.

## [2026-02-17] Implement credit system, 3 model tiers & settings UI

**Scope**
- Backend / UI / Shared / Build

**Reason**
- VFXbuddy needs a credit-based billing system to monetize AI video generation. Users need visibility into their credit balance, usage patterns, and a way to purchase more credits or upgrade their plan. The 10 AI models needed to be consolidated to 3 user-friendly tiers (Basic/Pro/Studio) with clear credit costs.

**Description**
- **Phase 1 — Reduce to 3 Models**: Removed all models except Basic (Runway Gen-4 Turbo, 5 cr), Pro (Kling 2.5 Turbo Pro, 7 cr), and Studio (Runway Gen-4 Aleph, 15 cr). Deleted `luma.service.ts` and removed `lumaai` dependency. Updated `AI_MODELS` array, `MODEL_REGISTRY`, `AIModel` type union, and removed all Luma/Wan/Seedance/Grok/Kling-2.6/Kling-3.0 references from `queue.service.ts`, `fal.service.ts`, `generate.ts`, and `VFXBuddyPanel.tsx`.
- **Phase 2 — SQLite + Credits Backend**: Added `better-sqlite3` dependency. Created `db/database.ts` (SQLite init with WAL mode, auto-creates tables and default user) and `db/schema.sql` (users, credit_transactions, generations tables with indexes). Created `credits/planConfig.ts` (CREDIT_COSTS, PLAN_CONFIG, TOPUP_PACKS, feature gating). Created `credits/creditManager.ts` (deductCredits with subscription-first deduction, refundCredits, getBalance, refreshSubscriptionCredits, purchaseTopUp, changePlan). Created `credits/transactionLog.ts` (logTransaction, getUsageStats, getRecentActivity).
- **Phase 3 — Credit API Routes**: Created `routes/credits.ts` with endpoints: GET /balance, /usage, /activity, /config; POST /topup, /change-plan, /refresh. Registered at `/api/credits` in `index.ts`. Modified `generate.ts` to check credit balance before generation, deduct upfront, and return `402 insufficient_credits` with suggestions. Added refund-on-failure in `queue.service.ts` catch block.
- **Phase 4 — Frontend UI**: Created `ModelSelector.tsx` (neumorphic radio card group with tier names, subtitles, descriptions, credit costs, and balance info). Created `CreditBadge.tsx` (animated balance pill with low/empty credit warning states). Created `InsufficientCreditsModal.tsx` (shows shortfall, suggests cheaper models, buy/upgrade CTAs). Created `SettingsPage.tsx` (full-panel overlay with 4 sections: Credit Balance hero with progress bar, Usage This Month breakdown table, Recent Activity feed, Plan & Billing with upgrade and top-up packs). Created `useCreditStore.ts` (Zustand store for credit state with optimistic deduction). Added credit API functions to `api.ts`.
- **Phase 5 — Integration**: Rewired `VFXBuddyPanel.tsx`: replaced 10-model dropdown with 3-tier ModelSelector, added CreditBadge to header, generate button shows "Generate — X credits", settings button opens full SettingsPage overlay, insufficient credits triggers modal with suggestions. All UI uses existing neumorphic design system (#EEF0F5 base, shadow-neu-* pairs, Syne/Inter typography, monochrome accents).
- **New types**: `ModelTier`, `PlanId`, `CreditTransactionType`, `CreditSource`, `UserAccount`, `CreditTransaction`, `GenerationRecord` added to `types.ts`.
- **Default user**: Single-user mode with "Heat" plan (750 credits) created on first boot.

**Risk Level**
- Medium (major feature addition, but backend credit logic is self-contained and frontend changes are additive)

**Rollback Plan**
- Delete new directories: `backend/src/db/`, `backend/src/credits/`.
- Delete new files: `ModelSelector.tsx`, `CreditBadge.tsx`, `SettingsPage.tsx`, `InsufficientCreditsModal.tsx`, `useCreditStore.ts`.
- Revert modified files: `types.ts`, `config.ts`, `fal.service.ts`, `queue.service.ts`, `generate.ts`, `index.ts`, `api.ts`, `VFXBuddyPanel.tsx`, `package.json` to their previous versions.
- Restore `luma.service.ts` from git history.
- Remove `better-sqlite3` and `@types/better-sqlite3` dependencies.
- Delete `backend/data/` directory (SQLite database).

## [2026-02-17] Replace "cr" text with star icon & fix prompt enhancer button visibility

**Scope**
- UI / Shared

**Reason**
- User wants a distinctive 4-pointed star icon instead of "cr" text for the credit currency symbol, matching the monochrome neumorphic color scheme.
- The prompt enhancer (wand) button was only visible on hover and positioned at top-right; user wants it always visible as a solid rounded button at bottom-right of the text area.

**Description**
- Created `CreditIcon.tsx` — a 4-pointed star SVG component inheriting currentColor, used everywhere "cr" appeared.
- Updated `CreditBadge.tsx`, `ModelSelector.tsx`, `InsufficientCreditsModal.tsx`, and `SettingsPage.tsx` to use the star icon instead of "cr" text.
- Moved the prompt enhancer button from top-right to bottom-right of the textarea on the Home tab.
- Changed the button styling from invisible-until-hover to always-visible with a solid neumorphic raised button style (`bg-base shadow-neu-button`).
- Applied the same treatment to the Motion tab's wand and upload buttons.

**Risk Level**
- Low

**Rollback Plan**
- Revert `CreditIcon.tsx`, restore "cr" text in badge/selector/modal/settings, and restore original wand button positioning and styling.

## [2026-02-17] Rename model tiers: Basic→Lite, Pro→Basic, Studio→Pro with new descriptions

**Scope**
- Backend / UI / Shared

**Reason**
- User requested a tier rename to better communicate what each tier does. "Lite" and "Basic" both generate new clips (don't preserve movement), while "Pro" applies effects directly (preserves movement). Updated descriptions explain this clearly.

**Description**
- `types.ts`: Changed `ModelTier` from `'basic' | 'pro' | 'studio'` to `'lite' | 'basic' | 'pro'`.
- `config.ts`: Updated `MODEL_REGISTRY` tier, name, and description fields. Updated `TIER_TO_MODEL` and `MODEL_TO_TIER` mappings.
- `planConfig.ts`: Updated `CREDIT_COSTS` keys, `PlanFeature` type, and `PLAN_CONFIG` feature arrays. Updated `getSuggestion()` fallback reference.
- `generate.ts`: Updated fallback tier from `'basic'` to `'lite'`.
- `VFXBuddyPanel.tsx`: Updated `AI_MODELS` array with new tier IDs, labels, and descriptions.
- `SettingsPage.tsx`: Updated `TIER_LABELS` mapping.

**Risk Level**
- Low (rename only, no logic changes)

**Rollback Plan**
- Revert all listed files to their previous versions.

## [2026-02-17] Fix generation stuck on "Queued" — Socket.io reconnection + polling fallback

**Scope**
- UI / Shared

**Reason**
- When the backend is not running at the time the CEP panel loads, Socket.io tries to reconnect 10 times over ~10 seconds and then gives up permanently. After that, even if the backend starts and REST API calls work (enhance prompt, upload, generate), the WebSocket connection is dead, so generation progress/completion events never reach the UI. The generation completes on the backend but the panel stays stuck on "Queued… / PROCESSING…" forever.

**Description**
- `socket.ts`: Changed `reconnectionAttempts` from `10` to `Infinity` with `reconnectionDelayMax: 10000` so Socket.io never gives up reconnecting, using exponential backoff up to 10 seconds between attempts.
- `socket.ts`: Added `startPollingFallback()` / `stopPollingFallback()` — a REST-based polling fallback that hits `GET /api/generate/status/:jobId` every 3 seconds when a job is active but Socket.io is disconnected. Automatically stops when the socket reconnects or the job completes/fails.
- `VFXBuddyPanel.tsx`: Added a `useEffect` that calls `startPollingFallback()` whenever a generation job is active (`jobId` set and status is uploading/queued/generating/downloading). This covers all generation paths (video-to-video, image-to-video, preset, file-picker).

**Risk Level**
- Low

**Rollback Plan**
- Revert `socket.ts` to its previous version (restore `reconnectionAttempts: 10`, remove polling functions).
- Revert `VFXBuddyPanel.tsx` to remove the `startPollingFallback` import and useEffect.

## [2026-02-17] Replace auto-show Blackjack with dismissible game prompt popup

**Scope**
- UI

**Reason**
- Blackjack auto-popped up 1.5 seconds into every generation, taking over the entire panel without asking. Users should be asked first via a dismissible popup.

**Description**
- `VFXBuddyPanel.tsx`: Replaced the auto-show blackjack behavior (`setTimeout → setShowBlackjack(true)`) with a popup prompt that appears after 1.5 seconds instead.
- The popup is a neumorphic modal with a gamepad icon, the message "Play some games while you wait?", a "Let's play!" button, and an X close button.
- Clicking X dismisses the popup and sets `gameDismissed` so it won't re-appear for the current generation. A subtle "Play Blackjack while you wait" text link reappears under the status text for users who change their mind.
- Clicking "Let's play!" opens blackjack as before.
- All state (`showGamePrompt`, `gameDismissed`) resets when the generation completes, fails, or is reset.

**Risk Level**
- Low (UI-only, no generation logic affected)

**Rollback Plan**
- Revert `VFXBuddyPanel.tsx` to its previous version to restore the auto-show blackjack behavior.

## [2026-02-17] Remove model selector — hardcode Runway Gen-4 Aleph, show credit cost on Generate button

**Scope**
- UI / Shared

**Reason**
- User wants to remove the ability to switch between different AI models and use only Runway Gen-4 Aleph. The credit cost (15 per generation) still needs to be visible.

**Description**
- `VFXBuddyPanel.tsx`: Replaced `AI_MODELS` array and `selectedModelIdx` state with a fixed `MODEL` constant (`{ provider: 'runway', model: 'gen4_aleph' }`) and `CREDIT_COST = 15`. Removed `ModelSelector` component from the render. All generation paths (video-to-video, file-picker, preset) now use the hardcoded model. The Generate button now reads "Generate 15 ✦" (using the `CreditIcon` star) in its idle state. The "not enough credits" state shows "Need X more credits". Removed `ModelSelector` import.
- `InsufficientCreditsModal.tsx`: Simplified — removed `modelTier`, `models`, and `onSwitchModel` props. Removed the "You can afford these" cheaper model suggestions section. Now only shows the credit shortfall message with "Buy Credits" and "Upgrade Plan" buttons.

**Risk Level**
- Low (UI-only, backend still supports multiple models if needed in the future)

**Rollback Plan**
- Revert `VFXBuddyPanel.tsx` and `InsufficientCreditsModal.tsx` to their previous versions to restore the 3-tier model selector.

## [2026-02-17] Replace credit system with generation-based billing, 4-tier plans, duration toggle, auto-buy

**Scope**
- Backend / UI / Shared / Build

**Reason**
- The abstract credit currency (5/7/15 credits per model) no longer made sense after collapsing to a single model. Users should see "X generations remaining" rather than abstract credit numbers. New pricing tiers needed: Starter ($59), Pro ($99), Studio ($249), Enterprise ($999) with differentiated features and scarcity. Users also need to choose between 5s and 10s VFX duration, with 10s costing double.

**Description**
- **`types.ts`**: Changed `PlanId` from `'free'|'flow'|'heat'|'inferno'` to `'free'|'starter'|'pro'|'studio'|'enterprise'`. Added `autoBuyEnabled` to `UserAccount`. Added `'auto_buy'` to `CreditTransactionType`.
- **`planConfig.ts`**: Complete rewrite. `GENERATION_COST` maps duration to cost (5s=1, 10s=2). `PLAN_GENERATIONS` (25/75/200/800). `PLAN_PRICES` ($59/$99/$249/$999). `PLAN_CONFIG` with per-plan features (prompt_bible, masterclass, discord, workflow_setup, inner_circle), scarcity badges for Studio/Enterprise, recommended flag for Pro. `TOPUP_PACKS` now generation packs (5/$12, 15/$30, 30/$50). `FEATURE_LABELS` for display.
- **`schema.sql`**: Added `auto_buy_enabled` column to users table.
- **`database.ts`**: Default plan changed to 'pro' (75 gens). Added migration to add `auto_buy_enabled` column and migrate old plan names (flow→starter, heat→pro, inferno→studio).
- **`creditManager.ts`**: Updated to use `PLAN_GENERATIONS`. Added `setAutoBuy()` function. `deductCredits()` now includes auto-buy logic: if balance insufficient and auto-buy enabled, purchases smallest pack that covers the shortfall.
- **`credits.ts` route**: Updated `change-plan` to accept new plan IDs. Added `POST /api/credits/auto-buy` endpoint. Updated config response.
- **`generate.ts` route**: Accepts explicit `duration` (5 or 10). Computes generation cost via `getGenerationCost()`. Deducts 1 or 2 generations. Auto-buy triggers if enabled.
- **`queue.service.ts`**: Refund on failure now uses `getGenerationCost()` instead of old credit costs.
- **`api.ts` (frontend)**: Renamed `CreditBalance` to `GenerationBalance` with `autoBuyEnabled` and `planGenerationsTotal`. Updated all API functions. Added `setAutoBuy()`. `changePlan()` accepts new plan IDs.
- **`useCreditStore.ts`**: Updated types and imports. Added `toggleAutoBuy()` action. Updated `switchPlan()` to accept new plan IDs.
- **`VFXBuddyPanel.tsx`**: Removed `CREDIT_COST` constant. Added `selectedDuration` state (5 or 10) and `generationCost` derived value. Added neumorphic duration toggle (5s/10s segmented control) above the footer actions. Generate button now shows "Generate 1 gen" or "Generate 2 gens". All `startGeneration()` calls now pass `selectedDuration`. Removed `CreditIcon` import.
- **`CreditBadge.tsx`**: Shows "X gens" instead of "X star-icon". Low threshold changed from 15 to 3.
- **`InsufficientCreditsModal.tsx`**: All "credits" wording replaced with "generations".
- **`SettingsPage.tsx`**: Complete rewrite. Balance hero shows "generations remaining". 4-tier plan card stack: Starter/Pro/Studio/Enterprise. Pro has "Recommended" badge. Studio and Enterprise have red scarcity badges. Each card shows price, generation count, feature list, upgrade/switch button. Extra Generations section with auto-buy toggle and 3 generation packs. All "credit" terminology replaced with "generation".
- Deleted `ModelSelector.tsx` (no longer used).

**Risk Level**
- Medium (major billing system overhaul, but backend credit tracking logic is structurally identical — just renaming units)

**Rollback Plan**
- Revert all modified files to their previous versions.
- Delete `backend/data/fxbuddy.db` to recreate with old schema.
- Restore `ModelSelector.tsx` from git history.

## [2026-02-18] Remotion Motion Tab — AI-prompted motion graphics generation

**Scope**
- Backend / UI / Shared / Build

**Reason**
- The Motion tab was a stub that called the same Runway video-to-video pipeline as the Home tab. Motion graphics (titles, lower thirds, logo reveals, kinetic typography, transitions) don't need AI video generation APIs — they can be rendered from code using Remotion for near-zero per-render cost.

**Description**
- **Remotion sub-project** (`backend/remotion/`): New package with `remotion`, `@remotion/bundler`, `@remotion/renderer`, `@remotion/google-fonts`, `react`, `react-dom`, `zod`. Contains `Root.tsx` that registers 5 compositions, `schemas/index.ts` with Zod schemas and TypeScript types for all template props, and 5 template components:
  - `TitleSlam.tsx` — Bold title slam/fade/slide animation with spring physics and 5 Google Font options
  - `LowerThird.tsx` — Name + title bar with staggered slide-in animation
  - `LogoReveal.tsx` — Logo image with fade/zoom/glitch reveal styles (includes RGB split for glitch)
  - `KineticType.tsx` — Word-by-word, letter-by-letter, or line-by-line animated text
  - `SimpleTransition.tsx` — Wipe/fade/zoom/slide transition between two colors
  All templates: 1920x1080 @ 30fps, transparent backgrounds by default, dynamic duration via `calculateMetadata`, sensible defaults.
- **`motion.service.ts`** (NEW): Bundle caching (`bundle()` called once, cached), concurrency-limited `renderMedia()` wrapper (1 render at a time via semaphore), Socket.io progress reporting (`generation:progress`/`completed`/`failed`), credit refund on failure. Also contains `mapPromptToTemplate()` — calls OpenAI GPT-4o-mini with JSON mode to map natural language prompts to `{templateId, props}` against a system prompt listing all 5 templates and their schemas.
- **`routes/motion.ts`** (NEW): `POST /api/motion/generate` (accepts prompt or templateId+props, validates via Zod, deducts 5 credits, starts render), `GET /api/motion/status/:jobId`, `GET /api/motion/download/:jobId`, `GET /api/motion/templates` (returns template catalog). Registered at `/api/motion` in `index.ts`.
- **`types.ts`**: Added `'remotion'` to `AIProvider`, `'remotion-local'` to `AIModel`, `'motion'` to `GenerationType`, and `templateId`/`templateProps` fields to `GenerationJob`.
- **`index.ts`**: Registered motion router and `setMotionIo(io)` call.
- **`api.ts`** (frontend): Added `startMotionGeneration()`, `getMotionStatus()`, `getMotionDownloadUrl()`.
- **`socket.ts`**: Updated polling fallback to try both `/api/generate/status` and `/api/motion/status` endpoints.
- **`VFXBuddyPanel.tsx`**: Complete rewrite of Motion tab. New `handleMotionGenerate()` function that calls `/api/motion/generate` without needing a source clip. Removed Upload button. Added 2s/3s/5s duration toggle. Added 5 template quick-select buttons with icons (Type, Layers, Image, AlignLeft, ArrowRightLeft from lucide-react). Added status text, progress bar, reset/settings buttons. Motion generates at 5 credits (vs 10-20 for VFX).
- **`AE.md` and `PR.md`**: Copied from `Extension_Template/` to project root to satisfy cursor rules.

**Risk Level**
- Low (additive — entirely new rendering pipeline via Remotion, no changes to existing VFX generation paths)

**Rollback Plan**
- Delete `backend/remotion/` directory entirely.
- Delete `backend/src/services/motion.service.ts` and `backend/src/routes/motion.ts`.
- Revert `types.ts`, `index.ts`, `api.ts`, `socket.ts`, and `VFXBuddyPanel.tsx` to their previous versions.
- Remove `@remotion/bundler`, `@remotion/renderer`, `zod` from `backend/package.json` and run `npm install`.
- Delete `AE.md` and `PR.md` from project root.

## [2026-02-18] Image-aware prompt enhancement with separate VFX and Motion modes

**Scope**
- Backend / UI / Shared

**Reason**
- The prompt enhancer (wand button) had zero awareness of what was actually in the user's image. It generated generic VFX instructions with placeholder language like "keep everything the same" without knowing what "everything" was. Additionally, the same VFX-oriented system prompt was used for both the Home tab (video effects) and Motion tab (motion graphics), producing irrelevant "overlay effect on existing footage" language for template-based motion graphics.

**Description**
- **`backend/src/services/vision.service.ts`** (NEW): Vision analysis service using GPT-4o. Two functions: `analyzeSceneForVFX(imagePath)` describes physical elements, environment, lighting, and materials for VFX overlay prompts; `analyzeImageForMotion(imagePath)` extracts brand colors, visual style, and shape characteristics for motion graphics. In-memory MD5-keyed cache prevents redundant API calls when the same image is analyzed multiple times.
- **`backend/src/routes/enhance-prompt.ts`**: Extended `POST /api/enhance-prompt` to accept `{ prompt, mode?, mediaPath?, inPoint?, imageFileId? }`. When `mediaPath` is provided (Home tab), extracts a frame via `extractFirstFrame()` and runs VFX scene analysis. When `imageFileId` is provided (Motion tab), finds the uploaded image and runs motion image analysis. Two distinct system prompts: VFX prompt references specific scene elements from the vision analysis while preserving the scene; Motion prompt is template-aware (knows all 5 Remotion templates, available fonts, animation styles) and generates descriptions optimized for `mapPromptToTemplate()`.
- **`plugin/client/src/services/api.ts`**: Updated `enhancePrompt()` to accept optional `{ mode, mediaPath, inPoint, imageFileId, cachedDescription }` parameters.
- **`plugin/client/src/components/vfxbuddy/VFXBuddyPanel.tsx`**: Split `handleEnhancePrompt` into mode-aware logic. Home tab: calls `getSelectedClip()` to get `mediaPath`/`inPoint`, passes to enhance endpoint for scene-aware VFX enhancement. Motion tab: passes `motionImageFileId` if an image is attached, uses `mode: 'motion'` for template-aware enhancement. Added `motionImageFileId` state to track uploaded image IDs. Added `enhanceStatus` state for "Analyzing scene..." indicator during the vision phase. Added frontend scene description cache (`sceneDescriptionCache`) keyed on `mediaPath + inPoint` to skip redundant vision calls.

**Risk Level**
- Low (additive — existing text-only enhancement still works when no image is provided; backward-compatible API)

**Rollback Plan**
- Delete `backend/src/services/vision.service.ts`.
- Revert `enhance-prompt.ts`, `api.ts`, and `VFXBuddyPanel.tsx` to their previous versions.

## [2026-02-18] Production readiness — auth, Stripe billing, security, cloud deployment

**Scope**
- Backend / UI / Shared / Build / Licensing

**Reason**
- FXbuddy ran as a single-user local-only system with no authentication, no billing, and all API keys exposed on the user's machine. This makes it impossible to monetize, secure, or scale. Production launch requires user accounts, Stripe billing, API security, and cloud deployment.

**Description**
- **Database abstraction** (`db/database.ts`): Complete rewrite. Unified async DB interface (`AsyncDB`) that supports both SQLite (local dev) and PostgreSQL (production) via `DATABASE_URL` env var. Auto-detects and initializes the correct backend. PostgreSQL schema in `pg-schema.sql` with auth columns (`password_hash`, `stripe_customer_id`, `stripe_subscription_id`, `email_verified`) and `refresh_tokens` table.
- **Authentication** (`auth/jwt.ts`, `auth/middleware.ts`, `routes/auth.ts`): JWT-based auth with bcrypt password hashing. Access tokens (15min) + refresh tokens (30 days, hashed, stored in DB). Auth middleware validates JWT on every protected route; falls back to `default-user` in local dev mode. Routes: register, login, refresh, logout, me, logout-all.
- **Multi-user support**: All `DEFAULT_USER_ID` references in `generate.ts`, `motion.ts`, `credits.ts`, `queue.service.ts` replaced with `req.userId` from auth middleware. `GenerationJob` type now includes `userId` field. Credit manager and transaction log converted to fully async functions.
- **Stripe billing** (`routes/billing.ts`): Checkout sessions for subscriptions and one-time top-up packs. Customer Portal for self-serve management. Webhook handler for `checkout.session.completed`, `invoice.paid` (monthly credit reset — no stacking), `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`. Raw body parsing for webhook signature verification.
- **Security** (`index.ts`): Helmet security headers, CORS restricted to `CORS_ORIGIN` env var, rate limiting (120 req/min general, 10 req/min for generations, 20 per 15min for auth). Dev routes disabled in production. Stripe webhook signature verification.
- **S3 storage** (`services/s3.service.ts`): Optional S3-compatible file storage for uploads and outputs, with presigned download URLs. Falls back to local disk when `S3_BUCKET` is not set.
- **Monitoring**: Sentry error tracking (optional, via `SENTRY_DSN`). Enhanced health check with environment and DB type info.
- **Deployment**: Dockerfile with Chromium for Remotion rendering. `.dockerignore`. Updated `.env.example` with all production variables.
- **Frontend auth** (`App.tsx`, `AuthScreen.tsx`, `api.ts`): Login/register screen with neumorphic design. JWT token management with automatic refresh and 401 retry. Configurable API base URL via `window.__FXBUDDY_API_BASE__`. Skips auth in local dev mode.

**Risk Level**
- High (major architectural change — but backward-compatible in local dev mode with no `DATABASE_URL` set)

**Rollback Plan**
- Revert all modified files to their previous versions.
- Delete new files: `auth/`, `routes/auth.ts`, `routes/billing.ts`, `services/s3.service.ts`, `db/pg-schema.sql`, `AuthScreen.tsx`, `Dockerfile`, `.dockerignore`.
- Restore `better-sqlite3` as the only DB driver.
- Remove new npm dependencies: `pg`, `bcryptjs`, `jsonwebtoken`, `stripe`, `express-rate-limit`, `helmet`, `@sentry/node`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`.

## [2026-02-18] Developer Handoff Document

**Scope**
- Shared / Documentation

**Reason**
- A new developer needs to take over and finalize the project. A comprehensive document is needed so they can understand the full architecture, codebase, billing system, and what remains to be done without any prior context.

**Description**
- Created `DEVELOPER_HANDOFF.md` in the project root.
- 10 sections covering: what FXbuddy is, high-level architecture with diagrams, full directory map, backend deep dive (auth, billing, credits, generation, motion, storage), frontend deep dive (auth flow, API service, main panel, settings, host script), billing and credits system (plans, costs, Stripe flow), environment variables table, what needs to be finished (external services, Stripe setup, frontend production build, known code loose ends, deployment checklist), local development setup, and key commands reference.
- Written for a developer with zero prior knowledge of FXbuddy.

**Risk Level**
- Low (documentation only, no code changes)

**Rollback Plan**
- Delete `DEVELOPER_HANDOFF.md`.
