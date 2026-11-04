# Return to the game just played â€” 1 November 2026

The supplied screenshot reports that leaving another game returns the island board to Place Value Panic. The exit route already selected the correct island. The Matharia board adapter instead reset its expanded group to the first unfinished game on every mount, and the Continue card used that global recommendation.

## Implemented behaviour

The board now remembers the active game and played level for each island during the current app session. Returning expands that game, restores the mission-list position and brings the played level into view where necessary. Continue and the visible Up Next indicators use existing unlocked missions in the selected game. A fresh board retains the original recommendation until a game is selected.

The active-level observer also covers direct game routes, Retry, practice and advancing to another level. Result callbacks can clear `selectedLevel` without losing the return context. The island board has an island-specific React key so selections cannot carry into a different island.

This is transient navigation state. It does not write to player progress, cloud saves or account storage. A full app restart resets this UI context. Original completion, stars, rewards, timers, lives, subscription checks and level-unlock calculations remain unchanged.

## Changed files

- `variants/matharia/src/shared/missionBoardNavigation.ts`: small session-only context store, active-level observer, scoped next-mission selection and scroll restoration.
- `variants/matharia/src/shared/IslandAdventureBoard.tsx`: owns its selection through the helper; records real level launches and displays the matching Continue card and indicators.
- `variants/matharia/shared-screen-transform.ts`: removes the repeated first-unfinished-group reset and the redundant parent expansion state. Original row/progression calculations are retained.
- `variants/matharia/presentation-transform.ts`: adds the active-level observer to the variant's existing App adapter. Existing avatar and native-access adapters still execute.
- `variants/matharia/scripts/verify-mission-board-navigation.mjs`: regression checks for island isolation, context updates, unlocked-next/replay choices and adapter integration.
- This document, `docs/concept-recreation/shared-adventure-checklist.json` and `docs/concept-recreation/WORKLOG.md`.
- Generated native web assets refreshed through Capacitor sync.

The original application, router, navigation hook, question banks and gameplay files were not edited by this correction. Existing unrelated work remains in place.

## Verification

The old compiled build reproduced the report: leaving Number Line Ninja expanded `place_value_panic`. See `qa-artifacts/mission-return/before/checks.json` and `before/ninja.png`.

The corrected compiled application passed:

| Check | Coverage |
|---|---|
| Launch a real unlocked mission, Back, same expanded game and visible played level, Continue, repeated Back | Number Line Ninja, Prime Pop, Conversion Canyon; iPhone-sized browser viewports |
| Same game-return flow | Number Line Ninja at 1024 Ã— 768 iPad browser size |
| Browser history Back | Retains Number Line Ninja and its Continue card |
| Free practice and purchase guard | Fresh device-save recommendation advances after a completed practice; returns to Ninja practice; exactly three original free practices; a paid level still opens Upgrade without entering gameplay |
| Actual game/results flow | Ninja correct/wrong answers, pause/resume, failure, Retry, eleven-answer victory/rewards and Map; returned board and Continue retain Ninja |
| State and build integration | Per-island isolation, repeated/next levels, replay, locked-level exclusion; exactly one App observer; existing briefing/result avatar bindings and native access guard preserved |
| Repository checks | TypeScript, final iOS-mode production build, original shared controller contracts and all 37 approved reference hashes |
| Native preparation | Capacitor sync, minimum iOS 16.4, compiled/native web asset hash comparison |

Normal board tests select canonical level IDs through the actual enabled level buttons. Older concept-reference routes are not assumed to be the same as the current first unlocked mission.

Evidence beneath `qa-artifacts/mission-return/`: `after/checks.json`, `guards/checks.json`, `game-results/checks.json`, `state-checks.log`, `source-contract.log`, `typecheck.log`, `build.log`, `ios-sync.log`, `native-copy.json`, `before-after.png` and `RESULT.json`. Browser cases use the repository's isolated account fixture and do not contact live account services.

## Assumptions and remaining verification

The requested destination is the exited game's level list, with Continue remaining in that game. When an earlier mission has been completed, Continue can offer the next existing unlocked mission in the same game. It never unlocks a level.

The pause dialog currently contains Resume, rather than an Exit action; pause/resume followed by normal navigation is checked without adding a new control.

These are WebKit browser checks at phone/iPad dimensions with reduced motion, not native iOS tests. Device execution, native orientation timing and physical-device performance remain unverified on this Windows host. The local iOS bundle is prepared with minimum 16.4. This correction has not been uploaded to TestFlight, deployed, published or merged.

No external legacy assumptions were used. The correction uses the supplied image and current repository source.
