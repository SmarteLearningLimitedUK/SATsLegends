# Change Counter: contained landscape layout

Request: fix elements running off the screen in the supplied iPhone photo. Current checkout: `D:/BrainZilla/GitHub/SATsLegends`, branch `codex/website-refinement-2026-10-28`. Existing unrelated work was preserved. References: the attached 1280 × 589 photo and the repository's approved 1844 × 853 `change_counter.png`.

Assumptions: retain landscape, current shop artwork, independent receipt/coin assets, eight denominations, original money questions and existing shared HUD. No new art is needed.

Visual thesis: preserve the shop composition while fitting the complete receipt and till in a single bounded working area. The receipt is the reference; the till is the action area. Existing coin-drop, button feedback and clerk animation are retained.

## Implementation

- `variants/matharia/src/screens/ChangeScene.tsx`: receipt and till share a grid wrapper. Full answer feedback occupies the question panel instead of stacking against the payment instruction; the paid amount remains visible in the receipt. Removed the duplicate instruction strip below the till.
- `variants/matharia/src/screens/change-scene.css`: explicit space for the shared header, question, working area and footer. The receipt and till align and stay inside the safe viewport. The compact landscape layout retains 44 px coin/action targets and reserves footer clearance. Legacy per-game HUD placement overrides were removed; the common HUD owns its geometry.
- `variants/matharia/scripts/verify-change.mjs`: configurable preview/output, account fixture readiness, real native-viewport safe-area simulation, an additional small-phone case, and assertions that panels and coin controls stay within their working area and clear of the footer.
- `variants/matharia/scripts/verify-change-motion.mjs`: configurable preview/output, fixture readiness and corrected native-viewport safe-area simulation.

The gameplay controller, presenter binding, shared HUD implementation, compositions and asset/reference metadata are protected by before/after hashes. Prices, quantities, coin values, scores, lives, six trades, retained coins after errors and original 520 ms feedback/advance timing are unchanged.

The current shared viewport correction already brings the screenshot's right edge inside the running app. Initial captures also showed the receipt extending into the footer region and a duplicate instruction strip overlapping controls. This pass corrects those remaining layout problems. No controls are hidden, clipped or shrunk to fit; no background patches or concealment masks were introduced.

## Verification checklist

| Check | Status | Evidence |
| --- | --- | --- |
| Source, reference and baseline inspection | Done | `source-before-hashes.json`, `before.png`, `before-full.png` |
| Bounded receipt/till and full coin tray | Passed; final phone, compact and iPad screenshots inspected | `after.png`, `after-full.png` |
| Coin entry, remove, undo, clear, submit, error, retry and results | 12/12 profiles; 72 independently checked receipts | `game/checks.json` |
| Phone/iPad safe-area and footer containment | Passed across all 12 profiles, including the full tray | functional per-profile geometry |
| Coin animation, pause, reduced motion and rotation state | 4/4 cases; 16 safe-area/root-font combinations | `motion/motion-and-safe-areas.json` |
| Build and TypeScript | Passed | `build.log`, `typecheck.log` |
| Practice and one-life feedback states | 6/6 Chromium/WebKit profiles; 24 states | `states.json` |
| Capacitor web resources | 853/853 files match the build; minimum iOS 16.4 | `native-copy.json` |
| Native iOS execution | Unverified | Windows host |
| TestFlight upload | Not performed | Local source task |

QA evidence is under `qa-artifacts/change-contained-2026-11-03/`. Isolated account fixtures intercept requests locally and never write to a live account service. Browser viewport, safe-area, WebKit and root-font checks are not native iOS, system Dynamic Type or hardware-performance testing.

## Evidence and handover

- [Reported iPhone / running correction](../../qa-artifacts/change-contained-2026-11-03/reported-vs-running.png)
- [Current before / after, with full tray](../../qa-artifacts/change-contained-2026-11-03/before-after.png)
- [Approved concept / running correction](../../qa-artifacts/change-contained-2026-11-03/approved-vs-running.png)
- [Verification results](../../qa-artifacts/change-contained-2026-11-03/RESULT.json) and [protected-source hashes](../../qa-artifacts/change-contained-2026-11-03/source-scope.json)

Full-game profiles used Chromium and WebKit at 844 × 390 (reference and standard phone), 667 × 375 (compact), 812 × 375 (small phone), 932 × 430 (large phone) and 1024 × 768 (iPad). Phone tests simulate 44/59 px side insets and 21 px bottom clearance; iPad tests use 24/20 px top/bottom clearance. They exercise four-line receipts, all eight denominations, more than five selected coins, coin removal, Undo/Clear, incorrect change without losing the receipt, duplicate-submit guards, original 520 ms active delays, pause/resume, six completed trades, stars, failure/Retry and Map return.

Additional practice checks use 667 × 375, 852 × 393 and 1024 × 768 in both engines, checking empty trays, incorrect feedback and adjusting coins with one life remaining. Their `tier1-empty` screenshot names refer to Tier 1 content in practice mode. An initial compact measurement caught a button during its existing 96% press animation; the check now waits for release before measuring the settled 44 px target. The compact retry passed in both engines; final acceptance uses `states.json` rather than the superseded diagnostic log.

Twenty production assets, the gameplay controller and seven protected source/reference files match their original hashes. Changed files are the four source/QA paths listed above, this checklist, an appended WORKLOG entry, QA evidence and regenerated Capacitor web resources. No commit, push, merge or upload was performed.

Before release: install a signed build on representative iPhone/iPad hardware or simulators and check actual native safe areas, rotation, accessibility and touch/audio behaviour. A new TestFlight upload is required to put these changes on testers' devices.

No external legacy assumptions were used.
