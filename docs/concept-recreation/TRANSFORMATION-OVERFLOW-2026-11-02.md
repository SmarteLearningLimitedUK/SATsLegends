# Transformation Station right-edge containment — 2 November 2026

## Request, assumptions and source

The supplied iPhone 15 landscape image shows Transformation Station's right answer panel and Cursor toggle clipped at the screen edge. This is a scoped layout correction using the current repository and supplied screenshot. Keep the existing sapphire/gold composition, landscape orientation, independent assets, source grid, questions, marking, input handlers, timers, scores, saves and destinations.

The real route is `rotation_relay`; `variants/matharia/presentation-transform.ts` supplies the original `src/games/RotationStationGame.tsx` SVG and controls to `variants/matharia/src/screens/TransformationScene.tsx`. The shared gameplay content already owns the safe-area inset; the measured landscape stage applies it a second time.

## Changed files

- `variants/matharia/src/screens/transformation-scene.css`: scoped `margin-inline:0` on this game's landscape stage; content-sized answer panels retain their original percentage minimum heights. Description mode starts at the existing feedback-region top of 28%, so its longer answer list fits above the HUD. Live controls and handlers remain unchanged. The existing closable description hint can overlay the upper panel while its answer choices remain in their own frame.
- This handover, `docs/concept-recreation/WORKLOG.md`, QA scripts/receipts/captures in `qa-artifacts/transformation-overflow` and the prepared local Capacitor public copy.

## Persistent checklist

| Check | Evidence | Status |
| --- | --- | --- |
| Reproduce safe-area right overflow | Four baseline states; panel ends at 826.30 while safe right is 793 | Reproduced |
| Keep right answer controls and Cursor accessible | All answer buttons inside their panels and safe bounds in 17 measured states | Pass in browsers |
| Hint, cursor, placement and answer feedback retain function | Three focused device cases and six real marking steps | Pass in browsers |
| Scope, build and variant typecheck | Scoped inset/panel sizing only; 25 protected files unchanged; final build/typecheck logs | Pass |
| Prepare local iOS copy at minimum 16.4 | Final sync/minimum/hash receipts; all 848 distribution files match native public copy | Pass locally |

## Final evidence

At the simulated iPhone landscape viewport (852×393, 59px left/right and 21px bottom safe areas), the stage moves from x118..852 to x59..793. The answer panel's right edge moves from 826.30 to 767.30: 33.30px outside the safe edge becomes 25.70px inside it. Cursor ends at 764.25, and popup buttons end by 770.52. This fixes the source of the shift instead of clipping or concealing controls.

The first corrected capture exposed a separate vertical defect in the same right panel: the last description choice sat below its frame. Content-driven height and the existing 28% upper region now contain every choice above the HUD. Description hints retain their visible, closable overlay; the original source handlers and educational text remain intact. The intermediate horizontal-only captures are retained separately in `qa-artifacts/transformation-overflow/intermediate-safe-area-only`.

Final Chromium checks cover 852×393 phone, 667×375 compact landscape and 1024×768 iPad landscape. The 17 measured states cover idle, cursor popup, hints, correct/incorrect feedback and description choices. Six real marking steps exercise correct translation/reflection and incorrect placement/description, followed by manual continuation. Each answer button's four bounds are checked against its frame and safe playfield; text bounds and exposed control hit centres are checked too. Existing press scaling is measured after release rather than mistaken for at-rest target size.

Actual same-viewport before/after evidence is `qa-artifacts/transformation-overflow/comparison.png`; detailed cases are in `after/checks.json` and press measurements in `after/press-state-checks.json`. Final idle, cursor, hint, description and comparison images were inspected. `source-scope.json` verifies only Transformation's CSS inset/panel sizing changes; 25 protected renderer/controller/question/shared/reference files are unchanged. `native-copy.json` verifies all 848 distribution files match the prepared local Capacitor copy at iOS 16.4. The aggregate receipt is `RESULT.json`.

## Limits

Browser safe-area checks are not native iOS testing. Native device rendering, accessibility, orientation changes and performance remain unverified on this Windows host. A full timed victory/failure/retry run and real account/purchase operations were not repeated. This pass does not upload a new TestFlight build. Before production, run the prepared bundle on native iPhone/iPad and submit a signed build when requested.

No external legacy assumptions were used.
