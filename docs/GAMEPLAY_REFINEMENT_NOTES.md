# Gameplay framing, interaction and difficulty refinement

## Task before editing

- Show complete game environments, including shop counter/characters, and make gameplay text clear and consistent across browser, iPad and phone layouts.
- Replace Lava Path's plain line with a dangerous-looking crossing; make Perimeter Path edges selectable with a persistent colour and non-colour confirmation of consideration.
- Reduce Conversion Canyon's scale, upgrade Multiplication Mine's rock and setting, replace Percent Power's orb with a powered reactor, and separate Chrono Dash's clock from the scenery.
- Provide practice plus five scored difficulty levels per mini-game, with a consistent arc and gentler first levels for Remainder Run and Maths vs Zombies; number early graphs completely.
- Use one coherent cartoon enemy art direction and shared animation/reaction behavior while retaining distinct characters and the earlier functional repairs.

## Exact inspection files

- `src/App.tsx`, `src/constants.ts`, `src/types.ts`, `src/app/AppRouter.tsx`, `src/app/gameplaySessionContract.ts`, `src/app/useGameplaySession.ts`, `src/app/testingFlags.ts`
- `src/app/useScreenFlow.ts`, `src/systems/content/gameDifficulty.ts`; proposed shared contained-image helper `src/components/SceneEnvironment.tsx`
- `src/screens/IslandLevels.tsx`, `src/utils/gameNames.ts`, `src/systems/content/island1NumberBaseCamp.ts`, `src/systems/content/islandBlueprint.ts`, `src/systems/content/satsInspiredQuestionBanks.ts`
- `src/components/game-ui/GameUiKit.tsx`, `src/components/game-ui/GameScreenLayout.tsx`, `src/components/GameplaySceneBackdrop.tsx`, `src/layout/ScreenPrimitives.tsx`, `src/components/UnifiedMiniGameHud.tsx`, `src/design/legend-theme.css`, `src/index.css`, `src/gameSceneMeta.ts`
- `src/games/LavaPathGame.tsx`, `src/games/PerimeterPathGame.tsx`, `src/games/ConversionCanyonGame.tsx`, `src/games/PercentPowerGame.tsx`, `src/games/ChronoDashGame.tsx`
- `src/games/MultiplicationMineGame.tsx`, `src/games/RemainderRunGame.tsx`, `src/games/MathsVsZombiesGame.tsx`
- `src/games/ChangeCounterGame.tsx`, `src/games/monster-market.css`, `src/games/TakeOutRushGame.tsx`, `src/games/take-out-rush.css`, `src/games/RatioRacerGame.tsx`, `src/games/ratioFractionsRace/ratio-racer.css`, `src/components/FoodGameShell.tsx`, `src/components/food-game-shell.css`
- `src/games/GraphGrabberGame.tsx`, `src/games/LineGraphLabGame.tsx`, `src/games/CoordinatesQuestGame.tsx`, `src/games/CoordinateTranslationGame.tsx`, their active shared implementation `src/games/TreasurePathGame.tsx`, `src/games/DataDetectiveGame.tsx`, `src/games/MeanMachineGame.tsx`, `src/games/MedianMountainGame.tsx`
- `src/games/RoundingRocketGame.tsx`, `src/games/FractionForgeGame.tsx`, `src/games/SimplifySprintGame.tsx`, `src/games/PolygonPalaceGame.tsx`, `src/games/RotationStationGame.tsx`, `src/games/AreaArchitectGame.tsx`, `src/games/ScaleBuilderGame.tsx`, `src/games/ShareSplitterGame.tsx`, `src/games/ProblemPyramidGame.tsx`, `src/games/PotionPanicGame.tsx`, `src/games/FractionMatchGame.tsx`, `src/games/PrimePopGame.tsx`, `src/games/FormulaForgeGame.tsx` for the five-tier generator audit, preserving existing controls/scoring/round structure and using current question types
- `src/components/game-ui/MonsterMindActor.tsx`, `src/components/game-ui/monster-mind-actor.css`, `src/utils/staticEnemyFrame.ts`, `src/components/BossPortrait.tsx`, `src/games/BossEncounterGame.tsx`, `src/games/NumberLineNinjaGame.tsx`, `src/games/PlaceValuePanicGame.tsx`, `src/games/FactorFrenzyGame.tsx`, `src/games/OrderOpsArenaGame.tsx`, `src/assets/characters/index.ts`
- `src/games/AngleArenaGame.tsx` for its current canvas enemy consumer
- Current game/environment/enemy assets referenced by those files; remaining active game generators through the existing registry for the difficulty audit.
- `docs/EXPERIENCE_SPEC.md`, `docs/BUILD_SPEC.md`, `AGENTS.md`, `scripts/verify-legend-expanded-experience.mjs`, `scripts/verify-legend-monster-motion.mjs`

## Assumptions and boundaries

- Continue the current young-teen cartoon direction (approximately ages 11–14), using comic peril rather than gore or realistic violence.
- Five levels means five scored levels after a separate practice entry for ordinary mini-games. Existing fixed SATs paper encounters remain their current papers; no new boss system is introduced.
- Difficulty must be the game's own level/tier, not its numerical position in an island. Route IDs and progress identifiers must not accidentally determine question complexity.
- Preserve usable existing saved progress and actual reporting/session contracts; do not delete history to simplify the new level structure.
- Complete-background framing is explicit user authorization for scoped composition changes. Preserve asset proportions, keep interactive foreground elements readable, and stop artwork at the shared bottom HUD. Any wide-screen or short-screen exceptions must be recorded.
- Perimeter selection is a reading aid, not a new punitive gate: show checked segments with colour plus a visible/accessible state.
- Use current characters and assets as the art reference. Generated replacements are explicitly requested; keep production assets inside this workspace and record prompts.
- Keep the required top HUD → mission/question → interaction/playfield → answers/responses → bottom HUD order and tight matched answer clusters. Verify PC, iPad A2HS and smartphone A2HS simulations with normal/reduced motion.
- No external legacy assumptions, backend, analytics, unrelated systems, new pizza references or new boss systems are used.

## Verification transition

The earlier expanded QA partitions were stopped and every owned browser/runner process was closed before this source pass. Saved passing rows retain their provenance. The pending Market follow-up failure was a multi-call test read spanning two coherent receipt commits; its strict arithmetic checks need an atomic snapshot/readiness repair before rerunning. Earlier results are not represented as verification of newly edited screens or level generation.

## Implemented refinement

- Ordinary campaign groups have exactly one practice and five scored tiers (34 groups, 204 entries). The existing three SATs paper encounters remain, giving207 campaign entries. Generators receive their game's selected tier1–5, never the island's route number. Tier bands stay fixed during a run. Saved history, old-route aliases and completion credit are preserved; practice is optional for sequential unlocks. The repository's existing `UNLOCK_ALL_LEVELS` testing override is preserved and explicitly disabled in unlock fixtures.
- Remainder's first tier uses small dividends and remainders0–1. Zombies starts with one active enemy and sums to10; practice is stationary and untimed. Later tiers add magnitude, steps and pressure. All active generators were inspected as a set. Early bar/line graphs label every integer; coordinate grids are numbered and keep generated targets inside the grid.
- The shared `SceneEnvironment` preserves proportions with contain framing. Restaurant and checkout use new complete2:1 wide compositions on the existing wide breakpoint; narrower screens use the full portrait compositions. Angle's canvas independently contains its scenery without changing flight physics. Artwork stops at the shared dock. Ratio Racer's static paddock contains its full composition; its deliberately travelling, repeated course panoramas fill the camera window so a correct answer can scroll the track without gaps. That moving-camera plane is the scoped exception to whole-static-image containment.
- Lava Path uses cracked floating stepping stones, hot fissures, falling debris, physical hero hops and mistake tremors. Perimeter has native44px edge controls with persistent line colour, check marks and `aria-pressed`, supports keyboard selection, and permits answering without tracing. Each drawn segment also accepts a direct pointer selection through a transparent12px supplementary hit stroke; the44px labelled buttons provide the same action for touch/keyboard accessibility. Decorative SVG layers ignore pointer input; independent CSS translation preserves button anchoring during shared hover/press transforms.
- Conversion's scale is bounded and smaller, with a readable load meter and removable weights. Percent Power uses a segmented physical reactor with pipes, charging liquid and vent reactions. Chrono has an opaque, outlined face with60ticks,12clear numbers and separate hour/minute controls. Mine has a substantial, four-stage cyan-ore boulder with impact chips, cracks and a crystal reveal.
- Five distinct enemies follow the current Barratt/Mochi outlined cartoon direction and reuse the stable, single-image actor for breathing, sway, damage, taunts and reduced motion. The same identity survives each reaction. Angle retains its existing offscreen preflight world target, velocity and camera-follow behavior. Its slow-frame collision repair checks the travelled segment so a correct shot cannot jump through the target between painted frames.
- Critical labels use14px, body16px and missions/answers18px floors compensated for stage scale. Remaining small receipt, restaurant, race and Number Stones labels use these variables. Shared skinned buttons preserve at least44physical pixels despite older logical48px rules. Ordinary gameplay retains its logical stage height; removing a second `100dvh` cap recovers unused space in short browser windows without widening or reordering fixed-coordinate games.

## Scoped layout exceptions

The mandatory top HUD → mission → playfield → tight responses → bottom HUD order remains. The earlier restaurant/shop/race wide exceptions remain limited to viewport width≥700 and height≥600, and short-wide restaurant/receipt compositions remain local. Parent Snapshot and wellbeing continue to use the actual viewport. The stage-height correction applies to gameplay within the existing scaled stage, leaving those actual-viewport surfaces unchanged. Formula Forge's local hint/diagram/answers require a compact, flow-based composition after readable label floors; this exception is limited to that screen.

## Formula Forge follow-up scope

- Repair only `src/games/FormulaForgeGame.tsx`: reserve the mission's height, give the diagram flexible space, and place the readable rune hint before a fixed-size four-answer cluster.
- Inspect that component, the current `GameQuestionCard`/`GameScreenShell` contracts, shared typography/control floors, and `qa-artifacts/gameplay-refinements/short-frame-pilot.json` with its Formula screenshot. Keep the existing five-tier generators, six-question first tier, XP formula and star criteria.
- Pass the resolved score, correct count and lives into final completion; the six first-tier correct answers must save912 XP. Keep the existing520ms feedback interval and cancel pending work on exit so the last shared answer can settle before the result.
- Assumptions: the current scaled stage and shared HUD own the screen's bounds; questions remain18px and answer controls at least44physical pixels. No external legacy assumptions, new assets or shared CSS changes are used. Browser verification waits for the coordinated source freeze.

## Art provenance

Exact source references, prompts, generated output paths and optimized production paths are recorded in `docs/GAMEPLAY_REFINEMENT_ART_PROMPTS.json` (wide restaurant/shop) and `docs/ENEMY_MINE_REFINEMENT_PROMPTS.json` (five enemies/four ore states). Earlier venue/course and six wellbeing images retain their prompts in `docs/TEEN_ART_PROMPTS.json`. All runtime artwork is stored in the repository.

## Final device-fit repair scope

- Inspect `src/games/PotionPanicGame.tsx`, `src/components/game-ui/GameUiKit.tsx`, `src/index.css`, `src/design/legend-theme.css` and the stable short-PC screenshot/report. Limit Potion's existing mission wrapper to its own playfield width instead of viewport units; preserve its text, ingredients, controls and curriculum.
- Inspect `src/games/game-refinements.css`, `src/games/ConversionCanyonGame.tsx` and the atomic iPad frame measurements. Retain the scale's existing 86% relative width cap in its larger-screen media rule, alongside the 350px and height caps.
- Retain the Percent Power timer repair: score observation synchronizes only the score ref; tier reset and exit own cancellation. Cancelling timers on every score update had prevented the next round and final result.
- All verification contexts were closed before production edits. Assumptions: existing stage/HUD bounds remain authoritative; these are local width corrections with no re-stack, scoring change or outside dependencies. No external legacy assumptions are used.

Initial pilots are retained as diagnostic records. The consolidated passing reports below name their actual source reports instead of treating a later run as evidence for earlier edits.

## Final pending-result and dense-question repair scope

- Inspect `src/games/NumberLineNinjaGame.tsx`, the current presence handling in `src/games/MultiplicationMineGame.tsx`, `src/app/gameplaySessionContract.ts` and the native final-Back diagnostic. Cancel Ninja's queued advance, hit recovery and pending result when navigation starts; guard callbacks/input with the current presence state. Preserve its 760ms minimum feedback, measured flight landing, scoring, actor and layout.
- Inspect `src/games/FormulaForgeGame.tsx`, `src/components/game-ui/GameUiKit.tsx`, shared typography/HUD bounds and `qa-artifacts/gameplay-refinements/complex-tier5-fit.json`. The longest naturally generated missing-cuboid question leaves a 29px-high diagram in a short PC window. Reclaim only that component's redundant short-window padding so the mission, useful diagram, readable hint and matched answers all fit; keep the existing six-to-eight questions, tiers, point formula and completion behavior.
- All owned browser contexts are closed before these edits. Assumptions: retained exit animation is already present in the repository; the local Formula compact composition is explicitly justified by the request to use available space and readable text. No shared re-stack, new art, new systems or external legacy assumptions are used.

## Angle Arena slow-frame repair scope

- Inspect `src/games/AngleArenaGame.tsx`, `src/games/NumberLineNinjaGame.tsx`, `src/app/gameplaySessionContract.ts` and the native Angle diagnostic. A trusted correct answer misses under a measured slow-frame replay because collision checks only the projectile's new position. Check the travelled segment against the existing target radius, preserving its velocity, question deck, selected-answer gate and scoring.
- Keep the existing 360ms aim, 680ms settle and 900ms advance timings. Add local presence/once/advance protection only if the native exit or manual-advance diagnostic demonstrates a defect; do not broaden this into a pause or timer redesign.
- All game-verification contexts are closed before production edits. Recheck Angle on PC, iPad A2HS and phone A2HS with both motion preferences, including slow-frame shots and final-result boundaries. Assumptions: the repository's current flight and retained exit architecture remain authoritative; no layout re-stack, new art, external legacy assumptions or unrelated website edits are included.

The concurrently active website task is changing `index.html`, `src/main.tsx`, `src/app/routeConfig.ts` and `src/website/`. These changes are preserved and excluded from this task's changed-file list. QA uses its new `/play` game entry where necessary. A temporarily unresolved `website.css` import blocked one browser diagnostic while the stylesheet was being created; the import is now resolved and was not an Angle Arena failure.

## Angle final-result and question correction scope

- Inspect `src/games/AngleArenaGame.tsx`, `src/games/NumberLineNinjaGame.tsx`, `src/app/gameplaySessionContract.ts` and `qa-artifacts/gameplay-refinements/monster-current/angle-diagnostic/pc-angle-native-before-presence.json`. The native final Back occurs 803ms after the final hit, exit begins at 809ms and unmount occurs at 1149ms. The old 900ms advance saves a result during that retained exit. Cancel owned work when presence ends and guard delayed callbacks, input and terminal delivery with the current presence state.
- Keep final delivery and a round's advance owned once, and clear pending automatic advance before a manual Next/reset. Preserve all existing scoring, six-question decks, 360/680/900ms delays, flight velocity, camera and layout. The manual-versus-automatic check is preventative verification; no duplicate manual completion was reproduced.
- Inspect `src/games/angleArena/questions.ts` and its current `math.ts`. Correct only the observed Tier3 answer for the smaller angle in a 2:7 straight-line ratio from 20° to 40° (180÷9×2). The existing option generator then includes 40°. Audit all five actual decks against independently solved visible prompts and retain their order, types and difficulty bands.
- All owned verification contexts are closed before these source edits. Assumptions: use the repository's existing retained exit and session contracts; no pause redesign, new art, layout changes, external legacy assumptions or edits to the concurrent website task are included.

## Live map label readability follow-up scope

- Inspect `src/screens/WorldMap.tsx`, `src/components/world-map/MapAtmosphere.tsx`, `src/design/map-effects.css`, the supplied stage scale in `src/App.tsx`, current `src/constants.ts` and the explicitly viewed `src/assets/maps/mapselect.png`. The full map is intentionally a scrollable 768×2500 logical poster; its small baked names are not readable enough in the scaled browser frame. Add opaque live name plates with at least 14 physical pixels, using the existing plate coordinates and current island names.
- Preserve all eight hotspot IDs, terrain positions, unlock/progress values, recommended destination and routes. Direct inspection confirms Core of Calculation is ID8 and Ratio Racer is ID7; the earlier suspicion of swapped IDs came from misreading array order and is rejected. The poster's old "Ratio Rapids" lettering is covered by the current canonical "Ratio Racer" label.
- Keep the poster, scrolling, image proportions and map width. Reuse the existing plate geometry for live labels and the decorative mask, with no raster editing or new gameplay system. Apply readable floors to the map's guidance/details and at least 44 physical pixels to their controls. If a detail card needs its existing width cap compensated for stage scaling, limit that exception to the map card so its readable copy fits within the current viewport; do not widen or re-stack gameplay.
- All earlier verification contexts are closed. Verify native scrolling, all eight live labels, selection/details and matching island routes in PC, short PC, iPad A2HS and phone A2HS, with both motion preferences. Exact production scope is the three map files above; the new QA helper is `scripts/verify-world-map-labels.mjs`. Assumptions: current repository IDs/names and the viewed poster geometry are authoritative; no external legacy assumptions, new artwork or unrelated website edits are used.

## Map nameplate hit-area repair scope

- Inspect `src/design/map-effects.css`, the existing button/span ownership in `src/screens/WorldMap.tsx`, inherited skins in `src/index.css`, `scripts/verify-world-map-labels.mjs` and `qa-artifacts/gameplay-refinements/world-map-final/root-short-target-diagnostic.json`. Native Tab navigation in the short PC window reveals the Arithmetic plate ending at 578.17 physical pixels while its original terrain button ends at 572.57. The span's `pointer-events: none` leaves its overhanging lower edge without the owning button as a hit target.
- Limit the production repair to the nameplate's pointer events in the existing map CSS. Let the entire visible span receive input and bubble to its existing native button; preserve the eight terrain rectangles, IDs, routes, progress, label geometry, keyboard focus and decorative mask. This adds no separate control or focus stop.
- The focused short-PC diagnostic in `world-map-final/target-diagnostic/report.json` also measures the guidance action at 95.13×35.55 physical pixels. Its inherited skin has an `!important` logical minimum height that overrides the local compensated floor. Give only the map guidance/Explore selectors the required compensated minimum with matching priority; keep the shared skins and HUD untouched.
- Close the focused diagnostic browser before the source change, then verify all eight labels and matching destinations in the eight planned profile/motion combinations. Assumptions: the current button's native bubbling is authoritative, and the visible nameplate should be fully interactive. No gameplay, shared HUD, artwork, website or external legacy assumptions are included.

## Map focus measurement correction scope

- Inspect only `scripts/verify-world-map-labels.mjs`, the unchanged focus declarations in `src/design/map-effects.css` and `qa-artifacts/gameplay-refinements/world-map-final/pc-short-map-final.json`. The first PC diagnostic proves full native panning and opaque nameplate coverage/near-edge hit ownership, then rejects a visible solid gold focus ring because the helper introduced a two-physical-pixel threshold. Chrome resolves the outline to two CSS pixels before the stage transform, producing 1.809 physical pixels.
- Correct only that QA assertion to check a nonzero solid gold inset focus ring and record its CSS/physical dimensions and appearance evidence. The task specifies a visible focus cue, not a two-physical-pixel outline rule. Keep all production files frozen and all typography, 44px control, clipping, near-edge hit, artwork coverage, mask and routing checks unchanged.
- Close both diagnostic partitions before editing the helper. Preserve their failed reports/screenshots and use separate verified report names for the rerun. Assumptions: CSS outline quantization is measured in the current browser; no assertion about general accessibility certification, external legacy behavior or unrelated production changes is added.

## Map rendered-text measurement scope

- Inspect only `scripts/verify-world-map-labels.mjs`, the unchanged map typography in `src/design/map-effects.css`, the PC/iPad reports and screenshots in `world-map-final/verified/`, and the separate actual-ink diagnostic. Both browser failures compare Baloo2's nominal text Range to an overflow-visible heading's own line box. The visible titles are clear inside their cards; PC measures 18px type with the Range 3.62px above/2.83px below its own line box, and iPad measures 18.52px type with a 3.30px nominal overhang.
- Correct only the QA geometry measurement after verifying painted-ink bounds and real clipping ancestors. Preserve horizontal text containment, complete nameplate coverage, all 14/16/18px typography floors, 44px control targets, native near-edge hit ownership, focus, masks and routes. Keep production typography and layout frozen; a nominal font strut extending outside an overflow-visible line box is not itself evidence of clipped ink.
- If the optional 148px nameplate design-width assertion encounters the independently measured 147.9885px short-PC value, account only for the less-than-one-layout-subpixel quantization in that design-width check. Do not change the required 44px control or text floors. Close both diagnostics before helper edits, preserve their reports/screenshots, and write the passing rerun to a separate final verification directory. Assumptions: use actual current-browser measurements, no external legacy behavior or general accessibility-certification claim.

## Map detail-entry readiness scope

- Inspect only `scripts/verify-world-map-labels.mjs`, the unchanged 220ms detail-entry animation in `src/design/legend-theme.css`/`src/design/map-effects.css`, and `world-map-final/verified-final/mobile-map-verified.json`. The first iPad run captures the Arithmetic detail title with effective opacity0 after a fixed 300ms delay; all desktop/short-desktop rows already pass every island and both motion modes. Distinguish a measurement during CSS entry from a persistent invisible title with a bounded native-entry opacity/animation diagnostic.
- If the card naturally settles fully visible, replace only the QA's fixed entry delay with a bounded wait for the selected card and its ancestors to finish entering before the existing typography/hit/clipping checks, including reopening it. Preserve every required assertion and all production files. If it does not naturally become visible within the bound, retain the real failure for a source repair; do not disable animation or lower the opacity requirement.
- All previous map contexts are closed before the helper edit. Keep the four passing desktop rows and their original helper/source fingerprints as evidence; any mobile rerun records its actual newer helper hash separately, with unchanged runtime dependencies. Preserve the failed mobile report and write the new run to a separate output directory. Assumptions: the current detail-entry animation is intentional, and verification must measure a settled card without forcing DOM/CSS state. No external legacy assumptions or unrelated changes are used.

## Completed validation

- `npm run build` and `npm run lint` (`tsc --noEmit`) pass after the final map, Angle collision/presence and question repairs, including the concurrently added website entry point. The latest shared build completes in 8.98 seconds, with its log saved in `qa-artifacts/gameplay-refinements/final-build.log`. The website task owns its entry and chunk composition; those changes are outside this game pass. `git diff --check`, QA script syntax checks and all three art-manifest JSON parses pass.
- All 34 ordinary games pass rendered fit checks in four environments: PC 1440×900, short PC 1264×625, iPad WebKit A2HS 768×1024 and phone WebKit A2HS 390×844. The 136 unique normal-motion rows check the mandatory HUD/mission/playfield/responses/dock bounds, complete contained static scenery, native input visibility, essential text floors and dock targets. `qa-artifacts/gameplay-refinements/final-fit-report.json` includes exact per-row provenance and SHA-256 fingerprints of the changed runtime files. All four Angle rows were replaced after its final source repair; 96 previously fingerprinted runtime dependencies remain unchanged, and its added question-bank dependency has the separate content proof below.
- Eight additional dense Tier5 checks pass: four-ingredient Potion recipes and naturally generated missing-cuboid Formula questions on all four environments. Formula's short-PC diagram increases from 29px to 79px while its mission remains 18px and the response targets remain at least 44px. The same report retains these eight rows separately from the 136 first-tier rows.
- All 30 native interaction combinations for Lava, Perimeter, Conversion, Reactor and Chrono pass (three profiles, normal/reduced motion). The aggregate is `qa-artifacts/gameplay-interactions/interactions-all30-current.json`, with exact source report/row provenance. It covers literal Perimeter segments and labelled controls at tiers1/4/5, keyboard toggling and an ungated answer; Lava hops and mistake danger; removable scale loads and independent balance; full Reactor completion/score/accuracy/one Parent save; and all clock labels, native hand controls and Help pause/resume.
- The venue, calm-break and Parent flow matrix passes all 120 unique cases (20 normal/20 reduced-motion cases per target profile). `qa-artifacts/gameplay-refinements/expanded-flows/report.json` records 82 current-phase rows and 38 retained rows whose actual dependencies did not change, with exact report hashes, row indices and retention reasons. It covers restaurant orders/shift pause and completion, shop receipts, correct-answer racing travel, six calm activities and rewards/exit cancellation, optional microphone recovery, empty/populated Parent scrolling and Formula completion. Every owned expanded runner/context is closed; no page errors or failed requests were recorded. The final seven phone rows also record the concurrent website entry revision separately.
- Actual-source difficulty verification passes 24 properties across all 207 routes, unlock/progress aliases and the sampled generators named in `qa-artifacts/five-tier-difficulty/report.json`. Independent selected-tier generator checks for the physical games/venue receipts are in `qa-artifacts/legend-gameplay-refinement/generator-checks.json`. The ad-hoc enemy-helper audit is summarized in the art manifest but has no persisted command/output artifact; it is not included in the artifact-backed property count. Mine and Angle rely on the separately recorded native current-game checks rather than a claim that the 24-property report covers them.
- Angle's separately saved independent prompt oracle passes all 30 scored questions plus six practice instances in `qa-artifacts/gameplay-refinements/angle-question-properties.json`: the mathematically solved visible prompt is correct and present among four unique choices, each deck has six questions at its selected band, and all targets are finite. The Tier3 2:7 correction is included. This is separate from the 24-property report's generator scope.
- Ninja's reproduced final-Back defect is repaired and tested in both motion modes: trusted Back occurs before the 760ms deadline, the component stays mounted during its exit across that deadline, and no result, saved completion, Parent session, XP or stars arrive after leaving. Ordinary scored completions, exact scores, flight landing and mid-hit exits also pass. Original failure and final proof remain in `qa-artifacts/gameplay-refinements/monster-current/pc-boundary/pc-ninja-boundary.json` and `pc-ninja-final/pc-ninja-boundary-final.json`.
- The final coherent-enemy/mine/encounter matrix passes all 141 unique current keys: 24 normal and 23 reduced-motion checks per PC/iPad/phone profile. `qa-artifacts/gameplay-refinements/monster-current/current-verified-all-profiles.json` retains exact report hashes/row indices, per-key dependency audits and retention reasons. Bootstrap and repeated route-audit rows are deduplicated. The source hashes are explicit current snapshots, not retroactively claimed fingerprints of older browser runs. This matrix verifies readable five-tier Number Stones/Ninja layouts, native tap/drag, stable enemy identity and reactions, full scored completions, the four-stage ore and existing fixed-paper encounters.
- Angle's reproduced final-Back defect is repaired: all six native Back proofs begin before the existing 900ms advance, keep the outgoing component mounted across that deadline, and produce no delayed result or completion save. All 12 automatic/manual-final-Next proofs save exactly once at 1500 points, 100% accuracy and three stars, with one Parent completion. The original late-save failure is retained in `monster-current/angle-diagnostic/pc-angle-native-before-presence.json`; exact final timelines are in the consolidated matrix.
- `qa-artifacts/gameplay-refinements/monster-current/angle-flight-verified.json` passes all six strict frame cases (three profiles, both motion preferences): 36 trusted correct shots hit, comprising 18 at natural cadence and 18 with an explicitly labelled 250ms QA-only RAF delay. Actual painted projectile frames include target crossings that the former endpoint-only check skipped. Final source fingerprints are Angle `94f7ae32e43bb49ec109d7eda81aa6bf335acdc7e96e3da607e95d23a09f8df7` and question bank `80b6254487e72261e9ca248d0280493b53a3a5848935f2db2b2cb92e8c64d1f5`.

- Final map verification passes all eight environment/motion combinations: PC, short PC, iPad A2HS and phone A2HS, each in normal and reduced motion. All 64 canonical island checks include native label selection, close/reopen, Explore to the correct island ID and Back, five-point near-edge ownership, complete opaque coverage of baked lettering, actual text-ink containment, gold keyboard focus, separately masked effects and full native poster scrolling with a stationary window. Label/action text, body and titles retain their 14/16/18 physical-pixel floors and controls retain the 44px floor, with only the existing less-than-.01px layout rounding. Normal effects move; reduced-motion effects remain static. Root visually reviewed short-PC, iPad and phone screenshots. Reports record no page/console errors, failed requests or source changes, and all eight contexts/four browsers and their runners are closed. The aggregate is `qa-artifacts/gameplay-refinements/world-map-final/final-map-verification.json`.
- The map aggregate preserves the four desktop rows as run under helper `5b0eac21020fc5297f4b8582bf05bc87df42f67fa08d29e2661d3b4779b31ec9`, and records four fresh mobile rows under `f9740dab4db15cc6d947b09269fd6ed0b63b15ad8261a8fc30ae8265cdacf638`, with immutable report hashes and row indices. All ten runtime dependencies are identical and current. The helper-only update waits for natural detail entry rather than sampling at a fixed300ms: the native software-WebKit diagnostic shows opacity0 at333ms and full opacity by986ms, stable at5s, without forcing CSS state. Failed diagnostic reports remain separate. The final read-only retention audit, `world-map-final/prior-gameplay-source-audit-final.json`, confirms all98 prior gameplay runtime paths are unchanged, with535 evidence-provenance checks and3752 dependency comparisons and no issues. Its historical helper hash and earlier audit remain intact; no old fingerprints were relabelled as fresh browser runs.

All owned verification contexts and processes are closed at final handoff. Diagnostic failures remain available as evidence; they are not counted as passing final rows. The normal live preview remains available on port3000; the isolated map checks use an HMR-disabled port3001 server that is closed after verification. The final normal-preview report and screenshot are `qa-artifacts/gameplay-refinements/normal-preview-smoke.json` and `normal-preview-map.png`; evidence is written after browser closure to avoid an HMR reload during capture. The changed-file manifest is `qa-artifacts/gameplay-refinements/changed-file-manifest.json` (114 task paths, including 101 runtime paths); concurrent website/lesson work remains excluded and preserved.

All device checks are browser simulations, including standalone/A2HS flags; they do not claim testing on physically installed devices. The required top HUD → mission → playfield → tight response cluster → bottom HUD hierarchy was applied, and scenery ends above the shared bottom dock. The deliberate travelling racing camera and explicitly scoped Formula/venue compositions are the recorded exceptions. No external legacy assumptions were used.

## Exact changed-file list

This list covers the venue/wellbeing and five-tier refinement work relative to the recorded repository baseline `60aa048e`, including changes already committed in the shared workspace and the new interaction verifier. It does not reset or replace those commits. Earlier Number Stones/actor motion scope is separately recorded in `docs/MONSTER_MIND_MOTION_NOTES.md`.

- `docs/ENEMY_MINE_REFINEMENT_PROMPTS.json`
- `docs/GAMEPLAY_REFINEMENT_ART_PROMPTS.json`
- `docs/GAMEPLAY_REFINEMENT_NOTES.md`
- `docs/MONSTER_MIND_MOTION_NOTES.md`
- `docs/TEEN_ARCADE_NOTES.md`
- `docs/TEEN_ART_PROMPTS.json`
- `scripts/verify-angle-collision.mjs`
- `scripts/verify-five-tier-difficulty.mjs`
- `scripts/verify-gameplay-interactions.mjs`
- `scripts/verify-gameplay-refinements.mjs`
- `scripts/verify-legend-expanded-experience.mjs`
- `scripts/verify-legend-monster-motion.mjs`
- `scripts/verify-world-map-labels.mjs`
- `src/App.tsx`
- `src/app/AppRouter.tsx`
- `src/app/gameplaySessionContract.ts`
- `src/app/useScreenFlow.ts`
- `src/assets/enemies/cohesive/cyclops-slime.webp`
- `src/assets/enemies/cohesive/goblin.webp`
- `src/assets/enemies/cohesive/index.ts`
- `src/assets/enemies/cohesive/jelly.webp`
- `src/assets/enemies/cohesive/rhino.webp`
- `src/assets/enemies/cohesive/zombie.webp`
- `src/assets/maps/teen/monster-market-shop-wide.webp`
- `src/assets/maps/teen/monster-market-shop.webp`
- `src/assets/maps/teen/race-course-crowd.webp`
- `src/assets/maps/teen/racing-paddock.webp`
- `src/assets/maps/teen/restaurant-rush-wide.webp`
- `src/assets/maps/teen/restaurant-rush.webp`
- `src/assets/mine/ore/ore-cracked.webp`
- `src/assets/mine/ore/ore-intact.webp`
- `src/assets/mine/ore/ore-open.webp`
- `src/assets/mine/ore/ore-split.webp`
- `src/assets/wellbeing/scenes/breathing-bloom.webp`
- `src/assets/wellbeing/scenes/lantern-camp.webp`
- `src/assets/wellbeing/scenes/leaf-drift.webp`
- `src/assets/wellbeing/scenes/peaceful-pond.webp`
- `src/assets/wellbeing/scenes/star-path.webp`
- `src/assets/wellbeing/scenes/worry-balloon.webp`
- `src/components/BossPortrait.tsx`
- `src/components/FoodGameShell.tsx`
- `src/components/GameplaySceneBackdrop.tsx`
- `src/components/SceneEnvironment.tsx`
- `src/components/food-game-shell.css`
- `src/components/game-ui/GameUiKit.tsx`
- `src/components/game-ui/MonsterMindActor.tsx`
- `src/components/world-map/MapAtmosphere.tsx`
- `src/constants.ts`
- `src/design/legend-theme.css`
- `src/design/map-effects.css`
- `src/gameSceneMeta.ts`
- `src/games/AngleArenaGame.tsx`
- `src/games/AreaArchitectGame.tsx`
- `src/games/BossEncounterGame.tsx`
- `src/games/ChangeCounterGame.tsx`
- `src/games/ChronoDashGame.tsx`
- `src/games/ConversionCanyonGame.tsx`
- `src/games/DataDetectiveGame.tsx`
- `src/games/FactorFrenzyGame.tsx`
- `src/games/FormulaForgeGame.tsx`
- `src/games/FractionForgeGame.tsx`
- `src/games/FractionMatchGame.tsx`
- `src/games/GraphGrabberGame.tsx`
- `src/games/LavaPathGame.tsx`
- `src/games/LineGraphLabGame.tsx`
- `src/games/MathsVsZombiesGame.tsx`
- `src/games/MeanMachineGame.tsx`
- `src/games/MedianMountainGame.tsx`
- `src/games/MultiplicationMineGame.tsx`
- `src/games/NumberLineNinjaGame.tsx`
- `src/games/OrderOpsArenaGame.tsx`
- `src/games/PercentPowerGame.tsx`
- `src/games/PerimeterPathGame.tsx`
- `src/games/PlaceValuePanicGame.tsx`
- `src/games/PolygonPalaceGame.tsx`
- `src/games/PotionPanicGame.tsx`
- `src/games/PrimePopGame.tsx`
- `src/games/ProblemPyramidGame.tsx`
- `src/games/RatioRacerGame.tsx`
- `src/games/RemainderRunGame.tsx`
- `src/games/RotationStationGame.tsx`
- `src/games/RoundingRocketGame.tsx`
- `src/games/ScaleBuilderGame.tsx`
- `src/games/ShareSplitterGame.tsx`
- `src/games/SimplifySprintGame.tsx`
- `src/games/TakeOutRushGame.tsx`
- `src/games/TreasurePathGame.tsx`
- `src/games/angleArena/questions.ts`
- `src/games/game-refinements.css`
- `src/games/monster-market.css`
- `src/games/multiplication-mine.css`
- `src/games/place-value-panic.css`
- `src/games/ratioFractionsRace/ratio-racer.css`
- `src/games/take-out-rush.css`
- `src/screens/IslandLevels.tsx`
- `src/screens/ParentDashboard.tsx`
- `src/screens/WorldMap.tsx`
- `src/screens/parent-dashboard.css`
- `src/systems/content/gameDifficulty.ts`
- `src/systems/content/island1NumberBaseCamp.ts`
- `src/systems/progression/telemetry.ts`
- `src/wellbeing/WellbeingCompleteModal.tsx`
- `src/wellbeing/WellbeingHub.tsx`
- `src/wellbeing/WellbeingShell.tsx`
- `src/wellbeing/activities/BreathingBloom.tsx`
- `src/wellbeing/activities/CandleCalm.tsx`
- `src/wellbeing/activities/ConstellationConnect.tsx`
- `src/wellbeing/activities/LeafDrift.tsx`
- `src/wellbeing/activities/PeacefulPond.tsx`
- `src/wellbeing/activities/ThoughtSort.tsx`
- `src/wellbeing/data.ts`
- `src/wellbeing/scenes.ts`
- `src/wellbeing/useWellbeingCompletion.ts`
- `src/wellbeing/wellbeing.css`
