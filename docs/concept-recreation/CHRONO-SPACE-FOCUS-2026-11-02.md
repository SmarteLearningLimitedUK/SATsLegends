# Chrono Dash — clock priority

Request: replace the busy background and use the available space more effectively. Reference: supplied iPhone photo and current repository. Portrait orientation, original clock object, live mathematical SVG, guide HUD portrait and gameplay rules are retained. The user explicitly requests a less busy setting, so the previous concept background is superseded for this pass.

Visual thesis: one large, centred parchment-and-gold clock in a quiet sapphire clocktower chamber. Content plan: shared HUD, padded live question, flexible clock workspace, one compact adjustment/action console, shared footer. Interaction thesis: retain pausable 200ms hand interpolation, stable press targets and original correct/incorrect feedback with reduced-motion support.

Files inspected: `src/games/ChronoDashGame.tsx`, `src/games/chronoDashQuestions.ts`, `variants/matharia/src/screens/ChronoScene.tsx`, `chrono-scene.css`, `ChronoHand.tsx`, `variants/matharia/src/compositions.ts`, `assets.ts`, `measured-game-shell.css`, `measured-hud.css`, `ScalableQuestionPanel.tsx`, `presentation-transform.ts`, `variants/matharia/scripts/verify-chrono.mjs`, `verify-chrono-hands.mjs` and `variants/matharia/reference/chrono-assets.json`.

| Screen | Rendering path | Assets | Status | Evidence / remaining checks |
| --- | --- | --- | --- | --- |
| Chrono Dash, all five tiers and four digit/Roman variants | Original controller bound to Matharia ChronoScene | Original clock and shared HUD; new independent quiet chamber background | Browser verified; native smoke pending | `qa-artifacts/chrono-space-focus/`; native iOS execution unavailable on Windows |

## Implementation and visual evidence

The scene uses an intrinsic grid: shared HUD clearance, a question row that grows with its contents, a centred flexible clock workspace, compact controls, and shared footer clearance. The presenter no longer measures or writes question heights in JavaScript. Its question uses the existing independent ArtworkFrame and jewel with live text, inside its own grid row; the unused shared question dock remains empty. This removes the delayed frame resize when questions or text settings change.

The body character is represented by the existing HUD portrait. The clock owns the main screen area. The adjustment headings have explicit padding, buttons have stable targets of at least 44px, and Restore time remains the primary action. Reset keeps its original accessible name and callback. Feedback replaces the instruction inside a reserved slot, retaining the question and clock without a jump. The extra streak announcement is visually hidden to keep compact HUD hearts/time contained; its accessible announcement remains.

At the same 393×852 simulated iPhone viewport and identical 08:00 question, the live SVG diameter increases from 227.69px to 350.36px, 2.368 times its former area. The original baseline question bounds were x52.13/y166.77, 288.75×82px, with the clock shifted right to share space with a body character. The replacement uses a 90%-width question/control plane and a centred square instrument, capped at 640px on large tablets. Exact region bounds and proportional measurements are retained in `before.json`, `after.json` and the per-state checks.

The supplied phone photo is the rejection reference; the existing approved `time_keeper_cove.png` and original independent clock were inspected. The older busy background is superseded by the user's latest request; its approved image and source remain intact. Before/after captures show the running application at the same viewport, not a mockup or a flattened interactive screenshot.

## Asset pipeline

New production background: `variants/matharia/assets/png/backgrounds/bg_chrono_v4@2x.webp` (853×1844, 176,416 bytes). A quiet sapphire stone chamber with two edge columns and a low terrace replaces the cascading castles, flowers, waterfalls and patterned floor. No clock, character, text, controls or duplicate panels are baked into it. It was generated with the built-in image_gen tool from the old background as a style reference, inspected, and converted to WebP without cropping, stretching, masks, blur patches or painted covers. The previous background is 726,314 bytes; the new file is approximately 75.7% smaller, with the same dimensions. This is an asset-size comparison, not a native performance benchmark.

Prompt: `qa-artifacts/chrono-space-focus/background-prompt.txt`. Provenance, dimensions and SHA-256: `variants/matharia/reference/chrono-background-v4.json`. Original transparent `props/chrono_clock_v4@2x.webp` and its calibrated live SVG centre/ticks/hands remain unchanged. Roman numeral glyphs receive a presentation-only size increase for readability.

## Changed files

- `variants/matharia/src/screens/ChronoScene.tsx` — pure clock-centred presenter, intrinsic question row, grouped controls and persistent live feedback region.
- `variants/matharia/src/screens/chrono-scene.css` — scoped safe-area grid, clock sizing, padding, stable pressed/disabled/focus states and compact HUD containment.
- `variants/matharia/src/compositions.ts` — only Chrono Dash's background mapping changes to v4.
- `variants/matharia/assets/png/backgrounds/bg_chrono_v4@2x.webp` — independent scenery.
- `variants/matharia/reference/chrono-background-v4.json` — asset record.
- `variants/matharia/scripts/verify-chrono.mjs` and `verify-chrono-hands.mjs` — configurable preview/output and authenticated mission-board route discovery; existing gameplay assertions retained.
- This checklist and `WORKLOG.md` — handover and results.

QA helpers, task-start snapshots, receipts and comparisons are in `qa-artifacts/chrono-space-focus/`. Sixteen protected files match their task-start hashes, including the original controller/content, hand interpolator, presentation binding, shared HUD/layout, original assets/reference and earlier Thought Release work. Reversing the one background mapping reproduces the original compositions file exactly. Original question banks, four digit/Roman variants, five tiers, 5/1-minute adjustments, 90-second controller timer, score/lives/rewards and 260/2000ms feedback remain unchanged. The 200ms hand interpolation and pause/reduced-motion behaviour remain connected to the original game state. No dependency, backend, purchase or account change was added.

## Functional and device coverage

Six final profiles pass, covering all five tiers, four face/question combinations per profile, 70 measured states and 24 correctly solved submissions. Assertions cover text containment, padded captions, visible/hittable 44px controls, safe bounds, centred aspect-preserving clock, 60 ticks/12 labels, readable projected numerals, no scrolling, wrapping/stepping, actual hand angles, score/lives, double activation, stable feedback, pause, Reset, full failure/Retry, timed victory and Map navigation. No page errors occurred in the final focused sweep.

| Profile | Browser / viewport | Tier | Text / motion |
| --- | --- | --- | --- |
| iPhone 15 dimensions | Chromium 393×852 | 1 | Normal text; reduced motion in functional sweep |
| Compact phone | Chromium 375×667 | 5 | Also 125% question, instruction and heading text |
| iPad | Chromium 768×1024 | 3 | Normal text |
| WebKit phone | WebKit 393×852 | 4 | Normal text |
| Large phone | Chromium 430×932 | 2 | Normal text |
| Large iPad | Chromium 1024×1366 | 5 | Normal text |

The existing Chromium/WebKit phone regressions pass, including another eight correctly solved submissions, exact scoring/life rules, 260/2000ms active feedback, pause, local Reset, full Retry, timed victory and Map. Their assertions are unchanged after reversing only the entry/config edits. All four real-time hand-motion checks pass: both engines with normal/reduced motion, pausing within the original 200ms turn, resume and rapid adjustments without lost updates. Functional sweeps use reduced motion and controlled clocks; these separate animation checks use real time. Total independently solved correct submissions: 32.

Build and TypeScript checks pass. React review confirms a focused presenter, one existing unconditional hint hook, no duplicated game state, stable keys, native named buttons and a persistent polite feedback region. No timer, observer, animation frame subscription or network request was added to the presenter.

## Known existing behaviour and verification limits

Local Reset timekeeper resets the controller clock/score but retains the shared level deadline/lives. An initial QA run therefore reached shared failure with three seconds still on the controller clock. This behaviour exists in the unchanged original controller/session wiring. Full Retry restarts both; final timed-victory checks use a fresh Retry after checking local Reset. Reproduction and source explanation are in `qa-artifacts/chrono-space-focus/known-reset-behaviour.md`. Synchronizing those resets remains gameplay work; no fix is claimed in this presentation pass.

All 852 built files match the prepared Capacitor public copy by SHA-256, and the minimum iOS 16.4 check passes. These browser viewport and simulated-safe-area checks are not native iOS tests. Native device/simulator execution, Dynamic Type/VoiceOver, supported orientation behaviour, audio/haptics and sustained performance remain unverified on Windows. Isolated account fixtures were used; live account rewards/purchases were not exercised. Native smoke testing and a signed build/upload remain before installation through TestFlight. No branch switch, staging, commit, push, merge, signing or publication occurred; unrelated checkout work was preserved.

## Review artifacts

- `RESULT.json` — final machine-readable checks, protected hashes, asset/native-copy proof and limitations.
- `before-after.jpg` — same-question, same-viewport comparison.
- `device-coverage.jpg` — compact Roman-question and iPad compositions.
- `feedback.jpg` — original wrong/correct feedback with stable clock bounds.
- `after/checks.json` — six focused profiles and measured state geometry.
- `repository/checks.json`, `repository/hand-animation-checks.json` — existing gameplay and real-time animation receipts.
- `build.log`, `typecheck.log`, `native-minimum.log`, `native-copy.json` — preparation checks.
- `diagnostics/` — rejected iteration captures/logs; final passing captures are in `after/`.

The before/after, compact/iPad and feedback comparison images were visually inspected for crop, clock scale, alignment, readable numerals, frame/text containment, control padding and clear separation. No remaining layout defect was found in the tested profiles. The reset discrepancy and native verification limits above remain outstanding; no production-readiness claim is made.

No external legacy assumptions were used.
