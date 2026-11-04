# Number Line Ninja layout correction — 1 November 2026

The supplied iPhone 15 screenshot reported oversized answer medallions, a number line misaligned with its illustrated bar and a floating character. This correction changes the separate Matharia presentation only.

## Changed files

- `variants/matharia/src/screens/NinjaScene.tsx`: adds an intrinsic rail-face region containing the independent rail artwork and the existing live markers. The original marker mapping, option refs, question values and answer/landing callbacks remain connected.
- `variants/matharia/src/screens/ninja-scene.css`: reduces medallions, centres their group beneath the rail, docks pegs and labels to its painted regions, and anchors the character and bridge supports to the scenery's terrace. Short landscape layouts reserve room for the widest fraction choices above the footer. The smaller flying artwork remains centred inside the original flight coordinate box.
- `docs/concept-recreation/screen-checklist.json`: updates only Number Line Ninja's entry with current evidence and limitations.
- This document and `docs/concept-recreation/WORKLOG.md`.
- Generated native web assets refreshed through Capacitor sync; all 838 compiled files match their native copies by SHA-256.

No question-bank, controller, scoring, lives, timer, reward, save, account or purchase code was edited in this correction. No new art, background patches or masks were needed.

## References and measured layout

The current repository reference is `variants/matharia/reference/approved/number_line_ninja.png` (1844 × 853). The latest supplied iPhone image takes precedence for the requested smaller tokens and corrected docking/grounding.

The independent background is 1844 × 853, the rail is 1800 × 170, and each pillar is 612 × 800. Artwork preserves these aspect ratios. The rail begins at 20.5% of the safe content plane and spans 72.8%; the answer group shares its 56.9% centre line. Pegs span 9–91% of the rail with equal logical intervals. Their bases dock at 31% of the rail height, with labels centred at 65% on the carved apron.

The terrace baseline is measured at source background y=78% and projected through its centre/cover crop. The existing actor renderer places the actual feet at 95% of its square; its wrapper now accounts for that transparent space. Both bridge supports reach the same terrace baseline.

At the iPhone 15 viewport with simulated native insets, regular medallions measure 55.05px instead of 72.67px: about 24% smaller. Compact regular choices are 48px, iPad choices are 72px, and the widest mixed fractions reserve at least 64px. Text remains at least 14px. The compact bridge has a deliberate 3.8 aspect ratio to reserve the longest row's full height; it does not move when the question changes.

## Checklist and verification

| Check | Result | Evidence |
|---|---|---|
| iPhone 15, 852 × 393, 3×, simulated 59px side / 21px bottom insets | Pass | `qa-artifacts/ninja-composition/after/checks.json` |
| Compact phone, 667 × 375, simulated safe areas | Pass | Same report |
| iPad, 1024 × 768 | Pass | Same report |
| Widest source mixed fractions, including `1 11/12`, at all three sizes | 3/3 pass | `after-long/checks.json` |
| Ruler endpoints, equal tick intervals, label containment, grounded feet/supports, 44px targets, no gameplay scrolling | Pass in all six layout/state cases | Both layout reports |
| Real answers, countdown and pending feedback pause/resume, wrong-answer explanation/lives, failure, Retry, 11-answer victory/rewards and Map | 2 full WebKit flows pass | `gameplay/checks.json`, `iphone15-gameplay/checks.json` |
| Mixed-fraction/decimal/negative token text through iPhone 15 play | Pass; 15 question states sampled | `iphone15-gameplay/checks.json` |
| Real animation clock, original 580ms flight, centred image/text, pause/resume, landing and next answer | Pass in Chromium | `flight/checks.json` |
| TypeScript and final iOS-mode Vite build | Pass | `typecheck.log`, `build.log` |
| Existing shared source contracts and 37 approved reference hashes | Pass | `source-contract.log` |
| Capacitor sync and minimum iOS 16.4 | Pass | `ios-sync.log`, `native-copy.json` |

Evidence paths in the table are beneath `qa-artifacts/ninja-composition/` unless fully specified. These are checks of the actual compiled web rendering with the repository's isolated account fixture; they do not access live accounts or certify native iOS behaviour.

Visual evidence inspected:

- `qa-artifacts/ninja-composition/before-after.png`: actual compiled phone layout before/after, using the same seeded question.
- `qa-artifacts/ninja-composition/reference-versus-running.png`: approved concept alongside the current running mixed-fraction screen. Smaller tokens follow the latest user correction rather than the original concept proportions.
- `qa-artifacts/ninja-composition/flight/current-fraction.png`: running normal-motion Chromium screen at iPhone 15 dimensions.
- `qa-artifacts/ninja-composition/after/`: iPhone 15, compact and iPad reduced-motion WebKit captures.
- `qa-artifacts/ninja-composition/after-long/`: widest-fraction captures at all three sizes.

The widest-fraction check initially exposed a compact footer overlap. The final short-screen bridge spacing fixes it; the repeated six-case matrix passes. No game timing was changed to obtain these results.

## Assumptions and remaining verification

The image reports Number Line Ninja's landscape gameplay. Existing independent artwork, character proportions and source gameplay are retained. The source terrace and actor-foot measurements provide the shared floor anchor. The existing larger treatment for unusually long answers remains deliberate to keep text readable.

Windows WebKit screenshots omit the normal-motion WebGL canvas with both the prior and corrected character positioning. Its rendering buffer contains nonzero image pixels and reports no WebGL error. Reduced-motion WebKit artwork and normal-motion Chromium artwork are visible and were inspected. This is a local verification limitation; normal-motion WebKit/iOS appearance still needs confirmation on a native simulator or device. The diagnostic captures are not accepted as visual passes.

The native bundle is prepared locally with minimum iOS 16.4. Native device/simulator testing, Dynamic Type and physical-device performance remain unverified on this Windows host. This correction has not been uploaded to TestFlight, deployed, published or merged. The existing regenerated rail and small frame details still differ from the approved artwork; live question values follow source state.

No external legacy assumptions were used. This work uses the current prompt, supplied image and current repository files.
