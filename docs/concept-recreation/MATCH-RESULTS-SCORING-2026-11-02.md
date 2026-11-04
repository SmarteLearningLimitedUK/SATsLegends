# Match Mastery scoring and results clearance — 2 November 2026

The current user capture shows a 100% accurate Match Mastery clear earning one star and 45 XP, with the close button too close to the result frame/status. Work stays in the current SATs Legends checkout, `codex/website-refinement-2026-10-28`. Rendering is React plus the Matharia Vite presentation adapter inside Capacitor. Existing unrelated work is retained.

## Corrected behaviour

The controller ends at its score target, but previously assigned two/three stars only at 130%/180% of that target. Higher ratings consequently depended on lucky overshoot. The application now resolves Match Mastery's accepted-clear rating once from its existing actual swap accuracy, mistakes and Tips usage, before recording telemetry or progression. It reuses the shared accuracy policy: three stars for 100% accuracy without Tips, two for at least 80%, otherwise a minimum one for reaching the clear target. Other games and practice retain their existing ratings.

The XP economy is unchanged: 25/40/60 base XP for one/two/three stars, existing difficulty bonus, +15 on first clear and +10 for unassisted perfect accuracy. At the pictured level's difficulty, an equivalent perfect replay now earns 80 rather than 45 XP; a first perfect clear earns 95. Saved best results never decrease and first-clear bonuses do not repeat. Earlier saved awards are not retrospectively rewritten; replaying records the new earned result.

Board points are now labelled Score/points, with the final board score separate from reward XP. Results show concise star criteria. The shared results toolbar gives location/status their own text column and reserves a separate 44px close-button column, inside the frame's ornamental corners. This applies to victory, failure and practice results.

Actual play also exposed stalled boards in tiers 1–4: their existing recovery function returned them unchanged even with no legal swaps. Those Match Mastery tiers now reshuffle when needed to retain at least one legal move. Tier 5 retains its original five-choice guarantee. No free points, lives or time are added, existing playable boards are retained, and Cloud Collapse keeps its previous behaviour.

## Screen checklist and evidence

| State | Source / evidence | Status |
| --- | --- | --- |
| Match Mastery tiers 1–5, perfect clears | `qa-artifacts/match-results-fix/{webkit,chromium}-checks.json` | Pass in both engines; 18 total functional scenarios |
| Incorrect swap then clear; Tips then perfect clear | Same receipts | Two-star reward checked from real game interaction |
| Failure and Retry | Same receipts | Zero clear stars; Retry restores score and lives |
| Practice results | Same receipts | Existing no-XP practice result retained |
| Next Level and Close | Same receipts | Navigate to real next tier / played Match Mastery mission group |
| Six portrait phone/iPad sizes | WebKit results captures and measured bounds | Victory, failure and practice; no page overflow, contained text, accessible buttons |
| Enlarged UI text | `qa-artifacts/match-results-fix/iphone15-text125.png` | 125% selected text, checked in browser; not native Dynamic Type |
| Shared landscape result toolbar | `qa-artifacts/match-results-fix/landscape.json` | Real Scale Builder failure, touch/close check with simulated safe areas |
| Native build resources | `qa-artifacts/match-results-fix/native-copy.json` | 842 files hash-match; minimum iOS 16.4 |

![User capture versus updated real browser completion](../../qa-artifacts/match-results-fix/comparison.png)

The comparison uses different accounts and real rounds: the browser fixture is a first clear (+95 XP); the equivalent perfect replay is +80 XP. No screenshot contents are used as interactive UI. No new artwork, masks, patches or background edits were required.

Browser profiles: 320×568, 375×667, 393×852, 430×932, 768×1024 and 834×1194, using simulated safe-area insets. Landscape shared-results verification uses 852×393. Match Mastery itself retains portrait gameplay. Real iOS safe areas and Dynamic Type remain unverified.

## Functional and source checks

- `scripts/qa/verify-match-mastery-rating.ts`: eight rating cases, twelve unrelated-game ratings, five progression levels, first/replay awards, saved bests and failure/invalid-victory behaviour.
- `scripts/qa/verify-match-playability.mjs`: independent oracle over the controller's real pure functions; 500 generated boards, five stalled-board recoveries, five forced fallbacks and five Cloud Collapse preservation cases. Checks original value pools, unique tile IDs, no immediate matches and no mutation of supplied boards.
- Variant typecheck, root TypeScript lint and Matharia production build pass. The existing large-chunk warning remains.
- Shared-source contract check retains existing controller/calculation blocks and confirms all 37 approved image references are unchanged. Source changes are listed below.
- Capacitor sync and the iOS 16.4 settings check pass. Native bundle contents hash-match the verified web build.

Original educational values, match rules, target scores, cascade scoring, timers, lives, sound, pause, final-tier completion requirements and rewards table are preserved. Changes to the rating policy and dead-board recovery above are deliberate corrections to the reported scoring issue.

## Changed files

- `src/App.tsx`: resolve rating before telemetry/progression; forward existing board score to results.
- `src/lib/progression/matchMasteryRating.ts`: scoped rating policy using existing shared calculation.
- `src/games/FractionMatchGame.tsx`: legal-move recovery for tiers 1–4.
- `src/components/results/LevelResultsModal.tsx`: optional score presentation prop.
- `variants/matharia/presentation-transform.ts`: points goal labels.
- `variants/matharia/src/screens/MatchScene.tsx`: Score/points labels.
- `variants/matharia/shared-screen-transform.ts`: Match-only result explanation and score; remove duplicate star badge for this game.
- `variants/matharia/src/shared/MatchResultSummary.tsx`: compact points and criteria text.
- `variants/matharia/src/shared/shared-adventure.css`: reserved close-button column, frame clearance and padded layout.
- The two focused regression scripts above; this handover and `WORKLOG.md`; QA scripts, receipts and comparison under `qa-artifacts/match-results-fix`; refreshed local Capacitor public bundle/configuration.

## Remaining before distribution

Native execution, real-device touch/safe-area/Dynamic Type checks and native performance/audio remain unverified on this Windows host. Signing on macOS and uploading a new TestFlight build remain outstanding. No push, merge, deployment or TestFlight upload was performed.

Assumptions: the canonical `match3_equivalence` blueprint defines the requested game; accurate matching should determine its stars rather than random score overshoot; a playable board must offer a legal adjacent swap; preserve the approved sapphire/gold materials and portrait orientation. No external legacy assumptions were used.
