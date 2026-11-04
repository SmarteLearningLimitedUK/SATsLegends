# Line Graph Lab and Data Detective — 2 November 2026

Request: improve use of the iPhone landscape screen and reduce/animate the guide shown in the two supplied screenshots. Assumption: “Jeep” means the hero/guide. These are local source changes; no publication, merge or TestFlight upload is part of this pass.

## Screen checklist

| Screen | Reference | Real rendering path | Assets | Implementation and verification |
| --- | --- | --- | --- | --- |
| Line Graph Lab | Attached Photo 1; existing `approved-screens.json` entry `line_graph_lab` remains unchanged | `LineGraphLabGame.tsx` → Matharia `presentation-transform.ts` → `LineScene.tsx`, `LinePlot.tsx` | Existing independent wizard art, chart frame, question frame, answer controls | Implemented. Four browser profiles pass: safe bounds, larger graph, supporting guide, measured question height, study motion, answers and plotting |
| Data Detective | Attached Photo 2; existing `approved-screens.json` entry `data_detective` remains unchanged | `DataDetectiveGame.tsx` → Matharia `presentation-transform.ts` → `DataScene.tsx`, `EvidenceChart.tsx` | Existing independent detective art, suspect portraits/rims, chart frame, evidence icons | Implemented. Four browser profiles pass: safe bounds, larger evidence plot, contained portraits/controls, investigation motion, inspection and accusation |

## Source scope

Seven production files: `variants/matharia/src/SceneActor.tsx`; `variants/matharia/src/screens/LineScene.tsx`, `line-scene.css`, `LinePlot.tsx`, `DataScene.tsx`, `data-scene.css`, `EvidenceChart.tsx`.

The source game controllers, question builders, answers, grading, score, lives, timers and progression are preserved. Existing production assets are reused independently. No background covers, new flattened screens or asset substitutes are introduced.

The two independent portrait layers now share an aspect-preserving SVG viewBox. Its circular portrait clip is legitimate portrait framing. It does not conceal background scenery. The case counter occupies the space beside the bottom HUD, clear of the chart's corner ornament.

Question height in Line Graph Lab follows the intrinsic text block through a scoped ResizeObserver, including font changes and the existing question portal. Its CSS variable is removed on unmount. Actor motion is optional and uses the existing mesh; other callers retain the original zero idle additions. No new React updates occur per animation frame. Existing hidden-page/intersection, reduced-motion and cleanup paths remain in use; each screen also passes its actual pause state.

## Evidence and handover

Evidence lives in `qa-artifacts/lab-detective-focus/`: `RESULT.json`, source snapshots/hashes, running baseline captures, repeatable game-state checks, layout measurements, real-time animation captures, build/typecheck and native-copy logs.

At 852×393 with simulated iPhone 15 landscape safe areas (59px left/right, 21px bottom), the Line Graph Lab SVG viewport grows from 317×122 to 413×148, approximately 1.58× the area. The Data Detective SVG viewport grows from 259×60 to 372×98, approximately 2.36× the area. These are viewport measurements, not a claim of pixel matching an approved illustration. Before/after comparisons use the same actual difficulty route, seeded graph/evidence values and instruction text.

Comparisons: `line_graph_lab-comparison.jpg`, `data_detective-comparison.jpg`. Motion: `line_graph_lab-guide.gif`, `data_detective-guide.gif`, produced from sequential real-time game screenshots, not generated animation. Full frames and joint metadata are retained under `motion/`.

Verification passes for 60 captured states in eight game/profile combinations. Sizes: compact iPhone 667×375, iPhone 15 852×393, iPad landscape 1024×768; Chromium normal motion and WebKit phone reduced motion. Checks cover safe bounds, text containment, no document scrolling, minimum 44px live controls and centre-hit accessibility. Line Graph Lab exercises 17 marked answers across reading, comparison, interpolation, change, coordinate and explicit plotting cases, correct/incorrect feedback and manual next. Data Detective exercises bar and pie evidence, pinning, all four suspect dossiers, close, incorrect/excluded suspects, correct accusation, lives/XP and manual next. Pause/resume and frozen actor time are checked on both games; reduced motion retains a still guide. Compact Line Graph Lab also passes enlarged question/helper/feedback text at 125%.

Build and TypeScript checks pass. The scope audit confirms 23 protected source/reference files remain byte-identical to the pre-edit snapshots, including both original controllers, the presentation adapter, shared session/progression/audio code and original mesh renderer. Only the seven listed production files changed in this pass. Existing unrelated work in `codex/website-refinement-2026-10-28` was preserved.

The final local Capacitor web bundle contains 848 build files, SHA-256 checked against `dist-matharia`; iOS minimum 16.4 remains aligned. Derived web/native bundle files, this checklist, the worklog and QA evidence accompany the seven source changes.

Remaining verification: this Windows host cannot execute an iOS simulator. Native rotation, device safe areas, background/resume, Dynamic Type and performance remain unverified on iOS. Browser viewport checks are not native iOS testing. No known clipping or text-overflow failure remains in the captured browser states. A new signed build/upload and physical iPhone/iPad checks remain necessary before these changes can be installed through TestFlight. Nothing was pushed, merged, published or uploaded during this pass.

No external legacy assumptions were used.
