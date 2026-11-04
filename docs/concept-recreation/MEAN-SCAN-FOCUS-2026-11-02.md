# Mean Machine Scan and portrait layout — 2 November 2026

## Request and assumptions

The supplied iPhone 15 screenshot requests a distinct flashing Scan control, better use of portrait space, no text overlap and explicit Scan instructions in the question. Use the current repository and supplied image. Retain the approved sapphire/gold machine, independent hero, six live reading positions, original math content, original scan/rescan availability and timings, scoring, lives, saves and navigation. Current scored modes are mean and missing reading; median/mode builders exist but are not introduced into scoring.

The approved portrait image is `variants/matharia/reference/approved/mean_machine.png`; the independent blank engine is `variants/matharia/assets/png/props/mean_engine_v4@2x.webp` (1176×1293). The original layout places question at 13.5%, engine at 25%–63%, answers ending at 86%, and HUD at 91.5%–98% of the safe height. It leaves two large gaps around answers and under-budgets their minimum two-row height. These are replaced with explicit flow regions around the existing shared HUD.

## Changed production files

- `variants/matharia/src/screens/MeanScene.tsx`: local question with the original title and explicit phase instruction; original helper reserves its own text height to avoid phase jumps. Three flow regions hold question, illustration and answers. Scan has an icon and ready state that stops for pause/hidden pages. Feedback uses the existing answer panel after marking, with disabled choices hidden during that state; selected value and exact original feedback remain visible. Display-only decimal normalization removes binary noise within 1e-10 of a tenth; raw numeric options, Scan disabled guard, answer gating and callbacks are retained.
- `variants/matharia/src/screens/mean-scene.css`: aspect-preserving larger engine, smaller supporting hero on the same ground line, padded question/answer/feedback regions, 8px spacing above the bottom HUD and a glossy blue Scan face inside the existing blank bezel. A 1.5s decorative ring pulses at readiness without moving the hitbox; reduced motion uses a steady ring. Phone, compact and iPad scenes retain the approved 2×2 answers. The flow budget accommodates their actual content instead of forcing a different compact arrangement.
- This handover, `WORKLOG.md`, QA evidence in `qa-artifacts/mean-scan-focus` and the prepared local Capacitor public bundle.

No artwork is repainted or covered to conceal unwanted baked UI. The old empty question dock is unused; the new live question reuses the same independent frame. No new assets are required.

## Persistent checklist

| Check | Evidence | Status |
| --- | --- | --- |
| Reproduce Scan ambiguity and question overlap | Eight baseline actual-game states and `baseline.json` | Reproduced |
| Distinct Scan with pulse/steady reduced-motion state | Ten actual pulse frames; opacity 0.253–0.997; stationary hitbox; reduced ring steady | Pass in browsers |
| Better machine/answer budget with no text overlap | Phone/compact/iPad bounds, visual captures and 125% prose stress | Pass in browsers |
| Explicit Press Scan, original questions and helpers | Idle/scanning/answering captures | Pass |
| Scan/answers/rescan/retry/pause and original scoring | Fourteen marked answers; original 185/405 XP; original 900/1150/1350ms timing | Pass in browsers |
| Build/typecheck and protected source | Final logs and `source-scope.json`; 29 protected files, original guard/callbacks unchanged | Pass |
| Native public copy and iOS 16.4 minimum | Final sync/minimum receipts; all 848 build files match by SHA256 | Pass locally |

## Measured layout correction

At the same 393×852 browser viewport and simulated 59px top / 34px bottom safe areas, the engine grows from 262.31×288.42 to 296.09×325.55 CSS px (about 13% on each axis, with its original aspect intact). The engine-to-answer gap changes from 41.77px to 8px, and the answer-to-HUD gap from 41.08px to 8px. Feedback no longer replaces the instruction in the question or changes the machine's available height. The actual compact 375×667 layout retains 2×2 choices and passes 125% question/instruction/feedback prose stress; this is not a claim about native Dynamic Type or scaled answer controls.

The original 900ms scan, 1,150ms wrong-answer recovery and 1,350ms correct advancement remain in the unchanged controller. Scan stays available for the original answering/resolved rescans; only the readiness pulse is idle-only. Exact numeric options still reach the original marking callback. A tier-4 example retains raw `7.199999999999999` while displaying `7.2`.

## Evidence and handover

Five focused cases cover normal phone 393×852, compact 375×667, iPad 768×1024, tier-4 fifths and reduced-motion Windows WebKit. Their 41 measured states plus three final compact smoke states total 44; 14 real marked answers and 220 measured button rectangles pass. The smallest measured Mean control is 51.83×45.28 CSS px. Idle, scanning, answering, both feedback types, missing values, rescan, repeated taps, pause/resume, decimal labels, question/feedback containment and no scrolling are checked. The compact grid is verified from computed style as 2×2.

`qa-artifacts/mean-scan-focus/comparison.png` shows actual before/after at the same phone viewport. `pulse/scan-ready-pulse.gif` contains ten cropped actual browser frames with no animation-style substitutions. Pause removes readiness and pauses active reel/assembly motion; reduced motion reports no animation for reels/assembly and a steady Scan highlight. A labelled synthetic `document.hidden`/visibility event verifies the presentation predicate. Headless minimization did not generate a native hidden state, so native backgrounding remains unverified.

Phone before/after, compact normal and missing-feedback, reduced-motion idle and low/high pulse frames were inspected. Detailed receipts are `after/checks.json`, `after/metrics.json` and `pulse/checks.json`; the aggregate is `RESULT.json`. The source receipt verifies 29 protected files unchanged, including the controller/question builders, presentation adapter, shared shell/HUD/session/audio and approved assets. No image-generation or asset replacement was needed.

Before production, run the prepared bundle on native iPhone/iPad, verify accessibility/backgrounding/performance and create a signed TestFlight build when requested. A full ten-round victory/failure run was not repeated in this focused correction.

## Limits

Browser viewport/safe-area checks are not native iOS tests. Native rendering, accessibility, orientation and performance remain unverified on this Windows host. No new TestFlight upload, publication, push or merge is part of this correction. Real account/purchase services and a broad repeat of unaffected systems are outside this pass.

No external legacy assumptions were used.
