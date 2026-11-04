# Thought Release — balloon first

Request: simplify the supplied iPhone screen and make filling/releasing the balloon the visual objective. The supplied photo is 589×1280. No separate approved Thought Release concept is present in the current manifest; the attached image and current repository are the references.

Assumptions: retain portrait orientation, existing sky scenery, original eight feeling words, three balanced thoughts, maximum two feelings, release gate, rewards and 1200ms completion/cancellation behaviour. No additional therapeutic claims, content or backend systems were introduced.

The balloon is now the central object. One padded decision area shows feelings, then balanced thoughts, then the selected thought and one Release balloon action. Back within the activity edits previous choices. The shared HUD names Thought Release, original instructions remain in Tips, and duplicate status/progress remain accessible without competing visually. Existing footer controls remain connected.

## Screen checklist

| Screen/state | Reference and rendering path | Implementation | Visual and interaction evidence | Remaining verification |
| --- | --- | --- | --- | --- |
| Opening / feelings | User photo and original `src/wellbeing/activities/ThoughtSort.tsx`, bound to `variants/matharia/src/ThoughtRelease.tsx` | Large independent balloon; eight original choices, two-word cap, gated Next | `before-after.jpg`; six profiles, including deselection and attempted third feeling | Native device and Dynamic Type |
| Balanced thought | Same original controller and new presenter | Three original choices; one padded decision area; editable feelings | `stages.jpg`; all choices and focus checks; compact and enlarged-text containment | Native VoiceOver |
| Filled / release | Original release callback and `useWellbeingCompletion.ts` | Balloon inflation/air respond to actual preparation; selected thought and one release action | Six singular completion modals at 1205–1245ms after release; double activation blocked; normal/reduced motion | Native animation and sustained performance |
| Exit / return | Original navigation and completion modal | Footer Back retains original world-map destination; completion action returns to activity hub | Leave during release produces no late modal; reentry resets selections; Tips Escape/focus checks | Live account reward persistence |

All evidence paths in this document are relative to `qa-artifacts/thought-balloon-focus/` unless a full repository path is shown. Final passing captures are under `after/`; rejected iteration captures are under `diagnostics/`.

## Asset and layout implementation

`ThoughtBalloon.tsx` supplies a separate SVG with silk, gold edge, air fill, neck and string; selected words are live text. No flattened screen, baked controls, bitmap patch, background mask or new dependency is used. The original `src/assets/wellbeing/scenes/worry-balloon.webp` scenery is unchanged.

The layout has a safe-area header, step caption, flexible balloon region, intrinsic decision area and existing footer. The artwork preserves its aspect ratio and scales up to a 640px SVG viewport on large tablets. At the same 393×852 opening viewport, the balloon body's measured bounds grow from 58×59px to 225.21×253.58px, approximately 16.69 times the bounding area. Labels, choices and Tips remain separated; no gameplay scrolling is required.

Visual fill normalizes the controller's existing 35-point feeling and 40-point balanced-thought preparation to 0–100%; it does not change original progress, eligibility or rewards. Gentle idle/inflation feedback and a 1200ms release animation accompany the original callback. Reduced motion removes idle/scale animation and uses a short opacity transition; the original completion delay remains unchanged.

## Changed files

- `variants/matharia/src/ThoughtRelease.tsx` — new staged presenter; local presentation step only.
- `variants/matharia/src/ThoughtBalloon.tsx` — new independent live SVG object.
- `variants/matharia/src/thought-release.css` — scoped responsive layout, padding and motion.
- `variants/matharia/presentation-transform.ts` — bind the original controller to the presenter; activity HUD title and Tips instructions.
- `variants/matharia/src/wellbeing-scene.css` — import the scoped stylesheet first.
- `variants/matharia/scripts/verify-wellbeing.mjs` — follow the staged UI; configurable preview URL/output.
- This checklist and `WORKLOG.md` — handover and evidence.

QA support scripts, before snapshots, captures and receipts are saved in the evidence directory. The original controller, completion, rewards, content, scenery, shared HUD/guidance, Bloom/Pond styles and earlier Remainder implementation match sixteen task-start SHA-256 hashes. Reversing this task's three presentation bindings reproduces the task-start transform exactly. Unrelated checkout changes were preserved; no branch switch or commit was made.

## Checks and coverage

The actual iOS-mode React application was built and navigated through its activity hub. Browser checks use isolated account fixtures and simulated safe areas, not a native iOS simulator.

| Browser profile | Viewport | Motion / text | Result |
| --- | --- | --- | --- |
| Compact phone, Chromium | 375×667 | Reduced | Pass |
| iPhone 15 dimensions, Chromium | 393×852 | Normal | Pass |
| Phone, WebKit | 393×852 | Reduced | Pass |
| Large phone, Chromium | 430×932 | Reduced; choice/summary text enlarged to 125% | Pass |
| iPad, Chromium | 768×1024 | Reduced | Pass |
| Large iPad, Chromium | 1024×1366 | Normal | Pass |

Six focused profiles cover 36 measured choice/edit states, safe bounds, text containment, target size/hit testing, no scrolling, selection cap, gated actions, heading focus, Tips, release feedback and singular completion. The iPhone check also exercises exit cancellation and clean reentry. No microphone requests or page errors occurred. Six existing Thought Release regressions pass across compact/phone/iPad Chromium and WebKit. No unrelated activity was claimed as retested.

`npm run build` and `npm run typecheck` in `variants/matharia` pass. The build retains its existing bundle-size advisory. React best-practices review confirms a focused presenter, unconditional hooks, derived fill, stable choice keys and original controller callbacks. No extra timer, subscription or network request was added to the presenter.

The prepared Capacitor public copy matches all 851 build files by SHA-256; minimum iOS 16.4 checks pass. Native device/simulator execution, Dynamic Type, VoiceOver, audio and sustained animation performance remain unverified on this Windows host. Live account/reward persistence was not exercised. A native smoke check and signed build/upload remain necessary before this change can be installed through TestFlight. Nothing was pushed, merged, signed, published or uploaded in this task.

## Review artifacts

- `RESULT.json` — machine-readable final results, preserved hashes and native-copy proof.
- `before-after.jpg` — original versus updated running opening screen at the same viewport.
- `stages.jpg` — feeling, thought and full-balloon states.
- `device-coverage.jpg` — compact phone and iPad comparison.
- `after/large-ipad-ready.png` — large-tablet composition.
- `after/checks.json` and `repository/activity-checks.json` — final passing interaction receipts.
- `build.log`, `typecheck.log`, `native-minimum.log`, `native-copy.json` — preparation checks.

The images were visually inspected for hierarchy, balloon scale, alignment, separation, word legibility, padding and compact/tablet composition. They show the running application, not a generated mockup. No external legacy assumptions were used.
