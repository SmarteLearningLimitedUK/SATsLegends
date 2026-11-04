# Simplify Sprint runner bounds — 2 November 2026

The user reports that the hero goes off-screen at the rightmost gate. This is a scoped Matharia React presentation correction in the existing `codex/website-refinement-2026-10-28` checkout. No branch switch, unrelated reset, new artwork or gameplay redesign.

## Cause and correction

The controller originally measures a gate's centre and subtracts half the runner width. That destination is stored as a percentage. The landscape runner becomes wider at the iPad aspect-ratio breakpoint, but the old destination does not update. In a real wide-phone → iPad resize reproduction, its right edge reached **1050.59px in a 1024px viewport**, clipping 26.59px. Fresh iPad placement also left only about four pixels at the edge.

The Matharia `Runner` now resolves the selected gate against the current arena and runner dimensions. It keeps the full runner inside an edge gutter of at least 8px or 1.5% of arena width. Idle, dash, checkpoint, burst, crash and reduced-motion placement use the same bounds. A `ResizeObserver` reprojects the existing Web Animation keyframes when sizes change; it retains the same animation timeline, duration and paused state instead of restarting the dash.

A second phone-specific issue applied the horizontal safe-area inset twice. The content parent already owns that inset; a Sprint-only stage rule removes the duplicate margin. At the iPhone 15 browser profile with 59px side insets, the scene is corrected from x=118…852 to x=59…793, aligning the gates with the usable area. No shared shell CSS is changed.

## Changed files

- `variants/matharia/src/screens/SprintScene.tsx`: bounded, size-aware runner destination and animation endpoints.
- `variants/matharia/src/screens/sprint-scene.css`: one scoped landscape stage safe-area rule.
- This handover, `WORKLOG.md`, QA scripts/receipts/captures under `qa-artifacts/sprint-edge`, and the prepared local Capacitor public bundle.

The original `src/games/SimplifySprintGame.tsx`, presentation adapter, `SceneActor.tsx`, `App.tsx`, gameplay session and game audio remain unchanged by SHA-256. Gate selection, fractions, correct factors, scoring, difficulty, lives, rewards and saved progress stay in the original controller. The 750ms dash/resolution and existing subsequent phase delays are retained. Gate hit targets and navigation handlers are unchanged.

## Verification checklist

| Coverage | Evidence | Status |
| --- | --- | --- |
| All three gates, six landscape phone/iPad sizes, normal/reduced motion, both engines | `qa-artifacts/sprint-edge/layout/{chromium,webkit}-checks.json` | All 24 profile/motion/engine cases pass; 72 real gate runs |
| Active, paused and resolved right-gate resize | `resize/{chromium,webkit}-checks.json` | All 12 engine/motion/phase cases pass, including retained timeline and pause state |
| Real factor choices, score, pause, failure/Retry and victory/Map | `flow/{chromium,webkit}-checks.json` | All four first/final-tier normal-motion flows pass in both engines |
| Compilation | Build/typecheck/lint logs | Matharia production build, variant typecheck and root TypeScript lint pass |
| Native resources | `native-copy.json`, `native-minimum.log` | All 844 build files hash-match the local Capacitor bundle at iOS 16.4; native execution unverified |

Browser sizes: 852×393 and 932×430 with simulated notch/home-indicator insets, 667×375, 568×320, 1024×768 and 1180×820. Bounds checks use the intersection of the actual arena and the viewport's safe area, not just the arena's width. Each gate is sampled at idle, during the dash and after resolution. Normal Chromium and WebKit right-gate iPad captures are inspected and show the complete hero.

The resize regression switches from the narrower 22% runner to the 28% iPad runner. It checks active movement, a paused animation and the static resolved position, including retained 750ms timing. The original mathematical model is exercised through real game controls and an independent greatest-common-factor calculation.

## Evidence and distribution limits

Baseline: `qa-artifacts/sprint-edge/before-right-ipad-resolved.png` and `baseline.json`. Final normal browser captures are under `layout/` and `resize/`. The comparison uses real game states; questions/feedback can differ between runs.

![Same right-hand crop before and after the runner containment correction](../../qa-artifacts/sprint-edge/comparison-crop.png)

The matched 1024px-wide resize regression moves the runner's right edge from 1050.59px to 1008.625px, leaving 15.375px inside the viewport. Final aggregation and source-preservation checks: `qa-artifacts/sprint-edge/RESULT.json`. The independent QA summary is `SUMMARY.json`; all 432 sampled gate states pass. Initial QA retries corrected frozen-clock navigation/phase waits and an intro-dismissal race; final aggregate receipts contain only passing cases. No production changes were needed for those harness waits.

Native iOS/device safe areas, orientation transitions and performance remain unverified on this Windows host. These browser checks are not native testing. No signed macOS build, TestFlight upload, push, merge or deployment was performed. The installed TestFlight version is unchanged. The production build retains its existing large-chunk warning.

Assumptions: this is a presentation containment defect; retain approved landscape play, the existing hero/assets and all gate rules/timing. No external legacy assumptions were used.
