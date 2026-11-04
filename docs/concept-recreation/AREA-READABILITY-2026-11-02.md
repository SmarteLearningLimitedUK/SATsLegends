# Area Architect dimensions and over-plan continuation — 2 November 2026

## Request and assumptions

The user requests the existing Next room control over the room after a correct answer and readable shape dimensions. Preserve the landscape encounter, original square cells/cutouts, questions, answers, manual next/finish progression, scoring, lives, timers and navigation. The approved repository reference and the supplied iPhone screenshot are the visual sources. This is scoped React/TypeScript/Vite presentation work in the current `codex/website-refinement-2026-10-28` checkout.

## Rendering and correction

Matharia's Area adapter retains the original `src/games/AreaArchitectGame.tsx` controller and supplies its live SVG to `AreaScene.tsx`. The old dimensions are ten SVG units and shrink with the grid, with thin text over scenery and a rotated side label. The old Next room control is in the left explanation panel, with no overlap with the room. The landscape stage also applied the horizontal safe area twice.

- `variants/matharia/src/screens/AreaScene.tsx`: places the single Next/Finish control in the actual aspect-matched room wrapper, centred over the plan only when solved. Retains `nextOnce`, pause guard and the original `onNext`. Focus follows the visible continuation control after a correct answer. Rectangle values render in independent top/left HTML badges; the side value stays horizontal. Non-rectangular plans receive no misleading bounding-dimension labels. The full explanation remains separate on the left.
- `variants/matharia/src/screens/area-scene.css`: reserves explicit 48px top/64px left dimension gutters and uses a size container to fit the SVG without stretching square cells. Badge text is at least 16px, with dark teal backing, gold edges and padding. The Next control stays centred even for narrow/tall or letterboxed rooms. A scoped landscape margin reset removes the duplicate inset. The existing scenery/table/architect/HUD assets are reused.
- `variants/matharia/presentation-transform.ts`: changes only the Area block: tight SVG bounds and removal of the legacy rectangle annotation path/text. It does not cover old labels or change any cell/gradient/grid source.
- This handover, `WORKLOG.md`, QA scripts/receipts/captures and the prepared local Capacitor public bundle.

## Persistent checklist

| Requirement | Evidence | Status |
| --- | --- | --- |
| Reproduce original dimensions/control placement | `qa-artifacts/area-readability/baseline.json`, `before-rectangle-*.png` | Reproduced and inspected |
| Padded readable top/side dimension values | Focused rectangle captures and bounds; 16–18.432px text | Pass |
| One Next/Finish over actual room after correct | Nine solved-state continuation measurements; minimum 72×44px target | Pass |
| Manual advance, pause, duplicate tap and all five rooms | Real phone flow ends at original perfect-run 3 stars / 850 score | Pass |
| Irregular cells, incorrect/repeated answers and unchanged area | Independently counted 22-cell cutout, wrong/repeated answer rejection; source hashes | Pass |
| Compact landscape, iPhone/iPad and reduced WebKit fit | Five cases / 14 measured states at 667×375, 852×393 and 1024×768 | Pass in browsers |
| Build/typecheck, unchanged controller/shared files and native copy | Build/typecheck logs; 22 unchanged protected files; all 848 public files hash-match at iOS 16.4 | Pass locally |

## Evidence and handover

The five browser cases are the phone's full five-room rectangle run, compact rectangle, iPad rectangle, phone cutout and reduced-motion Windows WebKit phone rectangle. The phone uses simulated 59px left/right and 21px bottom safe areas. Wrong answers retain the cutout and reject repeated choices; correct answers retain the room until manual continuation. The single centred control becomes Finish rooms on the fifth room. The 14 measured states and 16 actual screenshots are saved in `qa-artifacts/area-readability/after`; its `checks.json`, `phone-flow-checks.json` and `metrics.json` record assertions and bounds.

The combined `qa-artifacts/area-readability/comparison.png` shows actual before/after browser captures at the same 852×393 viewport and solved first-room state. Phone idle/solved, compact idle, iPad solved, cutout solved and the combined comparison were visually inspected. The badge text has contrast and internal padding, square cells keep their aspect, and continuation is centred on the actual SVG rather than the larger measurement region.

`qa-artifacts/area-readability/source-scope.json` verifies the original controller, shared session/progression/audio/HUD and approved reference files are unchanged. Other presentation adapters are byte-identical, as is the original single-advance guard. `native-copy.json` verifies all 848 build files copied into the local Capacitor public bundle, with only the expected two Cordova bridge files extra. The aggregate handover receipt is `qa-artifacts/area-readability/RESULT.json`.

Before production, run the prepared bundle on native iPhone/iPad, verify accessibility/orientation and submit a new signed build when requested. The focused correction does not repeat timer-expiry failure/retry or real account/purchase tests.

## Limits

Browser safe-area/viewport checks are not native iOS testing. Device rendering, Dynamic Type/VoiceOver, orientation changes and performance remain unverified on this Windows host. Reduced-motion WebKit avoids the normal Windows WebGL actor screenshot limitation already documented in the repository. Account requests are isolated; real backend/purchase operations are outside this correction. No TestFlight upload, publication, push or merge is performed.

No external legacy assumptions were used.
