# Paper 1: arithmetic workspace

Request: improve screen-space usage in the supplied iPhone photo. Repository: `D:/BrainZilla/GitHub/SATsLegends`; branch `codex/website-refinement-2026-10-28`. Existing unrelated work is preserved.

Assumptions and references: `compositions.ts` specifies portrait for Paper 1; retain that orientation and its existing landscape rotation gate. The photo is a defect reference. Use current repository content and existing independent production artwork. Keep the shared HUD geometry, original questions, marking, 30-minute duration, 36 missions / 40 marks, answer pad, saved working, Later, mission navigation, review, history, rewards and purchases.

Visual thesis: a focused sapphire-and-gold arithmetic desk with the calculation and saved working as its primary content. Content order: shared HUD, prompt, calculation/working slate, response, mission tools, shared dock. Interaction: retain existing button feedback, saved-mission pulse, dialog transitions and keyboard focus; add no delays to assessment input.

Real rendering path: `/game/8/1` → original React assessment controller → Matharia presentation adapter → `PaperScene`. Native iOS loads this web bundle; no Swift rendering change is required.

## Source changes

Only these two production files change:

- `variants/matharia/src/screens/PaperScene.tsx`: Paper 1 uses the full calculation width and a saved-working preview that opens the existing `GlobalWorkpadDialog`. The decorative full-body guide is omitted on Paper 1; the shared HUD portrait remains. The original controller supplies `work` and `onWork`; no new persistence or marking logic. Paper 2/3 keep their original guide, model and working button.
- `variants/matharia/src/screens/paper-scene.css`: Paper 1 uses a grid bounded by shared HUD variables, wider prompt/slate, padded response controls and nearby mission tools. Slate content follows the existing 1400 × 1035 asset aperture, including its lower rail and feet, using the same uniform corner scale. Answer captions are centred clear of ornate corners. Working previews show whole lines with an ellipsis according to available height; the full original text remains available in the dialog. Only the preview is clipped, not gameplay or unsuitable artwork. Blank-answer feedback occupies its own form row before the anchored save actions, and review reclaims the unused question-strip region.

No assets were created or edited. Nine existing production paper assets match their recorded hashes. No background masks, patches or baked controls were introduced. Website rendering, assessment controller, banks, shared HUD, deadline hook, answer/workpad components, adapter and other paper styles remain unchanged; twenty protected files are checked against the start-of-task snapshot.

## Before and after

The 589 × 1280 supplied photo was inspected. Running-app before/after captures use the same representative seed 4, first mission, 393 × 852 browser viewport and simulated top/bottom safe areas of 59/34 px. Current repository HUD styling is retained.

Baseline: prompt x121.5/y215.3/255 × 44; slate x121.5/y256.3/255 × 200.4; response x31.5/y459.8/330 × 170; mission tools end y681.8; dock starts y752. The gap from shared header to prompt is 71.4 px, and from mission tools to dock is 70.2 px. These are measured from the actual app before edits, not inferred from the photograph.

The revised prompt and slate span 361 px at that viewport, about 42% wider. The prompt is 12 px below the shared header; mission tools stop 12 px above the dock. The widened calculation and live working preview replace the empty slab. Details and proportional bounds are in `before.json`, `after.json` and the device geometry receipts under `qa-artifacts/paper1-space-2026-11-03/`. [Actual before/after comparison](../../qa-artifacts/paper1-space-2026-11-03/before-after.png).

## Verification checklist

| Check | Status / evidence |
| --- | --- |
| Current source and supplied photo | Inspected; `source-before-hashes.json`, `before.png` |
| Original question/controller preservation | Twenty protected files; current source bank bundled into the isolated QA fixture |
| Layout and interaction bounds | Passed: eight Chromium/WebKit profiles, 90 measured states, 44 px minimum targets and no gameplay scrolling |
| Complete paper marking and history | Passed: all 36 source questions in each engine, 72 saved answers, original 40/40 marking, worked solutions, history once, finish cancellation/confirmation and original return callback |
| Working preview and full board | Same per-mission value and callback; saved, revisited and restored on a fresh document |
| Timer | Passed: 4500 ms mocked pause-freeze; four real-time normal/reduced-motion cases verify running, frozen pause and resumed countdown |
| Text scaling and rotation | Passed: compact 125% prose in both engines; portrait gate returns to the same mission |
| Validation feedback | Passed at all eight profiles: blank answers remain on the same mission, feedback stays within the response frame and save actions remain reachable |
| Review | Passed in both engines: 36 items, scrollable review inside header/dock bounds, original Save run and return; no unused question-strip gap |
| Other papers | Passed smoke checks: Paper 2/3 retain their guide, original working button and functional dialog |
| Build / TypeScript | Passed; existing large-chunk warning remains |
| Local Capacitor resources | Passed: 854 build files match the local iOS public copy; minimum iOS 16.4 verified |
| Native iOS / TestFlight | Not executed or uploaded on this Windows host |

Device profiles in each engine: compact 375 × 667 (20/20 px vertical safe areas), phone 393 × 852 and large phone 430 × 932 (59/34 px), and iPad 768 × 1024 (24/20 px). The final initial, saved-working, enlarged-text, blank-answer and review captures were inspected directly. No known overlap, frame intrusion, clipped controls or unintended gameplay scrolling remains in these cases.

Receipts and repeatable scripts: `qa-artifacts/paper1-space-2026-11-03/`. [Aggregate result](../../qa-artifacts/paper1-space-2026-11-03/RESULT.json), `source-scope.json`, `asset-hashes.json`, `scoped-source.diff`, `layout-checks.json`, `flow/checks.json`, `realtime-checks.json`, `review-checks.json` and `native-copy.json`. The doc, root WORKLOG and this QA directory are supporting changes; copied build/native-public files are generated outputs.

Verification corrections: HTML legends were measured against the response frame rather than the fieldset's content boundary. The first post-Resume label under Chromium's mocked clock was inconsistent; timer-resume evidence therefore uses separate real-time cases in both engines, with mocked-clock pause freeze retained. Normal-motion intro dismissal in the clock check invokes the existing public button handler because the animated intro is not stable enough for Playwright's pointer-stability wait. Gameplay interactions and answer-pad controls use real browser input.

Browser safe-area and Windows WebKit checks are not native iOS testing. System Dynamic Type/VoiceOver, installed rendering/performance, physical touch/audio, native orientation/backgrounding and App Store purchase/sign-in flows require device verification. The browser fixture waits for its isolated subscription state before entering paid gameplay; no live service requests or account changes are made. Existing direct-route access-loading behaviour is outside this presentation change. No signed archive, publication, deployment, merge or TestFlight upload was performed.

No external legacy assumptions were used.
