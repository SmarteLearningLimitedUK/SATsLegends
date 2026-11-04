# Factor Frenzy — sentinel and control proportions

Request: enlarge the enemy, reduce oversized answers and improve use of the portrait screen in the attached iPhone image. Assumptions: retain the existing portrait orientation and approved clockwork-city/sentinel art; change the Matharia presentation while preserving all questions, ten locks, clocks, lives, scoring, difficulty and navigation.

## Screen checklist

| Reference | Actual rendering path | Assets | Implementation | Verification |
| --- | --- | --- | --- | --- |
| Attached Photo 1; existing `reference/approved/factor_frenzy.png` (853×1844) | Original `FactorFrenzyGame.tsx` through the existing Matharia adapter into `FactorScene.tsx` and `factor-scene.css` | Existing clean clockwork backdrop, transparent sentinel, independent dais, registered frames and controls | Four choices in one row; seven/eight in two rows; five/six/nine use three columns; live submit inside the console; flexible sentinel stage; square actor canvas and explicit ground line | Actual running screenshots inspected on compact phone, iPhone 15 viewport and iPad; final regression receipt in the evidence below |

## Changed source

- `variants/matharia/src/screens/FactorScene.tsx`
- `variants/matharia/src/screens/factor-scene.css`
- `variants/matharia/scripts/verify-factor.mjs` — configurable preview URL; wait for the test account on the mission board and discover the real level route before entering the protected game; measure visible captions.
- This handover and the appended root `WORKLOG.md` entry.

The original game controller and presentation bindings are preserved. The live lock panel, sentinel/dais and console form one vertical layout with intrinsic controls and a flexible illustrated region. No flattened screen, scenery covers, asset replacement, source question edits or timing changes are introduced. The sentinel's display box stays square to retain artwork proportions in both the mesh and reduced-motion rendering; its existing 5% baseline meets the dais in a common scene coordinate system.

The console reserves a proportional 12–24px inner inset, including under the live fire control, so its thicker tablet frame cannot intrude on the content. The shared portrait HUD keeps its established placement. On compact phones its nonessential streak label is suppressed so the two essential statistic rows stay inside the artwork. The guidance and answer feedback share one padded caption; compact phones retain the full instruction in the existing Tips panel. Correct/incorrect messages retain their original educational text. The character and dais share an aspect-preserving coordinate system: actor square `min(102cqh,92.6cqw)`, dais width 1.08 times that square, and its surface at 9% of dais width above the illustration baseline.

At the same 393×852 viewport, with simulated top/bottom safe areas 59/34 and exactly the same question:

| Measured region (CSS px) | Before | Updated |
| --- | --- | --- |
| Sentinel display box | 165×129.02 | 326.23×326.23 |
| First answer touch target | 140×70.34 | 77.92×44 |
| Four-answer bank | 285×145.69 | 329.72×44 |
| Console, excluding the previously separate fire button | 337.5×227.69 | 353.72×152, including the fire button |

The sentinel display is 2.53 times taller. The first answer target and answer-bank areas are approximately 65% smaller. These are layout measurements, not numerical claims about painted silhouette similarity. Full questions, locks, controls and grounded artwork are visibly separated. All measured live targets retain at least 44px height; no gameplay scrolling is introduced.

## Evidence and checks

Evidence root: `qa-artifacts/factor-space-focus/`.

- `before-after.jpg`: identical question and viewport, real pre-edit and updated browser renders.
- `reference-comparison.jpg`: approved concept and current live practice composition. The approved illustration shows nine runes; the current request deliberately makes the four-choice state compact.
- `device-coverage.jpg`: compact phone, normal-motion iPhone 15 viewport and iPad.
- `after/checks.json`: 73 measured states in four profiles; 36 independently calculated submissions across missing-factor, all-factor, common-factor and prime-factor modes. Four through nine options (observed counts 4, 5, 6, 7, 9), wrong/correct feedback, exact score/time bonus, ten locks, pause/resume, duplicate-submit guard and manual victory are exercised. Compact prose is also checked at 125% font size. Header text is measured against the actual art bounds as well as the outer HUD box.
- `motion/checks.json`: real mesh playback and hit deformation, pause/resume freeze and live reduced-motion fallback; separate practice and multi-select captures, plus a 1024×1366 iPad viewport check exercising the 620px illustrated-stage cap with conservative simulated 59/34px top/bottom insets. The 768×1024 focused profile uses 24/20px insets.
- `repository-full-matrix.log`, `repository-verifier.log` and `qa-artifacts/concept-recreation/factor_frenzy/checks.json`: ten passing combined Chromium/WebKit profiles at 390×843, 375×667, 390×844, 430×932 and 768×1024, including 100 highest-tier independently solved correct submissions, exact scoring, original active-clock delays, lives, failure/Retry, manual Claim Victory, results and Map. The first matrix exposed a test-clock assumption: advancing 1100ms can cross two 1000ms interval boundaries. The verifier now advances exactly 1000ms and records the before/after value; both compact profiles were rerun and passed. The game controller was not changed.
- `build.log`, `typecheck.log`: passing production iOS-mode Vite build and TypeScript check. The existing large-chunk build warning remains.
- `protected.json`: nineteen snapshotted source/art/reference files unchanged, including the controller, adapter, session/progression/audio, mesh renderer, shared shell/HUD, original reference/assets and previous Pond work.
- `native-copy.json`: all 848 final build files match the local Capacitor public copy; minimum iOS 16.4 checked. Aggregate receipt: `RESULT.json`.

The last adjustment after the full gameplay matrix was CSS console padding only. All 73 focused layout/submission states and all three motion profiles were rerun against that final bundle; the gameplay TypeScript was unchanged.

## Remaining limits and production handover

At 375×667, nine-rune sets reserve three 44px control rows, so their sentinel is smaller than in the four-choice state; it remains grounded and all controls fit. This is a responsive presentation revision, not a pixel-identical reproduction of every concept state. Existing approved art and all educational/game-controller content remain unchanged.

Native iOS execution is unavailable on this Windows host. Browser checks are not native iOS tests. Native safe areas, device text settings, orientation/backgrounding and real-device performance still need checking in the next signed build. Real accounts, purchases and subscription operations were not exercised; browser gameplay uses the repository's local release-account fixture. No push, publication, merge, signed archive or TestFlight upload is part of this pass. The current installed TestFlight build will not acquire these changes until a new build is uploaded.

No external legacy assumptions were used.
