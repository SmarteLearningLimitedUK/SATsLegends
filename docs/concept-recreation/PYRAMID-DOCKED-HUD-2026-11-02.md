# Problem Pyramid and explicit gameplay HUD docking

Started 2026-11-02; verification continued 2026-11-03. Source checkout: `D:/BrainZilla/GitHub/SATsLegends`, branch `codex/website-refinement-2026-10-28`. Existing work was preserved. No branch switch, commit, push, merge, publication or TestFlight upload.

Request: make the top HUD consistent across games, explicitly dock gameplay GUI, enlarge the pyramid and turn each puzzle into a multi-step question with multiple choices. References are the current repository and the supplied 589 x 1280 iPhone screenshot. The repeatable layout viewport is 393 x 852. No prior chat or external project was used as a design source.

Assumptions: portrait Pyramid gameplay, the existing temple background, original base-number ranges, six pyramids, the shared 90-second mission timer, original reward formula and per-pyramid star grading remain. Matharia enables the new three-step mode. The original website retains its single-step default. Other games' controllers and educational content are unchanged.

Rendering path: React + TypeScript, transformed by the Matharia Vite presentation adapter into `PyramidScene`. The native Swift/Capacitor host receives the web bundle; no SwiftUI gameplay renderer was substituted.

## Implemented presentation and interaction

The pyramid uses six independent transparent golden tablets with broad, blank teal faces and live numbers. The board's layout area is 1.98 times the previous area at 393 x 852; this compares layout bounds, not opaque-pixel coverage. Steps restore the left middle stone, the right middle stone and then the top stone. Each step presents four distinct choices, highlights its target and reveals the answer before advancing. Wrong answers retain the same step and show the relevant addition. Duplicate activation is guarded. Partial steps take 350 ms; completing a pyramid retains the existing 750 ms delay. The full-pyramid pulse lasts 600 ms, pauses with the game and is removed for reduced motion.

The guide remains in the shared portrait; the body character is removed from Pyramid so the enlarged board has space. Questions, counters, answers and feedback have explicit padded regions. Tablet art preserves its 4:3 aspect ratio and uses a measured 68% x 58% label window.

Gameplay HUD geometry has one owner: `variants/matharia/src/gameplayHudDock.ts` and `gameplay-hud-dock.css`. The top header and Pause have separate columns. Portrait header width follows the safe viewport up to 650 px, independent of the illustrated plane, so long iPad titles have room. The shared artwork slot accounts for the frame’s transparent vertical margins. The default footer touch wrapper fits its visible controls; custom bottom content keeps its full-width slot. The existing live green countdown strip is retained, with a low-time colour change. The footer uses the existing five independent sapphire-and-gold controls. Layout is relative to the game viewport, outside individual illustrated planes. The native stage already provides horizontal safe areas; applying them again was removed. The extra gameplay crest was removed to keep titles clear and the header consistent. Hub and Calm Grove HUD variants retain their existing rendering.

Eight existing playfields received CSS clearance adjustments for the common footer: Zombies, Takeout Rush, Angle Arena, Area Architect, Coordinates Quest, Share Splitter, Simplify Sprint and Ratio Racer. These are layout changes. Sprint feedback uses its existing upper-left message region. Ratio feedback sits in the status band between the racers and appears after the start countdown. The shared landscape stage no longer reapplies horizontal safe-area margins already supplied by the native viewport, so right-side panels remain on-screen. Takeout's actions stack beside its food choices; its five-item tier is checked separately at compact phone, iPhone 15 landscape and iPad dimensions.

The new tablet is `variants/matharia/assets/png/props/pyramid_stone_v4@2x.webp`: 1448 x 1086, transparent, 307,860 bytes. Metadata, alpha bounds, label window and SHA-256 are in `variants/matharia/reference/pyramid-stone-v4.json`. Its prompt is retained in `qa-artifacts/pyramid-docked-hud/stone-prompt.txt`. The image was inspected before integration. Only aspect-preserving WebP encoding was applied; no background patches, cover masks, flattened interactive screenshots or baked numbers were introduced.

## Evidence

- `qa-artifacts/pyramid-docked-hud/before-after.png`: actual running application before and after, at 393 x 852 with iPhone 15 safe areas simulated.
- `qa-artifacts/pyramid-docked-hud/three-steps.png`: all three linked questions in a real session.
- `qa-artifacts/pyramid-docked-hud/composition.json`: original and revised board bounds.
- `qa-artifacts/pyramid-docked-hud/game/checks.json`: functional and layout evidence for seven profiles, including every answer in six completed pyramids per profile.
- `qa-artifacts/pyramid-docked-hud/motion-checks.json`: real-time animation, pause, reduced-motion, keyboard, Tips and route-cleanup checks.
- `qa-artifacts/pyramid-docked-hud/hud/checks.json`: per-game common-HUD placement, safe-area containment, text containment, touch targets, centre-point hit tests and play-control clearance.
- `qa-artifacts/pyramid-docked-hud/feedback-checks.json`: six Sprint/Ratio cases covering 18 normal, incorrect and correct feedback states across compact phone, iPhone 15 landscape and iPad.
- `qa-artifacts/pyramid-docked-hud/hud-sheet-1.png` through `hud-sheet-6.png`: all 68 final header/footer pairs, manually inspected for consistent framing, visible text, square controls and centred icons. Final full Pyramid, Angle, Sprint and Ratio captures were also visually inspected.
- `qa-artifacts/pyramid-docked-hud/source-scope.json`: changed source hashes and twelve protected source/reference files confirmed unchanged.

The original screenshot is a defect reference, not an approved image of the new multi-step mechanic. The comparison is between two actual app captures. Screenshots were visually inspected; no numerical similarity score is used as acceptance evidence.

Superseded failure captures are archived under `qa-artifacts/pyramid-docked-hud/diagnostics/`; the final JSON reports determine the reported pass counts. Sprint/Ratio feedback state checks ran before the final shared horizontal stage-margin correction; final full-screen captures and all 68 safe-viewport checks include that correction.

## Device coverage

| Profile | Browser viewport | Safe areas: top / bottom / left / right | Exercise |
| --- | --- | --- | --- |
| Compact phone | 375 x 667 | 20 / 20 / 0 / 0 | Tier 5, explicitly enlarged question/counter/feedback text at 125% |
| iPhone 15 equivalent | 393 x 852 | 59 / 34 / 0 / 0 | Tier 1 |
| Large phone | 430 x 932 | 59 / 34 / 0 / 0 | Tier 2 |
| iPad equivalent | 768 x 1024 | 24 / 20 / 0 / 0 | Tier 3, one retained mistake and two-star result |
| Large iPad | 1024 x 1366 | 24 / 20 / 0 / 0 | Tier 5 |
| WebKit phone | 393 x 852 | 59 / 34 / 0 / 0 | Tier 4 |
| Practice | 393 x 852 | 59 / 34 / 0 / 0 | All three steps; practice feedback and completion |

Pyramid checks include four unique options per step; dependent reveals; correct and incorrect feedback; duplicate activation; pause/resume during feedback; lives failure and Retry; six completed pyramids; stars; results; return to island 6; no page errors; 44-pixel minimum controls; text containment; and no gameplay scrolling. All 126 correct answers across the seven profiles were independently calculated from the base numbers. Practice intentionally has no visible countdown, so its pause assertion checks state without assuming a timer element.

Final countdown-strip layout checks also passed all seven profiles (`layout-final-checks.json`). A large-phone cold import timed out while verification was concurrent; the same profile passed when checked serially. Native startup/performance remains unverified.

The mathematical check covers 2,000 independently constructed pyramids and 6,000 choice steps, including minimum/large values, deterministic unique options, reveal dependencies and preservation of the original single-step options. Both the Matharia build and original website build passed. The Matharia TypeScript check passed. Build warnings about existing chunk sizes / mixed Capacitor imports remain warnings.

<!-- final-check-status -->
Final browser verification passed: **7/7** complete Pyramid profiles (**126** independently calculated correct answers), **7/7** final layout profiles, **4/4** motion cases, **3/3** constrained-menu Takeout cases, **6/6** Sprint/Ratio feedback cases (**18** states), and **68/68** shared-HUD cases across **34 games**. The Matharia build, original website build, typecheck and mathematical checks passed. All **853** final build files match the Capacitor copy by SHA-256; the minimum remains **iOS 16.4**. Native/device execution and TestFlight remain unverified.
<!-- /final-check-status -->

## Shared-HUD screen checklist

Every row uses the shared React `UnifiedMiniGameHud` and its existing sapphire/gold artwork. Each route was opened in the actual app, its intro dismissed and live controls checked. P = portrait; L = landscape. This checklist certifies HUD placement, not every body/gameplay state.

| Game | Route | Orientation | Phone | iPad |
| --- | --- | --- | --- | --- |
| `place_value_panic` | `/game/1/5` | P | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-place_value_panic.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-place_value_panic.png) |
| `number_line_ninja` | `/game/1/6` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-number_line_ninja.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-number_line_ninja.png) |
| `prime_pop` | `/game/1/7` | P | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-prime_pop.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-prime_pop.png) |
| `rounding_rocket` | `/game/1/8` | P | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-rounding_rocket.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-rounding_rocket.png) |
| `maths_vs_zombies` | `/game/1/41` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-maths_vs_zombies.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-maths_vs_zombies.png) |
| `take_out_rush` | `/game/2/6` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-take_out_rush.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-take_out_rush.png) |
| `fraction_forge` | `/game/2/11` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-fraction_forge.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-fraction_forge.png) |
| `match3_equivalence` | `/game/2/16` | P | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-match3_equivalence.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-match3_equivalence.png) |
| `percent_power` | `/game/2/21` | P | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-percent_power.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-percent_power.png) |
| `simplify_sprint` | `/game/2/26` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-simplify_sprint.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-simplify_sprint.png) |
| `angle_arena` | `/game/3/8` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-angle_arena.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-angle_arena.png) |
| `polygon_palace` | `/game/3/13` | P | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-polygon_palace.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-polygon_palace.png) |
| `area_architect` | `/game/3/18` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-area_architect.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-area_architect.png) |
| `rotation_relay` | `/game/3/23` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-rotation_relay.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-rotation_relay.png) |
| `coordinates_quest` | `/game/3/28` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-coordinates_quest.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-coordinates_quest.png) |
| `conversion_canyon` | `/game/3/33` | P | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-conversion_canyon.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-conversion_canyon.png) |
| `perimeter_path` | `/game/3/38` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-perimeter_path.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-perimeter_path.png) |
| `mean_machine` | `/game/4/2` | P | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-mean_machine.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-mean_machine.png) |
| `graph_grabber` | `/game/4/14` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-graph_grabber.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-graph_grabber.png) |
| `line_graph_lab` | `/game/4/19` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-line_graph_lab.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-line_graph_lab.png) |
| `data_detective` | `/game/4/24` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-data_detective.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-data_detective.png) |
| `factor_frenzy` | `/game/5/2` | P | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-factor_frenzy.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-factor_frenzy.png) |
| `multiplication_mine` | `/game/5/15` | P | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-multiplication_mine.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-multiplication_mine.png) |
| `order_ops_arena` | `/game/5/20` | P | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-order_ops_arena.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-order_ops_arena.png) |
| `formula_forge` | `/game/5/25` | P | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-formula_forge.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-formula_forge.png) |
| `remainder_run` | `/game/5/30` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-remainder_run.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-remainder_run.png) |
| `time_keeper_cove` | `/game/6/1` | P | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-time_keeper_cove.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-time_keeper_cove.png) |
| `problem_pyramid` | `/game/6/2` | P | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-problem_pyramid.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-problem_pyramid.png) |
| `unit_mixer` | `/game/6/3` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-unit_mixer.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-unit_mixer.png) |
| `change_counter` | `/game/6/4` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-change_counter.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-change_counter.png) |
| `potion_panic` | `/game/7/2` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-potion_panic.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-potion_panic.png) |
| `share_splitter` | `/game/7/10` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-share_splitter.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-share_splitter.png) |
| `ratio_fractions` | `/game/7/15` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-ratio_fractions.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-ratio_fractions.png) |
| `scale_builder` | `/game/7/20` | L | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/phone-scale_builder.png) | [Pass](../../qa-artifacts/pyramid-docked-hud/hud/ipad-scale_builder.png) |

## Source changes

Modified existing source:

- `src/games/ProblemPyramidGame.tsx`
- `variants/matharia/presentation-transform.ts` (Pyramid binding only)
- `variants/matharia/src/UnifiedMiniGameHud.tsx`
- `variants/matharia/src/PauseControl.tsx`
- `variants/matharia/src/main.ts`
- `variants/matharia/src/screens/PyramidScene.tsx`
- `variants/matharia/src/screens/pyramid-scene.css`
- `variants/matharia/src/screens/zombies-scene.css`
- `variants/matharia/src/screens/takeout-scene.css`
- `variants/matharia/src/screens/angle-scene.css`
- `variants/matharia/src/screens/area-scene.css`
- `variants/matharia/src/screens/coordinates-scene.css`
- `variants/matharia/src/screens/share-scene.css`
- `variants/matharia/src/screens/sprint-scene.css`
- `variants/matharia/src/screens/race-scene.css`
- `variants/matharia/src/measured-game-shell.css`
- `variants/matharia/scripts/verify-pyramid.mjs`

Added: `src/games/pyramidPuzzle.ts`, `variants/matharia/src/gameplayHudDock.ts`, `variants/matharia/src/gameplay-hud-dock.css`, the tablet asset and its metadata. Documentation: this checklist and an appended `WORKLOG.md` entry. Repeatable QA scripts, logs, JSON and comparison images are in `qa-artifacts/pyramid-docked-hud/`. Capacitor web resources were regenerated from the final Matharia bundle.

## Production handover and limitations

This is browser verification of the actual React rendering path, including a Windows WebKit engine. It is not iOS simulator or physical iPhone/iPad verification. Native iOS execution, OS orientation changes, system Dynamic Type/VoiceOver, hardware haptics and installed-app performance still require a Mac/device pass. The 125% text check covers the specified gameplay text, not every iOS accessibility setting. The 34-game sweep verifies the shared HUD and visible control placement; it does not certify every other game's mechanics or all their states.

Before production, build/sign the native app on macOS, install it on representative iPhone/iPad devices and verify safe areas, orientation, accessibility and touch/audio behaviour. A new TestFlight upload is still required to put these changes on testers' devices. No purchase, authentication, save/progression or subscription integration was changed.

No external legacy assumptions were used.
