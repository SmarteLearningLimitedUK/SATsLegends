# Peaceful Pond — five-pad focus

Request: correct the text, visibility and use of screen space in the supplied iPhone 15 landscape capture, and use only five lily pads. Assumptions: this applies to the separate Matharia reskin; Peaceful Pond remains landscape and uses its existing calm scenery and independent lily-pad/fish assets.

## Screen checklist

| Reference | Rendering path | Assets | Implementation | Verification |
| --- | --- | --- | --- | --- |
| Attached Photo 1, Peaceful Pond (1280×589 iPhone landscape image) | Original `src/wellbeing/activities/PeacefulPond.tsx` and `WellbeingShell.tsx`, adapted by Matharia `presentation-transform.ts` into `PondLayout.tsx`; scoped `pond-scene.css` | Existing pond background, transparent lily pad, independent fish, registered panel/button frames | Five pads/rings; 20% progress; clear numeric badges; compact noticing rail; quieter fish behind destinations; original completion timing; contained and reversible drags | Passed: 45 captured layout states in four profiles, plus eight repository-verifier profiles |

## Changed production files

- `variants/matharia/presentation-transform.ts`
- `variants/matharia/src/wellbeing-scene.css`
- `variants/matharia/src/pond-scene.css` (new)
- `variants/matharia/src/PondLayout.tsx` (new)

Verification script updated: `variants/matharia/scripts/verify-pond.mjs`. It now checks five steps and accepts `MATHARIA_QA_BASE_URL` while preserving its existing default URL.

The original activity source remains unchanged. Its noticing prompts, grounding information, affirmation, tap/keyboard/pointer flow, completion hook, rewards and exit integrations are retained. The variant explicitly selects five pads and updates its count-dependent positions, labels and progress. Invalid drops restore the pad's previous location; drag bounds account for its actual rendered dimensions. Five quiet fish replace the previous sixteen in this variant.

The duplicated activity heading is represented by the existing shared top HUD. The original heading remains available to assistive technology. The existing shared Back control retains the adventure destination. `PondLayout` reuses the actual activity elements, their refs/callbacks and the shared footer in two independent columns. Its compact noticing rail no longer stretches into an empty iPad panel. Other wellbeing activities receive their original children through a fragment. The rail responds to its font size. All numeric badges have deliberate opaque text containers; placed pads retain full visibility and fish render behind the numbered objects. No scenery masks, patches or new flattened artwork are introduced.

Pond reduced motion uses a scoped `useSyncExternalStore` media-query subscription so fish stop when the preference changes during an open activity, as well as at launch. This replaces the hook only in the Matharia Pond adapter; other activity controllers are unchanged.

## Verification and visual evidence

Evidence: `qa-artifacts/pond-five-pad-focus/`. Final status: `RESULT.json`; comparisons: `before-after.jpg`; device montage: `device-contact.jpg`; full running captures: `after/`. Earlier failure captures are retained as investigation history; `RESULT.json`, `after/checks.json` and `final-checks.log` describe the final passing source.

At 852×393 with simulated iPhone landscape safe areas (59px left/right, 21px bottom), pads increase from 44px to 56px and the playfield gains width by removing a duplicate safe inset. The screen renders five independent pads and five destination rings. All progress labels and completion text reflect five steps.

Four primary profiles: Chromium 852×393 normal motion, 667×375 reduced motion, 1024×768 reduced motion with iPad safe areas; WebKit 852×393 reduced motion. Forty-five captured layout states check text containment, safe bounds, control sizes and centre hit tests, no document scrolling, out-of-bounds drag containment, invalid-drop restoration, actual pointer drag, touch at observed viewport coordinates, keyboard placement, sequential noticing, 20/40/60/80/100% progress, completion and return navigation. Compact layout also passes 125% noticing/instruction text and orientation-gate restoration with a placed pad retained. Normal press feedback is allowed to settle and restoration is verified against the original pad anchor.

The updated repository verifier passes eight additional Chromium/WebKit profiles at 844×390, 667×375, 932×430 and 1024×768. Across both suites, 60 placements and twelve full five-step completions pass. Supplemental real-time checks verify normal fish motion, runtime reduced-motion stopping, Back during the pending completion delay without a reward dialog, and Breath Bloom title/start/pause controls through the shared shell.

Build and TypeScript checks pass. Eighteen protected source/reference/art files remain byte-identical to their pre-edit snapshots, including the original activity, shared shell, grounding data, completion hook, progression/audio integrations, Breath Bloom styles and existing pond/lily art. The current branch and unrelated existing work are preserved.

The final local Capacitor web copy matches all 848 files in `dist-matharia` by SHA-256. Minimum iOS 16.4 remains verified. Derived web/native bundle files, this checklist, QA evidence and a worklog entry accompany the four production files and the updated verifier.

Remaining verification: native iOS execution is unavailable on this Windows host. Actual device safe areas, orientation changes, touch behaviour, Dynamic Type and performance remain unverified on iOS. Browser checks are not native iOS tests. No clipping/overflow failure remains in the verified browser states. A signed build/upload and physical iPhone/iPad checks remain necessary before these changes are available through TestFlight. Nothing was pushed, published or merged during this pass.

No external legacy assumptions were used.
