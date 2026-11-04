# Formula Forge — question priority and compact answers

Request: improve screen usage, enlarge the question and reduce oversized answer cards in the supplied iPhone image. Assumptions: keep portrait, current forge scenery, guide identities, educational content, diagrams/givens, hints, original scoring/lives/timers and destinations. The supplied image is the layout defect; the existing approved concept is `variants/matharia/reference/approved/formula_forge.png` (866×1816).

Visual thesis: the problem and live geometric model lead the warm forge scene, with the blue answer keys forming a small lower dock. Content order: shared HUD, larger padded question, original diagram/equation/measurements, secondary guide, hint and choices, shared navigation. Existing press/selected/correct/incorrect and character feedback remain connected to the controller; no mechanic or response delay is added.

## Screen checklist

| Reference | Actual rendering path | Assets | Status | Evidence |
| --- | --- | --- | --- | --- |
| Attached Photo 1 and approved Formula Forge concept | Original `FormulaForgeGame.tsx` through the existing presentation binding to `FormulaScene.tsx`; original `FormulaShapePanel` JSX | Existing forge, guide sprites, independent frames/buttons; existing gold/stone plinth reused beneath the guide | Implemented and browser verified; native execution outstanding | Comparisons and aggregate receipt below |

## Changed source

- [FormulaScene.tsx](D:/BrainZilla/GitHub/SATsLegends/variants/matharia/src/screens/FormulaScene.tsx): content measurement, workspace grouping, live diagram camera, guide plinth and stable hint/feedback slot.
- [formula-scene.css](D:/BrainZilla/GitHub/SATsLegends/variants/matharia/src/screens/formula-scene.css): larger type and diagram, compact keys, shared-HUD anchor, compact status and diagram-label sizing.
- [verify-formula.mjs](D:/BrainZilla/GitHub/SATsLegends/variants/matharia/scripts/verify-formula.mjs): configurable preview/output paths, authenticated mission-board entry and visible-caption measurement. The independent marking oracle and original gameplay assertions remain.

Supporting files: this checklist, the Formula Forge entry in `WORKLOG.md`, and diagnostic scripts/evidence in `qa-artifacts/formula-space-focus/`. The ignored Capacitor public directory was regenerated from the final local build. No new production artwork or dependency is needed.

The actual question content is measured after the shared portal mounts and when wrapping/font dimensions change. Its containing frame grows instead of shrinking the type. The workspace follows that measured height and gives the remaining space to the diagram. The guide's square actor canvas preserves proportions; its existing sole baseline meets the separate plinth. Compact phones retain the header portrait and use the guide column for the maths; full hints remain available in the existing Tips action.

The original SVG geometry, label content, material and givens are passed through unchanged. Its camera/viewBox fits the real source-space bounds with a four-unit stroke margin, removing unused diagram margins without stretching or cutting off labels. Compact screens enlarge the SVG label typography; the smallest projected label font in the measured states is 17.8px. Four short choices use one 44px-high row; long values can use two columns. No flattened screen, background cover or defect-concealing mask is used.

The question starts eight pixels below the shared HUD footprint, and the workspace follows the measured question with an eight-pixel gap. Compact hearts and timer retain the shared two-row layout within its gold rails. The default hint reserves the feedback slot's height; compact screens swap the Choose caption for feedback in the same slot. Measured dock height changes by 0px on correct submissions, preventing the shape from jumping.

## Evidence and limits

At the 393×852 iPhone viewport, the tier-1 comparison uses the same tier and viewport with different generated questions; the tier-5 comparison shows the identical generated question. Question generation is unchanged. The rectangle's source geometry is fixed, so its projected ink bounds remain comparable across numeric values.

| Measurement | Before | After |
| --- | --- | --- |
| Main question font | 14px | 19px, 36% larger |
| Question panel height | 100px | 140px minimum; grows with wrapping |
| Individual answer key | 132.8×56.5px | 75.9×44px, 55.4% less area |
| Tier-1 diagram ink area | 1× | 2.76× |
| Tier-5 diagram ink area | 1× | 4.27× |

The reference comparison documents an intentional change from the concept's proportions in response to the latest request; it is not a claim of pixel matching. Existing forge art and educational content are retained.

- [Before/after at the same tier and viewport](D:/BrainZilla/GitHub/SATsLegends/qa-artifacts/formula-space-focus/before-after.jpg)
- [Higher-tier before/after](D:/BrainZilla/GitHub/SATsLegends/qa-artifacts/formula-space-focus/mixed-before-after.jpg)
- [Approved reference versus running layout](D:/BrainZilla/GitHub/SATsLegends/qa-artifacts/formula-space-focus/reference-comparison.jpg)
- [Compact phone and iPad coverage](D:/BrainZilla/GitHub/SATsLegends/qa-artifacts/formula-space-focus/device-coverage.jpg)
- [Aggregate receipt, measured bounds and protected hashes](D:/BrainZilla/GitHub/SATsLegends/qa-artifacts/formula-space-focus/RESULT.json)

## Functional and device checks

| Browser viewport | Engine | Tier / check |
| --- | --- | --- |
| 393×852 | Chromium | Tier 1, normal motion |
| 375×667 | Chromium | Tier 5; 125% question/hint typography on every question |
| 768×1024 | Chromium | Tier 3 |
| 393×852 | WebKit | Tier 4 |
| 430×932 | Chromium | Tier 2 |
| 1024×1366 | Chromium | Tier 5, normal motion |

All six final profiles pass: 108 measured states and 44 independently solved correct submissions across all five tiers. Checks include no gameplay scrolling, safe-area bounds, text containment, centred hittable controls, 44px targets, diagram/label bounds, original score and lives, wrong-answer explanations, pause during the original 520ms active feedback delay, blocked duplicate activation, victory and actual Map navigation. Source-backed diagrams include rectangle, triangle, parallelogram and cuboid, with area, perimeter, volume and missing-dimension questions.

Two existing highest-tier regressions pass in Chromium and WebKit at 390×844, adding failure/Retry and 16 independently solved submissions. Three saved-character smoke checks pass for Vex, Bran and Mochi; the Vex check includes a 3× iPhone viewport, live reduced-motion preference change and a correct answer. Account calls use an isolated local fixture; no live account or purchase is exercised.

`npm --prefix variants/matharia run build` and `typecheck` pass. The existing large-bundle advisory remains. All 851 build files have identical SHA-256 hashes in the prepared Capacitor public copy; minimum iOS 16.4 is verified. Sixteen task-start protected files match their hashes, including the original controller/CSS, presentation binding, renderer, art mapping, shared HUD/layout, session/progression/audio, approved art and earlier Mine/Factor presentation work.

The screenshots were inspected and the largest discrepancies corrected: crowded compact status rows, insufficient header/question separation, feedback-driven diagram resizing and tiny compact SVG labels. Earlier rejected compact/initialisation captures are retained in `qa-artifacts/formula-space-focus/diagnostics/`; final passing evidence is under `after/` and the comparison files above. The fixture's initial authentication wait was increased from five to fifteen seconds after one cold-start timeout; that changes only the diagnostic harness.

Native execution is unavailable on this Windows host. Browser viewports, simulated safe areas and synthetic text-size checks are not native iOS testing. Actual native safe areas, accessibility settings, audio/haptics, sustained performance and device orientation behaviour still require a signed device/simulator run. No browser-layout failure remains in the tested states. No push, merge, publication, signed archive or TestFlight upload is included.

Before production: run this prepared build on native iPhone and iPad, review its actual accessibility and performance behaviour, then create a signed archive and upload through the existing release process when requested. This handover covers Formula Forge only; it makes no claim that every other game's final pass is complete.

No external legacy assumptions were used.
