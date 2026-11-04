# Lantern Camp: full-screen packing and light

Request: improve poor use of space in the supplied 589 × 1280 iPhone photo. Current repository: `D:/BrainZilla/GitHub/SATsLegends`, branch `codex/website-refinement-2026-10-28`. Existing unrelated work was preserved. The screenshot is a defect reference, not an approved new composition.

Assumptions: portrait is the primary composition; landscape is supported through a deliberate two-column layout. Preserve all six items, their labels, six grounding prompts, any-order packing, duplicate protection, brightness range/step, readiness requirement, 20% completion threshold, original 1800 ms completion delay, rewards and navigation.

Visual thesis: one substantial sapphire-and-gold lantern in a quiet twilight campsite, with clear progress and a stable six-item packing tray. The title belongs in the shared HUD. The large illustrated lantern is the focal point; the tray becomes the dimmer when packing is complete. A separate flame, gentle breeze and sparse fireflies add restrained motion. Original instructions, purpose, fact and affirmation remain available through Tips.

## Rendering and changes

The real React `CandleCalm` controller is preserved. The Matharia Vite adapter binds its state and callbacks to `variants/matharia/src/LanternCampScene.tsx`; the original website retains its existing renderer and background. `src/wellbeing/activities/CandleCalm.tsx`, `WellbeingShell.tsx`, `useWellbeingCompletion.ts` and reward integration are protected by hashes.

- Added `variants/matharia/src/LanternCampScene.tsx`: live packing tray, packed-state feedback, large independent lantern/animated flame and the original native range control. Keyboard packing moves focus to the next item, then the dimmer; touch packing does not move focus.
- Added `variants/matharia/src/lantern-camp.css`: one safe viewport for HUD/activity/progress/dock, padded surfaces, responsive portrait/landscape regions, input targets and reduced-motion/hidden-page behaviour.
- Modified `variants/matharia/src/wellbeing-scene.css`: imports the scoped Lantern Camp styles.
- Modified `variants/matharia/presentation-transform.ts`: Candle-only presentation/scenery binding, HUD title, framed progress footer and preserved Tips instructions. Other activity bindings remain.
- Added `variants/matharia/assets/png/backgrounds/bg_lantern_camp_v1@2x.webp`, `variants/matharia/assets/png/props/camp_lantern_v1@2x.webp` and `variants/matharia/reference/lantern-camp-assets.json`.

New assets were created with the built-in image-generation tool. The first lantern was rejected because its white glass was opaque. A targeted edit produced clear glass with alpha 0 at sampled central points. Assets were inspected and saved in the repository; only alpha-margin crop and aspect-preserving WebP encoding were applied. The flame and light are runtime elements behind the metalwork, with no baked duplicate flame or UI. No background patches or concealment masks were introduced. Full prompt set and tool mode: [asset-prompts.md](../../qa-artifacts/lantern-camp-2026-11-03/asset-prompts.md). Production asset paths, source paths, dimensions and hashes: [lantern-camp-assets.json](../../variants/matharia/reference/lantern-camp-assets.json).

## Layout and visual evidence

The baseline was captured before source edits. Both running-app comparison images use a 393 × 852 browser viewport with simulated 59 px top and 34 px bottom safe areas. The supplied 589 × 1280 photo documents the defect; it does not specify a new approved composition.

| Region | Original running app | Revised running app |
| --- | --- | --- |
| Shared top HUD | x16, y67, 361 × 60 | x16, y67, 361 × 64 |
| Activity region | x12, y221.2, 369 × 355 | x16, y143, 361 × 509: 92% of viewport width and 60% of height |
| Prompt | Overlaps the scattered gear | x16, y143, 361 × 88; stable across all six prompts |
| Lantern | Small outline SVG | Independent 117 × 249 illustration at x138, y241; aspect preserved |
| Six-item tray | Scattered and partly obscured | x16, y500, 361 × 152; stable 3 × 2 grid |
| Progress footer | y576.2–628.2 | y662–732; padded copy and inset Tips |
| Gap from footer to bottom dock | 111.8 px | 8 px |

[Before versus after](../../qa-artifacts/lantern-camp-2026-11-03/before-after.png) was inspected directly. Phone, compact, iPad and both landscape compositions, ready-to-dim states and enlarged-text captures were also inspected. Short landscape uses a single-line activity title; larger headers retain Calm Grove above the title. The progress bar fills its available padded region on wider layouts.

## Verification checklist

| Check | Status | Evidence |
| --- | --- | --- |
| Source/reference and original layout | Inspected | `source-before-hashes.json`, `before.png`, `before.json` |
| Independent scenery and transparent lantern | Inspected and integrated | `lantern-camp-assets.json` |
| Portrait/landscape layout | Passed in browsers | 12 Chromium/WebKit profiles; 108 measured states, initial/ready captures; six targeted wider-layout progress checks |
| All six prompts/items, slider and completion | Passed | arbitrary item order, duplicate activation, all prompts, no slider before readiness, 5% increments, no completion at 25%, completion at 20%, disabled finished slider and 100% progress |
| Keyboard and navigation | Passed | Enter advances focus to next remaining item and then slider; Choose another activity returns to Calm Grove; shared Back retains its existing world-map destination |
| Timing and cancellation | Passed | four engine/motion cases: no completion at 1700/1799 ms, one completion at 1800 ms; leaving during delay cancels it |
| Animation preferences | Passed in browsers | nine normal ambient animations; no ambient animation with reduced motion; synthetic document visibility pauses/resumes; finishing pauses motion |
| Enlarged text and other activities | Passed in browsers | both engines at compact size with 125% activity prose across all six prompts and dimmer; other three activity routes/titles still render |
| Build and TypeScript | Passed | `build.log`, `typecheck.log`; existing large-chunk warning remains |
| Source/asset preservation | Passed | eleven protected files unchanged; two existing adapter/style files changed; five new source/asset/metadata files; asset hashes and clear-glass samples pass |
| Local Capacitor preparation | Passed | all 854 build files match the copied iOS public bundle; configured minimum iOS 16.4 verified |
| Native iOS execution | Unverified | Windows host |
| TestFlight upload | Not performed | Local source task |

Profiles in each engine: compact 375 × 667, iPhone 15-size 393 × 852, large phone 430 × 932, iPad 768 × 1024, phone landscape 852 × 393 and iPad landscape 1024 × 768. Simulated safe areas keep active controls accessible; active targets remain at least 44 × 44 px. Gameplay does not scroll. The original six-item controller, 0–100/step-5 range, ≤20% threshold, 1800 ms delay, rewards and shared navigation code remain unchanged.

QA artifacts are under `qa-artifacts/lantern-camp-2026-11-03/`. Aggregate receipt: [RESULT.json](../../qa-artifacts/lantern-camp-2026-11-03/RESULT.json). The exact change against the start-of-task snapshot is in `scoped-source.diff`; hashes are in `source-scope.json`. Generated build/native public files are derived outputs, not edits to Swift gameplay.

During verification, the portrait fixture initially inherited the landscape helper's 59 px side defaults; explicit zero portrait side insets corrected that harness error. Deterministic timing checks install the clock before startup and advance transition frames when paused. A real CSS specificity defect in reduced-motion fireflies was fixed and rechecked. The existing shared Back destination was verified from source rather than changed to fit a test expectation.

No known clipping, overlap, inaccessible controls or unwanted activity scrolling remains in the tested cases. Browser safe-area/Windows WebKit checks and 125% activity prose checks are not native iOS execution or system Dynamic Type/VoiceOver testing. Native accessibility, installed-app animation performance, rotation/backgrounding and physical touch/audio behaviour require a Mac/device pass before release. No signed archive, TestFlight build, publication, deployment or merge was performed. This completes the scoped local Lantern Camp presentation work; the native/device verification remains outstanding.

No external legacy assumptions were used.
