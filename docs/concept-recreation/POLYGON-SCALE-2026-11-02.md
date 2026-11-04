# Polygon Palace shape scale and reclaimed space — 2 November 2026

## Request and assumptions

The user requests much larger shapes, comparable 2D/3D visual scale and removal of the unused lower space shown on their iPhone 15 image. This is a presentation-only change in the current `codex/website-refinement-2026-10-28` checkout. Preserve portrait orientation, original shape geometry, questions, choices, answer rules, scoring, timers, progression and navigation. Existing palace/hero/frame assets are reused; no new artwork or outside design references are needed.

## Diagnosis

At the actual 393×852 browser profile with simulated 59px top/34px bottom safe areas, the cube occupies only 58.52×65.83px, while a rotated 2D square occupies 116.20×116.20px. The shared 144×132 solid view box contains an 80×90 cube and gives the other three solids inconsistent padding. The old diagram region itself is just 30% wide and 14.4% high.

The four-answer region ends 113.89px before the bottom HUD because the layout reserves space for an absent Submit button and occasional feedback. Baselines are recorded in `qa-artifacts/polygon-scale/baseline.json` and `before-*.png`.

## Implementation and changed files

- `variants/matharia/src/screens/PolygonScene.tsx`: per-solid view boxes with four original SVG units of stroke clearance; equivalent circle framing. All face polygons, hidden-edge paths and geometry remain in the unchanged original renderer. Locked-answer feedback becomes a temporary status panel over disabled choices; an empty properties warning appears in the instructional region while live choices remain available. The original helper is retained for assistive technology during that warning.
- `variants/matharia/src/screens/polygon-scene.css`: a bottom-up layout anchored 12px above the safe HUD, with Submit space allocated only in properties mode. The question and pedestal sit above the answers and the large figure uses the remaining upper bay. A wider portrait plane uses available phone/iPad width; the guide is secondary to the shape. Fixed-size checkboxes leave more room for labels. The shortest properties layout places instructions beside the shape and omits the decorative guide to preserve six readable choices and Submit.
- This handover, `WORKLOG.md`, QA scripts/receipts/captures and the prepared local Capacitor public bundle.

No production controller or presentation adapter change is required. The React/TypeScript/Vite Matharia rendering path remains the native Capacitor application's content.

## Persistent checklist

| Check | Evidence | Status |
| --- | --- | --- |
| Current source and approved reference inspected; existing work preserved | Source snapshots/hashes and baseline captures | Done |
| Much larger cube and other solids with their original hidden edges | `after/checks.json`, `SUMMARY.json` | All four solids pass; model bounds, face coordinates and hidden paths are identical |
| Larger 2D shape and reduced lower gap | `comparison-cube.png`, `SUMMARY.json` | Phone cube height 65.83→208.66px (3.17×); rotated square 116.20→242.79px; idle lower gap 113.89→12.05px |
| Correct/wrong answers, pause and properties/Submit | `after/checks.json` | Independent count/name/property answers pass; original pause, 330ms transition, correction, 40-point penalty and one life loss preserved |
| Compact/large iPhone and iPad fit, safe areas, touch/text bounds | Six scenarios, nine diagram states, 39 targets | Pass at 375×667, 393×852, 430×932 and 768×1024; no gameplay scrolling |
| Production build and variant TypeScript | `build.log`, `typecheck.log` | Pass; existing chunk-size warning remains |
| Protected controller/shared files and local iOS 16.4 bundle | `source-scope.json`, `native-copy.json` | All 22 protected files unchanged; all 848 build files hash-match the prepared native bundle; native execution unavailable |

The six-property compact screen uses a 647px usable height and shows a 141.64px square beside the instructions, with the decorative guide omitted. All six live choices stay tappable during an empty-selection warning; correct properties score only on Submit. Submit retains its full 44px hit area during press feedback. iPad cube height is 285.45px and large-phone cube height is 239.11px. Chromium and reduced-motion Windows WebKit captures are inspected.

## Comparison and receipt

![Actual phone cube before and after the layout correction](../../qa-artifacts/polygon-scale/comparison-cube.png)

Both images use the same 393×852 viewport and real question/geometry. The 2D and solid paths remain live SVG; no flattened screen or new artwork is used. Full receipts and screenshots are under `qa-artifacts/polygon-scale`; `RESULT.json` combines browser coverage, source preservation and native-copy checks.

## Verification limits

Browser checks are not native iOS tests. Device safe areas, Dynamic Type, native orientation behaviour and performance require device verification. Windows WebKit's normal-motion WebGL actor page-capture limitation is already documented in the repository; reduced-motion stills can verify the presentation without claiming native coverage. Account services are isolated during browser checks. No TestFlight upload, push, merge or deployment is part of this correction.

This focused presentation check does not repeat a full timed-victory sweep or exercise real backend, subscription or purchase operations. Those implementations remain unchanged.

No external legacy assumptions were used.
