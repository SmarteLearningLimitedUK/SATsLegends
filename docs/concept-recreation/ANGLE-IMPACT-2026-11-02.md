# Angle Arena impact, sound and readability — 2 November 2026

## Request and rendering path

The user reports a static enemy/structure after shots, unsuitable firing/collision audio and an unreadable cannon-side angle diagram. Their iPhone image also shows question overflow and footer overlap. Work stays in the current `codex/website-refinement-2026-10-28` checkout, preserving its unrelated changes.

Matharia uses React in the native Capacitor web view. `presentation-transform.ts` retains `src/games/AngleArenaGame.tsx` as the controller and replaces its presentation with `AngleScene.tsx`, the illustrated canvas layout and materials. The approved image is `variants/matharia/reference/approved/angle_arena-physics-aim-v2.png`, 1844×853. Its major regions are recorded in the unchanged approved manifest. The reference's proposed manual power/Fire controls are not implemented: this request supplies impact feedback for the existing automatic launch.

## Implementation

- Replaced the single composite tower with independently drawn transparent timber beams/posts, ice and stone. A hit detaches, rotates and drops these pieces with brief ice splinters; the old composite tower is removed from rendering.
- The enemy falls and turns onto the snowy platform after the existing successful collision. Presentation settles within 680ms, inside the original 900ms automatic question advance. Reduced motion shows the settled broken structure/defeated position directly. Active-time scheduling freezes the presentation during pause/backgrounding.
- Existing `cast` and `impact` events now use Angle-only cannon crack/thump and timber/ice collision/debris cues. Existing sound settings, visibility and cancellation remain in the shared audio bus. There are no new downloads or delayed asset decodes for these cues.
- Padded the question panel, kept its right edge clear of the enemy, placed the live angle diagram on an intentional contrast surface, separated feedback/actions from the answer/navigation row and removed the duplicate landscape safe-area margin. Compact Reset View uses an accessible 44px icon to leave room for the complete miss explanation. All mathematical labels and button text remain live.
- Grounded the standing enemy against the measured central snow surface (18 source pixels below the beam image's top), fading that support offset out during the fall. Reserved upper label regions and a shorter split ray keep acute-angle values clear of the white geometry without covering it.

## Source and assets changed

- `variants/matharia/src/screens/AngleScene.tsx`: readable live SVG diagram.
- `variants/matharia/src/screens/angle-scene.css`: scoped question/diagram/footer/safe-area layout.
- `variants/matharia/src/screens/angle-artwork.ts`: independent structure pieces and impact/fall/shot presentation.
- `variants/matharia/presentation-transform.ts`: Angle-only canvas/material/fall integration.
- `src/audio/angleArenaSound.ts`: new cannon and collision synthesis.
- `src/audio/gameAudio.ts`: Angle-only routing for existing sound events.
- Four new `variants/matharia/assets/png/props/angle_{beam,post,ice,stone}_v5@2x.webp` assets. They have genuine alpha, no text/scenery/UI and preserve their individual aspect ratios. Generated with built-in imagegen; prompts and alpha/hash receipts are under `qa-artifacts/angle-impact/assets`.
- This handover, `WORKLOG.md`, QA scripts/receipts/captures and the prepared local Capacitor public bundle.

The original controller, question bank, answers, scoring, lives, difficulty and navigation remain unchanged. World-space launch/segment collision rules retain the 360ms aim delay, 520 speed, 44 combined collision radius, 520/560/600 target distances, 980 maximum flight, 680ms camera return and 900ms advance. The fall/collapse is a consequence of that original hit result and cannot award a second hit.

`source-scope.json` verifies 23 existing files by SHA-256, other presentation adapters byte-for-byte, original control handlers and the approved image. This preserves the shared question/container/HUD/actor code and prior game fixes. The soundtrack/audio integration proof verifies the Angle profile guard while retaining other sound paths.

## Persistent verification checklist

| Requirement | Evidence | Status |
| --- | --- | --- |
| Reproduce original static enemy/tower and overlap | `qa-artifacts/angle-impact/baseline.json`, `before-phone-*.png` | Reproduced: no fall/structure change through hit+600ms; 12px known-angle glyph; duplicate phone inset and footer overlap |
| Independent materials and current approved reference | `assets/asset-receipt.json`, `asset-inventory-before.json`, `AUDIT.md` | Generated assets and approved reference inspected |
| TypeScript and production bundle | `build.log`, `typecheck.log`, `lint.log` | Pass; existing chunk-size warning remains |
| Running layout, hit/fall/collapse and feedback | `layout/checks.json`, `SUMMARY.json` | All 24 unique layout cases pass: 168 sampled states and 240 tested touch targets; four final phone/iPad grounding checks pass |
| Correct/wrong answers, score, lives, pause, next/retry/results | `flow/checks.json`, `SUMMARY.json` | Four first/final-tier flows and 40 answers pass; eight paused phone/iPad resize transitions pass |
| Audio waveform and cancellation | `qa-artifacts/angle-audio/signal-checks.json`, WAVs, `scope.json` | Offline Chromium signal/cancel checks pass; speaker/native audition unverified; Windows WebKit lacks Web Audio APIs |
| Local native bundle and minimum iOS | `native-copy.json`, `native-minimum.log` | All 848 final build files hash-match the prepared iOS 16.4 bundle; native execution unverified |

Both engines exercise independently calculated supplementary/ratio/difference answers, successful hits, intact misses, duplicate touch/Next protection, pause/resume, failure/Retry, original 250-point hits and 1500-point perfect victory, three stars, saved player metrics and Map selection. Chromium additionally verifies one firing/impact schedule per shot, muted shots scheduling neither and unmute restoring both. Final known 25°/55° examples have no ray/text intersection; the question bank is unchanged.

## Visual and audio evidence

![Approved reference versus actual running build at the same viewport](../../qa-artifacts/angle-impact/approved-vs-running.png)

![Actual browser shot, collision, fall and settled destruction](../../qa-artifacts/angle-impact/angle-impact-browser.gif)

Both comparison images are 1844×853; live question values differ. The running game retains automatic launch, with no proposed manual power/Fire mechanics. The 16-frame animation is clock-stepped actual Chromium rendering, not a native capture or performance measurement. Current before/after stills, final angle/grounding checks and raw receipts are under `qa-artifacts/angle-impact`; the aggregate receipt is `RESULT.json`.

Offline module sound samples: [cannon fire](../../qa-artifacts/angle-audio/cannon-fire.wav), [timber/ice impact](../../qa-artifacts/angle-audio/cannon-impact.wav). Signal and cancellation tests pass without clipping; device speaker output remains unverified.

## Assumptions and limits

Preserve the approved winter encounter, existing hero/enemy and automatic-answer launch. Breaking/falling are presentation feedback, with the original mathematical/collision controller as the only outcome source. No manual power mechanic, new question content, reward change or backend work.

Browser viewport checks are not native iOS tests. This Windows host cannot verify device audio, native safe areas/orientation transitions or native performance. No TestFlight upload, publication, push, branch switch or merge is part of this correction. No external legacy assumptions were used.

Normal Windows WebKit whole-page screenshots omit the two WebGL actors. Direct drawing-buffer probes confirm nonempty hero/enemy buffers (about 4.2k/1.3k nontransparent pixels), live contexts and GL error 0. Chromium normal captures and WebKit reduced-motion stills visibly show the actors. Normal WebKit actor compositing remains unverified by page screenshots. This runtime also lacks `AudioContext`/`AudioParam`, so live Web Audio routing cannot be tested there; Chromium supplies that check.

Artificial 125% feedback-font stress at 667×375 and 568×320 keeps the text within its outer frame but leaves only 0.54–1.36px bottom clearance. Normal text has the intended padding after the compact Reset control correction. Native accessibility text behaviour remains unverified; this enlarged-text edge case needs device review before production. Active-flight resizing was not separately captured; resize checks cover paused flight and paused collapse. Account services were isolated, so no real backend/account or purchase operation was exercised.
