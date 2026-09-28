# Cartoon scenes and functional repairs

## Direction and assumptions

Use the current Barratt, Bran, Mochi and Vex sprites as the art references: bold dark outlines, chunky shapes, bright controlled colour and simple painted shading. Keep the current island themes and each minigame's setting. Backgrounds provide atmosphere and clear puzzle space; live characters, controls, questions and answers remain separate.

The 37 environment assets are saved in `src/assets/maps/premium/` as WebP files (7.65 MiB total). One environment is assigned to each current minigame blueprint and reused across that game's level variants. Existing character, kart, ingredient, plate and puzzle sprites remain in use. The original background files are preserved.

Factor Frenzy also receives a transparent cartoon construct in `src/assets/reskin/factor-sentinel.webp` (0.83 MiB). It replaces the unrelated opaque MEAN-machine placeholder in the existing Monster Mind playfield; its rules and encounter are unchanged. The original image remains available. Multiplication Mine uses the repository's existing rock/crack/rubble sprites instead of its incorrect rocket image.

Generation used the built-in image generation tool. The complete prompt set, output paths and four repository character references are in `docs/PREMIUM_BACKGROUND_PROMPTS.json`.
The construct edit prompt and source/style references are in `docs/PREMIUM_SPRITE_PROMPT.json`; its generated transparency is preserved.

## Functional changes

- Shared mission cards have explicit question and copy markers. Broad CSS rules that hid arbitrary top-positioned wrappers are replaced with explicit local HUD markers.
- Take-Out Rush now shows the actual order instruction and required item count above the playfield. Fraction Forge and Conversion Canyon use a readable shared mission card. Data Detective displays its case instruction instead of an empty question body.
- Remainder Run shows the actual dividend/divisor in its mission card and reserves separate space for the long-division board and answers. A visible generic instruction can no longer cover the mathematical problem.
- Chrono Dash puts its actual HH:MM target in the mission and names its hour/minute controls. Multiplication Mine places all four answers below its rock playfield and displays the existing damage states and strength pips. Area Architect reserves mission height so every shaded grid cell remains visible.
- Coordinates Quest numbers both axes and gives each tile an accessible coordinate name matching the existing validation. The existing 1–7 coordinate range and bottom-to-top y direction are preserved; phone targets use more of the available board width.
- Fraction Forge converts pointer/drop coordinates between the browser and scaled game stage so dragged pieces follow the pointer on desktop and tablet.
- Ratio Racer keeps its mission, full kart scene and four answers in normal flow. Separate placement and animation layers prevent the kart from being clipped. Correct answers move the kart and distance bar; wrong answers coach the player and preserve the question. Mathematically equivalent fractions are accepted, and each answer reports its result once.
- Share Splitter uses stage-local backdrop coordinates and measured drop targets, keeps a separate cake source visible, and supports drag, tap and keyboard allocation. Cancelled drags return safely, global drag listeners clean up on exit, inventory is bounded, repeated checks are guarded, solved rounds update the shared streak, and confetti respects reduced motion.
- The map replaces smoke, beams and orbit effects with restrained terrain lighting, motes and shoreline highlights. An exclusion mask protects all eight painted name plates throughout animation. Navigation, island positions and names are preserved.
- Scene metadata and direct minigame imports use the new art. Backdrop-only cover rules fill the established gameplay area without extending beneath the shared bottom dock.

## Screen-specific layout notes

The shared scaled stage, safe areas and HUD bounds are retained. The required order remains top HUD → question/mission → playfield → responses → bottom HUD.

The question repairs reserve space within the affected screens rather than changing the shared stage. Remainder Run explicitly puts its mission, division board and answers in separate flow rows to repair their overlap. Chrono Dash and Area Architect reserve mission height so the clock target and grid cannot sit underneath the card. Multiplication Mine moves its existing answers below the rock playfield to restore the mandatory order. Ratio Racer explicitly uses a flow layout for its mission, track and response cluster; this is scoped to racing. Share Splitter aligns its live plate anchors to the new illustrated tabletop and keeps the separate cake source visible; this is an artwork/input alignment repair confined to that game.

Coordinates Quest has an explicit screen-specific interaction exception: choosing a grid tile is the response, so its playfield and response controls share the existing coordinate board. The numbered axes and accessible names clarify that board without adding a separate answer panel or changing coordinate validation.

## Changed files in this pass

- `src/assets/maps/premium/*.webp`: 37 generated cartoon environments; exact filenames are listed in the prompt manifest.
- `src/assets/reskin/factor-sentinel.webp`, `src/games/FactorFrenzyGame.tsx`: transparent artwork for the existing Monster Mind.
- `src/gameSceneMeta.ts`, `src/design/legend-theme.css`: shared scene assignments and backdrop filling.
- Direct scenery imports in `src/games/AreaArchitectGame.tsx`, `ChangeCounterGame.tsx`, `ChronoDashGame.tsx`, `ConversionCanyonGame.tsx`, `DataDetectiveGame.tsx`, `FactorFrenzyGame.tsx`, `FormulaForgeGame.tsx`, `FractionForgeGame.tsx`, `GraphGrabberGame.tsx`, `LavaPathGame.tsx`, `LineGraphLabGame.tsx`, `MathsVsZombiesGame.tsx`, `MeanMachineGame.tsx`, `MultiplicationMineGame.tsx`, `NumberLineNinjaGame.tsx`, `PercentPowerGame.tsx`, `PerimeterPathGame.tsx`, `PlaceValuePanicGame.tsx`, `PolygonPalaceGame.tsx`, `PotionPanicGame.tsx`, `PrimePopGame.tsx`, `ProblemPyramidGame.tsx`, `RotationStationGame.tsx`, `RoundingRocketGame.tsx`, `ScaleBuilderGame.tsx`, `ShareSplitterGame.tsx`, `SimplifySprintGame.tsx`, `TakeOutRushGame.tsx`, `TreasurePathGame.tsx`.
- `src/components/game-ui/GameUiKit.tsx`, `src/index.css`, the four question-screen files above, `PercentPowerGame.tsx` and `SimplifySprintGame.tsx`: question visibility, flow and explicit local HUD ownership.
- `src/games/RemainderRunGame.tsx`: visible division question, board and response flow.
- `src/games/ChronoDashGame.tsx`, `src/games/MultiplicationMineGame.tsx`, `src/games/AreaArchitectGame.tsx`: visible targets, grid and answer repairs; existing rock damage sprites.
- `src/games/TreasurePathGame.tsx`: numbered coordinate axes, aligned tick labels and accessible grid responses.
- `src/games/RatioRacerGame.tsx`, `src/games/ratioFractionsRace/ratio-racer.css`: kart, scene and answer interaction repairs.
- `src/games/ShareSplitterGame.tsx`, `src/games/share-splitter.css`: stage-local artwork/input alignment and accessible slice allocation.
- `src/screens/WorldMap.tsx`, `src/components/world-map/MapAtmosphere.tsx`, `src/design/map-effects.css`: protected island labels and map atmosphere.
- `scripts/verify-legend-reskin.mjs`, `scripts/verify-legend-question-controls.mjs`, `scripts/verify-legend-racing.mjs`: visible question/artwork checks and actual interaction coverage.
- `scripts/verify-legend-sharing.mjs`, `scripts/verify-legend-sharing-lifecycle.mjs`: allocation, cancellation, shared outcomes, exit cleanup and reduced motion.
- `docs/CARTOON_SCENE_NOTES.md`, `docs/PREMIUM_BACKGROUND_PROMPTS.json`, `docs/PREMIUM_SPRITE_PROMPT.json`, `docs/MAP_EFFECTS_NOTES.md`: direction, generation prompts, scope and verification.

Only the current prompt and repository files informed this pass. No external legacy assumptions, new worlds, backend, analytics or boss systems were introduced. Concurrent `ios/` work was preserved.

## Validation

The target profiles are PC Chromium at 1440 × 900, iPad WebKit A2HS at 768 × 1024 and smartphone WebKit A2HS at 390 × 844. These are browser simulations; physical installed-device testing remains outstanding. QA artifacts and contact sheets are in ignored `qa-artifacts/legend-reskin/`.

### Completed checks — 28 September 2026

- Final `npm run lint`: passed (TypeScript).
- Final `npm run build`: passed in 12.85 seconds. Vite retains the existing main-chunk warning at 509.80 kB; unrelated bundle restructuring was not added.
- `git diff --check`: passed.
- Clean full visual pass: 52 gameplay variants (29 practice, 23 scored) and 10 menu/map screens per profile, 186 reviewed screens and 189 screenshots including welcome screens. All 37 current blueprint environments were checked against their actual rendered assets, including the Angle Arena canvas. All 444 rendered question text lines were hit-visible across the three profiles.
- No missing/obscured question copy, question/control overlap, clipped controls, document overflow, broken images, zero-size controls, or runtime/game-boundary errors in that clean pass.
- Seven-game interaction suite passed on all three profiles: Take-Out Rush and Conversion Canyon input/reset, Data Detective inspect/close, scaled Fraction Forge drag/drop/return, Remainder Run answer advance, four-hit Multiplication Mine progression to results, and Chrono Dash target setting/reset.
- Racing passed on all three profiles through full completion, including equivalent fractions, recoverable wrong answers, visible kart/progress and exactly one shared outcome per answer.
- Share Splitter passed on all three profiles through five-round completion with actual drag, native touch, keyboard Enter/Space allocation, wrong-check retry, bounded inventory, reset, exact shared streak, cancellation, reduced-motion/no-confetti and live navigation cleanup. All five temporary drag listeners were removed on exit.
- Map effect checks: 84 passed. Area Architect grid checks: 30 passed. Coordinates Quest axis/selection checks: 27 passed. These cover all three profiles and actual keyboard/touch interaction where applicable.
- Fresh agent-browser map and racing checks passed with no browser errors; a correct racing answer visibly advanced distance from 0% to 9%.

The first complete sweep was interrupted on two routes by a documentation edit triggering Vite's development-page reload at 17:21:50. Both interrupted routes passed six fresh device-profile reruns, followed by the clean complete 186-screen pass with edits held. The interrupted report is preserved separately as `report-interrupted.json`; no game-code change was needed for those interruptions.

The required gameplay hierarchy, scoped interaction exceptions, background/bottom-dock boundary and device-fit checks were applied across PC, iPad A2HS and smartphone A2HS simulations. Physical installed-device testing and full-round balancing of every one of the 92 current missions remain unverified. No external legacy assumptions were used.

## Racing course scrolling follow-up

Each correct answer now drives the illustrated course left past the kart during the existing boost, giving the impression of forward racing. Three repeated panorama tiles cover the clipped playfield throughout movement and transform wrapping. A narrow 5% overlap blends each tile edge; the camera wraps within the repeated section to preserve that blend. The mission, answer cluster and shared HUDs stay stationary, and scenery stops at the exact target distance before another question unlocks. Incorrect answers leave the course in place. Reduced-motion preferences keep the illustrated course still while race distance updates.

This follow-up reuses the current kart and race tuning. A dedicated horizontally repeating cartoon panorama replaces the moving playfield art: `src/assets/maps/premium/ratio-racer-course.webp`. It keeps the existing castle, woodland and teal/gold track theme, with level road bands and no foreground rocks interrupting the tile join. The original static environment remains available. The built-in image generation tool used the current kart and background as style references; the final prompt and output are recorded in `docs/RACING_COURSE_PROMPT.json`.

Changed files are `src/games/RatioRacerGame.tsx`, `src/games/ratioFractionsRace/ratio-racer.css`, `src/assets/maps/premium/ratio-racer-course.webp`, `scripts/verify-legend-racing.mjs`, `docs/RACING_COURSE_PROMPT.json` and this note. No layout exception or external legacy assumption was introduced. Targeted motion and device-fit verification covers PC Chromium, iPad WebKit A2HS and smartphone WebKit A2HS, including reduced motion, full completion, tile coverage and stationary question/answer/HUD bounds. Results are recorded in `qa-artifacts/legend-reskin/racing-interactions.json`.

Final follow-up checks passed on 28 September 2026:

- `npm run lint`, `npm run build` and `git diff --check` passed. The existing main-chunk warning remains at 509.80 kB.
- All six browser profiles passed full races: PC, iPad A2HS and smartphone A2HS, each in normal and reduced motion. Each race completed 11 correct answers and recoverable wrong retries before and after movement, with equivalent fractions, all three question tiers and shared streak updates checked.
- Across 1,533 sampled boost frames, rendered tile rectangles and opaque mask intervals fully covered the scene. Each normal race wrapped five times and travelled 9.473684 viewport widths; reduced-motion scenery stayed fixed with zero wraps.
- The required HUD → mission → playfield → responses → bottom HUD hierarchy held. Same-question HUD, mission, scene, answers and dock bounds stayed within 1 px during boosts; every reading pause and wrong-answer turn kept scenery stationary. No runtime errors were reported.

Assumptions: retain the existing side-view kart, race distance, boost timing and scoring; scroll the course inside its playfield while keeping reading and navigation controls steady. These checks use browser simulations, not physical installed devices. No external legacy assumptions were used.
