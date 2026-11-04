# Match Mastery board focus — 2 November 2026

The current request rejects the crowded scenery, small board and low hero separation in the supplied iPhone 15 capture. This supersedes the older concept's busy courtyard composition while retaining Matharia materials, portrait orientation, the 6×5 board and original gameplay.

The implementation uses new quiet courtyard scenery, a separate slim hollow gold frame and a plain teal board material. All 30 gems remain independent live controls. The board takes nearly the full phone width, with a compact hero/instruction band above it and actual round time, XP and goal grouped below. The generic header clock is hidden in this game so it no longer competes with the controller's actual 60-second clock. No timers or rules change.

## Checklist and verification

| Area | Status | Evidence in `qa-artifacts/match-board-focus` |
| --- | --- | --- |
| Production assets | Two selected assets generated, inspected and integrated | `frame-alpha.json`; asset provenance below |
| Phone/iPad layout and input geometry | 24 states pass across six WebKit browser profiles | `layout/checks.json` |
| All five levels | Ten live flow cases pass in WebKit and Chromium | `flow/checks.json` |
| Enlarged text | Four browser cases pass at 125% selected UI text | `text-probe.json` |
| Animation and controls | Four real-clock normal/reduced-motion cases pass | `motion.json` |
| Compilation | Variant typecheck, root lint/typecheck and production build pass | `typecheck.log`, `lint.log`, `build.log` |
| Scope and references | Original controller and other protected files retained; 37 reference hashes unchanged | `scope.json`, `shared-contract.json` |
| Local iOS public bundle | All 842 production files hash-match; iOS 16.4 verified in Xcode settings and Swift package | `native-copy.json`, `native-sync.log` |
| Native execution and TestFlight | Outstanding | Windows host; no signed upload performed |

Combined receipt: [RESULT.json](../../qa-artifacts/match-board-focus/RESULT.json).

At the 393×852 browser viewport with simulated 59px top and 34px bottom safe areas, tile targets increase from **50.56×49.36px to 58.06×55.70px**, a **29.6% area increase**. The frame is 8.5% wider and starts 64.5px earlier than the saved browser baseline. These measurements compare the before/after running browser renders, not a calculation from the supplied photograph. All six profiles retain 30 live targets of at least 44px, centred labels, a complete board, clear status/footer separation and no gameplay scrolling.

Profiles: 393×852 iPhone 15, 375×667 compact phone, 320×568 zoomed/small layout stress, 430×932 large phone, 768×1024 iPad and 834×1194 large iPad. Each covers idle/selected level one, mixed representations in level three and the colourless level-five board. Safe areas are simulated; these are not native iPhone/iPad tests.

The guide panel measures actual text and padding. It widens within the reserved band when enlarged text needs more room, keeping the board fixed. If the full band is needed, the body guide is hidden while the shared header portrait remains. Browser text checks cover iPhone 15, compact, zoomed/small and iPad selected guidance at 125%; they do not certify native Dynamic Type. The instruction frame remains separate from its text, and its corners preserve their proportions.

All five levels exercise a wrong swap/life change, valid matches, scoring, cascades/refill, pause/resume and disabled inputs. Levels one and five complete real swaps to victory and return to the Match Mastery mission group. Both engines exercise failure and Retry in level one. The final-tier goal displays **both** five successful swaps and the original 1600 XP target; its progress is limited by whichever original requirement is less complete. No win condition changes.

Real-clock checks cover hero/gem animation, reduced motion, pause during an active swap, clock/input holds, resume/refill, portrait rotation gating without losing the board, Tips, the working board and Sound. All four engine/motion combinations pass. Existing in-flight updates are allowed to settle at the pause boundary before measuring a stable paused state; gameplay/controller timing code remains unchanged.

## Visual evidence

Before is the supplied iPhone photograph. After is the actual compiled application in a WebKit browser at iPhone 15 dimensions. The generated scenery/frame are separate production assets; neither is a flattened interactive screenshot. The game board is a representative live state, so individual starting values may differ between captures.

![Before and after](../../qa-artifacts/match-board-focus/comparison.png)

[Full phone capture](../../qa-artifacts/match-board-focus/final-iphone15.png), [iPad capture](../../qa-artifacts/match-board-focus/layout/ipad-level-1-idle.png), [mixed-representation board](../../qa-artifacts/match-board-focus/layout/iphone15-level-3-idle.png), [colourless board](../../qa-artifacts/match-board-focus/layout/iphone15-level-5-idle.png), [enlarged compact text](../../qa-artifacts/match-board-focus/compact-text125.png).

The actual images were inspected for board prominence, hero/background separation, frame crop, text padding and control access. The earlier approved portrait reference remains unchanged at `variants/matharia/reference/approved/match3_equivalence-v2.png`; the latest user request deliberately replaces its crowded scenic composition.

## Changed source and assets

- `variants/matharia/src/screens/MatchScene.tsx` — compact guide/instruction presentation, measured text fitting and live round/XP/goal status.
- `variants/matharia/src/screens/match-scene.css` — one responsive vertical budget, larger aspect-correct board, slim frame/material layers, clear hero space and Match-only HUD hierarchy.
- `variants/matharia/presentation-transform.ts` — only Match's block changes; forwards original target/match state into the visible goal.
- `variants/matharia/src/compositions.ts` — only Match's background asset changes; portrait orientation is retained.
- `variants/matharia/assets/png/backgrounds/bg_match_mastery_quiet_v3@2x.webp` — new 852×1846 quiet courtyard, 216,866 bytes.
- `variants/matharia/assets/png/frames/match_board_slim_v4@2x.webp` — new 1354×1162 independent hollow frame, 118,426 bytes, aspect preserved.
- `variants/matharia/reference/match-focus-assets.json` — final saved paths, built-in image-generation prompts, refinement prompt, sources and alpha inspection.
- This handover, the appended `WORKLOG.md` entry, QA evidence/scripts under `qa-artifacts/match-board-focus`, and regenerated production/native public bundles.

Both new assets use the **built-in image_gen tool**. Whole-image RGB/RGBA WebP exports preserve composition and alpha; there are no painted patches, scenery covers, recolouring filters or stretched fragments. The frame opening has alpha 0–1/255, with 99.916% exactly zero and no opaque centre pixels. Its separate uniform teal board material is intentional UI backing under a hollow frame. All 30 independent original gems and the existing animated hero remain live layers.

The entire `src/games/FractionMatchGame.tsx` controller is unchanged by SHA-256, preserving value pools, answers, equivalent-value groups, board generation, six columns/five rows, legal adjacency, cascades/gravity, difficulty, 60-second round, lives, XP, win/failure rules and animation delays. Other adapters/compositions, shared hero renderer, audio engine and gameplay-session file pass preservation checks. No backend, account/purchase, dependency or unrelated source changes were added; existing unrelated working-tree work remains intact.

## Remaining production verification

Native iOS execution, real device safe areas, Dynamic Type, GPU/animation performance and audio routing still require a Mac/device pass. A signed macOS build and TestFlight upload remain outstanding; the installed TestFlight app has not been updated by this task. The production build retains the existing large-chunk warning. No unresolved failures remain in the scoped browser/build checks.

Assumptions: retain portrait, original equivalent-value rules and coloured versus colourless tiers; the board is the primary interaction and the hero is a clearly separated guide. Use the latest user feedback to simplify the older reference's scenery. No external legacy assumptions were used.
